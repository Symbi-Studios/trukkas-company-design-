import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { fleetApi } from '../fleet/fleetApi.js';
import { rows, text } from '../fleet/fleetContracts.js';
import { VEHICLE_REQUIREMENTS } from '../../../domain/documents.js';
import { companyDocumentTypes, companyDocumentView, companyLibraryView, documentCompanyView, documentCompliance, validDate, vehicleDocumentTypes, vehicleDocumentView } from './documentContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.apiRole === 'TRUCKER' && account.truckerType === 'COMPANY' ? null : unavailable('Sign in to manage company documents.');
};
const companyIdentity = (api) => {
  const { account, activeCompanyId } = api.getState().auth;
  return JSON.stringify([account?.id, account?.actualUserId, activeCompanyId]);
};
const changedSession = () => unavailable('Your company session changed. Reload Documents.');
function companyQuery(api, baseQuery) {
  const company = companyIdentity(api);
  return async (args) => {
    if (companyIdentity(api) !== company) return changedSession();
    if (api.signal.aborted) return unavailable('The document request was cancelled.');
    const result = await baseQuery(args);
    return companyIdentity(api) === company ? result : changedSession();
  };
}
async function ownedTrucks(api) {
  const company = companyIdentity(api);
  const request = api.dispatch(fleetApi.endpoints.getFleet.initiate(undefined, { subscribe: false, forceRefetch: true }));
  try {
    const data = await request.unwrap();
    return companyIdentity(api) === company ? { data } : changedSession();
  }
  catch (error) { return { error }; }
  finally { request.unsubscribe(); }
}
async function vehicleDocuments(baseQuery, truck) {
  const result = await baseQuery(`/company/fleet/${encodeURIComponent(truck.id)}/documents`);
  if (result.error) return result;
  const documents = rows(unwrapApiResponseData(result.data)?.documents)?.map((entry) => vehicleDocumentView(entry, truck));
  return documents && documents.every(Boolean) && new Set(documents.map((doc) => doc.id)).size === documents.length
    ? { data: documents } : unavailable('The API did not return valid vehicle documents.');
}
async function vehicleLibrary(api, baseQuery) {
  const fleet = await ownedTrucks(api);
  if (fleet.error) return fleet;
  const result = [];
  for (let offset = 0; offset < fleet.data.length; offset += 4) {
    if (api.signal.aborted) return unavailable('The document request was cancelled.');
    const batch = fleet.data.slice(offset, offset + 4);
    const responses = await Promise.all(batch.map((truck) => vehicleDocuments(baseQuery, truck)));
    for (let index = 0; index < responses.length; index += 1) {
      if (responses[index].error) return responses[index];
      const docs = responses[index].data;
      result.push({ truck: batch[index], documents: docs, ...documentCompliance(VEHICLE_REQUIREMENTS, docs, Object.keys(vehicleDocumentTypes)) });
    }
  }
  return { data: result };
}

export const documentsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyDocuments', 'CompanyFleet', 'AuthOnboardingDocuments', 'CompanyDashboard', 'Profile'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getCompanyDocumentLibrary: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        const result = await baseQuery('/company-documents');
        if (result.error) return result;
        if (api.getState().auth.account?.id !== companyId) return unavailable('Your company session changed. Reload Documents.');
        const view = companyLibraryView(unwrapApiResponseData(result.data), companyId);
        return view ? { data: view } : unavailable('The API did not return valid company documents.');
      },
      providesTags: ['CompanyDocuments', 'AuthOnboardingDocuments'],
    }),
    getDocumentCompany: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        const result = await baseQuery('/profile');
        if (result.error) return result;
        const user = unwrapApiResponseData(result.data)?.user;
        return api.getState().auth.account?.id === companyId && user?.id === companyId && user.role === 'TRUCKER' && user.truckerType === 'COMPANY'
          ? { data: documentCompanyView(user) } : unavailable('The API did not identify your company.');
      },
      providesTags: ['CompanyDocuments', 'Profile'],
    }),
    getDocumentVehicles: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        return vehicleLibrary(api, baseQuery);
      },
      providesTags: ['CompanyDocuments', 'CompanyFleet'],
    }),
    getDocumentDetail: builder.query({
      async queryFn({ id, ownerType, ownerId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        if (!text(id)) return unavailable('This document has no API ID.');
        if (ownerType && !['company', 'vehicle', 'driver'].includes(ownerType)) return unavailable('This document owner type is not supported.');
        if (ownerType === 'company' && ownerId && ownerId !== companyId) return unavailable('This document does not belong to your company.');
        if (ownerType === 'driver') return unavailable('Company access to driver document details is not documented by the API.');
        if (!ownerType || ownerType === 'company') {
          const result = await baseQuery('/company-documents');
          if (result.error) return result;
          if (api.getState().auth.account?.id !== companyId) return unavailable('Your company session changed. Reload Documents.');
          const library = companyLibraryView(unwrapApiResponseData(result.data), companyId);
          if (!library) return unavailable('The API did not return valid company documents.');
          const doc = library.documents.find((item) => item.id === id);
          if (doc) return { data: doc };
          if (ownerType === 'company') return { data: null };
        }
        const fleet = await ownedTrucks(api);
        if (fleet.error) return fleet;
        const trucks = ownerType === 'vehicle' ? fleet.data.filter((truck) => truck.id === ownerId) : fleet.data;
        for (const truck of trucks) {
          if (api.signal.aborted) return unavailable('The document request was cancelled.');
          const result = await vehicleDocuments(baseQuery, truck);
          if (result.error) return result;
          const doc = result.data.find((item) => item.id === id);
          if (doc) return { data: doc };
        }
        return { data: null };
      },
      providesTags: ['CompanyDocuments', 'AuthOnboardingDocuments', 'CompanyFleet'],
    }),
    uploadCompanyComplianceDocument: builder.mutation({
      async queryFn({ type, file, number, expiryDate }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        const wireType = Object.hasOwn(companyDocumentTypes, type) ? companyDocumentTypes[type] : null;
        if (!wireType) return unavailable('A separate director NIN/BVN submission is not supported by the company document API.');
        if (!(typeof File !== 'undefined' && file instanceof File) || file.size <= 0 || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return unavailable('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.');
        if (['GOODS_IN_TRANSIT_INSURANCE', 'OPERATING_LICENCE', 'DIRECTOR_ID'].includes(wireType) && !validDate(expiryDate) || expiryDate && !validDate(expiryDate)) return unavailable('Enter a valid expiry date.');
        const body = new FormData(); body.append('file', file); body.append('type', wireType);
        if (text(number)) body.append('documentNumber', number.trim());
        if (expiryDate) body.append('expiresAt', expiryDate);
        const result = await baseQuery({ url: '/company-documents', method: 'POST', body });
        if (result.error) return result;
        if (api.getState().auth.account?.id !== companyId) return unavailable('Your company session changed. Reload Documents.');
        const source = unwrapApiResponseData(result.data)?.document;
        const doc = source?.type === wireType ? companyDocumentView(source, companyId) : null;
        return doc && doc.url ? { data: doc } : unavailable('The API did not confirm the uploaded document. Reload Documents before trying again.');
      },
      invalidatesTags: ['CompanyDocuments', 'AuthOnboardingDocuments', 'CompanyDashboard'],
    }),
    renewComplianceDocument: builder.mutation({
      async queryFn({ id, ownerType, ownerId, expiryDate }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (ownerType === 'company') return unavailable('The company API requires a replacement file to renew this document. Upload the replacement from the company’s Documents screen.');
        if (ownerType !== 'vehicle') return unavailable('Company access to driver document renewal is not documented by the API.');
        if (!text(id) || !text(ownerId)) return unavailable('Select a vehicle document with a confirmed API ID.');
        if (!validDate(expiryDate)) return unavailable('Enter a valid expiry date.');
        baseQuery = companyQuery(api, baseQuery);
        const fleet = await ownedTrucks(api);
        if (fleet.error) return fleet;
        const truck = fleet.data.find((entry) => entry.id === ownerId);
        if (!truck) return unavailable('This vehicle does not belong to your company.');
        const current = await vehicleDocuments(baseQuery, truck);
        if (current.error) return current;
        const original = current.data.find((entry) => entry.id === id);
        if (!original) return unavailable('This document does not belong to the selected vehicle. Reload Documents.');
        const result = await baseQuery({
          url: `/company/fleet/${encodeURIComponent(ownerId)}/documents/${encodeURIComponent(id)}`,
          method: 'PATCH', body: { expiryDate },
        });
        if (result.error) return result;
        const source = unwrapApiResponseData(result.data)?.document;
        const saved = source?.id === id ? vehicleDocumentView(source, truck) : null;
        return saved && saved.type === original.type && saved.url && source.expiryDate === expiryDate
          ? { data: saved } : unavailable('The API did not confirm the renewed document. Reload Documents before trying again.');
      },
      invalidatesTags: ['CompanyDocuments', 'CompanyFleet', 'CompanyDashboard'],
    }),
  }),
});

export const { useGetCompanyDocumentLibraryQuery, useGetDocumentCompanyQuery, useGetDocumentVehiclesQuery, useGetDocumentDetailQuery, useUploadCompanyComplianceDocumentMutation, useRenewComplianceDocumentMutation } = documentsApi;
