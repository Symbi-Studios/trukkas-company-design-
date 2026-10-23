import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { fleetApi } from '../fleet/fleetApi.js';
import { count, dateLabel, rows, safeUrl, text } from '../fleet/fleetContracts.js';
import { DRIVER_REQUIREMENTS, VEHICLE_REQUIREMENTS } from '../../../domain/documents.js';
import { directorVerificationView } from '../auth/onboardingApi.js';
import { companyDocumentTypes, companyDocumentView, companyLibraryView, documentCompanyView, documentCompliance, documentDateKey, documentDriverView, driverDocumentTypes, driverDocumentView, expiryDays, validDate, vehicleDocumentTypes, vehicleDocumentView } from './documentContracts.js';

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
    const blocked = signedIn(api); if (blocked) return blocked;
    const result = await baseQuery(args);
    return !api.signal.aborted && companyIdentity(api) === company ? result : changedSession();
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

async function driverDocuments(baseQuery, driver) {
  const result = await baseQuery(`/company/drivers/${encodeURIComponent(driver.id)}/documents`);
  if (result.error) return result;
  const source = unwrapApiResponseData(result.data);
  const documents = rows(source?.documents)?.map((entry) => driverDocumentView(entry, driver));
  if (!documents || !documents.every(Boolean) || new Set(documents.map((doc) => doc.id)).size !== documents.length) return unavailable('The API did not return valid driver documents.');
  // The driver's existing licence file is a separate, documented record. Keep
  // its View action without inventing a document ID or duplicating an upload.
  const licence = source.licence;
  const legacyLicence = !documents.some((doc) => doc.type === "Driver's License") && safeUrl(licence?.url)
    ? { id: null, ownerType: 'driver', ownerId: driver.id, driverName: driver.name, type: "Driver's License", name: "Driver's Licence",
      number: text(licence.number) ?? '—', url: safeUrl(licence.url), uploadedOn: '—', fileSize: '—', expiryDate: dateLabel(licence.expiresAt),
      status: ({ VALID: 'Valid', EXPIRING_SOON: 'Expiring Soon', EXPIRED: 'Expired' })[licence.expiryStatus] ?? '—',
      expiryKnown: licence.expiresAt === null || expiryDays(licence.expiresAt) !== null, expiryDays: expiryDays(licence.expiresAt) }
    : null;
  const checklistDocuments = legacyLicence ? [...documents, legacyLicence] : documents;
  const owner = licence === null ? { ...driver, licenseNumber: '—', licenseExpiry: '—' }
    : licence ? { ...driver, licenseNumber: text(licence.number) ?? '—', licenseExpiry: dateLabel(licence.expiresAt) } : driver;
  return { data: { driver: owner, documents, expiryDocuments: checklistDocuments,
    ...documentCompliance(DRIVER_REQUIREMENTS, checklistDocuments, Object.keys(driverDocumentTypes)) } };
}

async function ownedDriver(baseQuery, id) {
  if (!text(id)) return unavailable('Select a driver with a confirmed API ID.');
  const result = await baseQuery(`/company/drivers/${encodeURIComponent(id)}`);
  if (result.error) return result;
  const driver = documentDriverView(unwrapApiResponseData(result.data)?.driver);
  return driver?.id === id ? { data: driver } : unavailable('The API did not identify this company driver.');
}

async function driverLibrary(api, baseQuery) {
  const drivers = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    const result = await baseQuery({ url: '/company/drivers', params: { page, limit: 100 } });
    if (result.error) return result;
    const source = unwrapApiResponseData(result.data), entries = rows(source?.drivers), pagination = source?.pagination;
    if (!entries || pagination?.page !== page || count(pagination.total) === null || count(pagination.totalPages) === null) return unavailable('The API did not return valid driver pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if ((total > 0 && pages === 0) || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !entries.length)) return unavailable('The driver collection changed while loading. Reload Documents.');
    drivers.push(...entries.map(documentDriverView));
    if (drivers.some((driver) => !driver) || drivers.length > total) return unavailable('The API did not identify the company drivers.');
  }
  if (drivers.length !== total || new Set(drivers.map((driver) => driver.id)).size !== total) return unavailable('The API did not return the complete driver collection.');
  const library = [];
  for (let offset = 0; offset < drivers.length; offset += 4) {
    if (api.signal.aborted) return unavailable('The document request was cancelled.');
    const responses = await Promise.all(drivers.slice(offset, offset + 4).map((driver) => driverDocuments(baseQuery, driver)));
    for (const result of responses) { if (result.error) return result; library.push(result.data); }
  }
  return { data: library };
}

const validFile = (file) => typeof File !== 'undefined' && file instanceof File && file.size > 0 && file.size <= 10 * 1024 * 1024 && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type);

export const documentsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyDocuments', 'CompanyDrivers', 'CompanyFleet', 'AuthOnboardingDocuments', 'AuthDirectorVerification', 'CompanyDashboard', 'Profile'] }).injectEndpoints({
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
    getDocumentDrivers: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        return driverLibrary(api, companyQuery(api, baseQuery));
      },
      providesTags: ['CompanyDocuments', 'CompanyDrivers'],
    }),
    getDriverDocumentLibrary: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const driver = await ownedDriver(baseQuery, id);
        return driver.error ? driver : driverDocuments(baseQuery, driver.data);
      },
      providesTags: ['CompanyDocuments', 'CompanyDrivers'],
    }),
    getDocumentDetail: builder.query({
      async queryFn({ id, ownerType, ownerId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        if (!text(id)) return unavailable('This document has no API ID.');
        if (ownerType && !['company', 'vehicle', 'driver'].includes(ownerType)) return unavailable('This document owner type is not supported.');
        if (ownerType === 'company' && ownerId && ownerId !== companyId) return unavailable('This document does not belong to your company.');
        if (ownerType === 'driver') {
          const driver = await ownedDriver(baseQuery, ownerId);
          if (driver.error) return driver;
          const library = await driverDocuments(baseQuery, driver.data);
          return library.error ? library : { data: library.data.documents.find((doc) => doc.id === id) ?? null };
        }
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
      providesTags: ['CompanyDocuments', 'AuthOnboardingDocuments', 'CompanyFleet', 'CompanyDrivers'],
    }),
    uploadCompanyComplianceDocument: builder.mutation({
      async queryFn({ type, file, number, expiryDate, name }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const companyId = api.getState().auth.account.id;
        if (type === 'NIN' || type === 'BVN') {
          const key = type.toLowerCase();
          if (typeof number !== 'string' || !/^\d{11}$/.test(number)) return unavailable(`Enter the director’s 11-digit ${type}.`);
          const current = await baseQuery('/company/director/verification');
          if (current.error) return current;
          if (!['NOT_STARTED', 'REJECTED'].includes(unwrapApiResponseData(current.data)?.[key]?.status)) return unavailable('Only a new or rejected director identity number can be submitted. Reload Documents.');
          const result = await baseQuery({ url: '/company/director/verification', method: 'POST', body: { [key]: number } });
          if (result.error) return result;
          const verification = directorVerificationView(result.data);
          if (verification.error) return verification;
          const record = verification.data[key];
          // This is a submission receipt; director identity is not a file row
          // and the API does not issue a compliance-document ID for it.
          return record.status === 'PENDING_REVIEW' && record.masked.endsWith(number.slice(-4))
            ? { data: { name: text(name) ?? type } } : unavailable('The API did not confirm the director identity submission. Reload Documents before retrying.');
        }
        const wireType = Object.hasOwn(companyDocumentTypes, type) ? companyDocumentTypes[type] : null;
        if (!wireType) return unavailable('The company document API does not document this document type.');
        if (!validFile(file)) return unavailable('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.');
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
      invalidatesTags: ['CompanyDocuments', 'AuthOnboardingDocuments', 'AuthDirectorVerification', 'CompanyDashboard'],
    }),
    uploadDriverComplianceDocument: builder.mutation({
      async queryFn({ ownerId, type, file, number, expiryDate, name }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const wireType = Object.hasOwn(driverDocumentTypes, type) ? driverDocumentTypes[type] : null;
        if (!wireType) return unavailable(`The company driver API does not document ${type} submissions from this form.`);
        if (!validFile(file)) return unavailable('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.');
        if (expiryDate && !validDate(expiryDate)) return unavailable('Enter a valid expiry date.');
        const driver = await ownedDriver(baseQuery, ownerId);
        if (driver.error) return driver;
        const body = new FormData(); body.append('file', file); body.append('type', wireType);
        if (text(number)) body.append('number', number.trim());
        if (expiryDate) body.append('expiresAt', expiryDate);
        if (text(name)) body.append('name', name.trim());
        const result = await baseQuery({ url: `/company/drivers/${encodeURIComponent(ownerId)}/documents`, method: 'POST', body });
        if (result.error) return result;
        const source = unwrapApiResponseData(result.data)?.document;
        const saved = source?.type === wireType ? driverDocumentView(source, driver.data) : null;
        return saved?.url ? { data: saved } : unavailable('The API did not confirm the uploaded driver document. Reload Documents before retrying.');
      },
      invalidatesTags: ['CompanyDocuments', 'CompanyDrivers', 'CompanyDashboard'],
    }),
    renewComplianceDocument: builder.mutation({
      async queryFn({ id, ownerType, ownerId, expiryDate }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (ownerType === 'company') {
          if (!text(id) || ownerId !== api.getState().auth.account.id) return unavailable('Select a document belonging to your company.');
          if (!validDate(expiryDate) || expiryDays(expiryDate) <= 0) return unavailable('Enter a future expiry date.');
          baseQuery = companyQuery(api, baseQuery);
          const current = await baseQuery('/company-documents');
          if (current.error) return current;
          const original = rows(unwrapApiResponseData(current.data)?.documents)?.find((doc) => doc.id === id);
          if (!original || !['OPERATING_LICENCE', 'GOODS_IN_TRANSIT_INSURANCE', 'DIRECTOR_ID'].includes(original.type)) return unavailable('This company document does not support date-only renewal.');
          if (expiryDays(original.expiresAt) === null) return unavailable('Load the current document expiry before renewing it.');
          if (expiryDays(original.expiresAt) < 0) return unavailable('The company API requires a replacement file for an expired document. Upload the replacement from the company’s Documents screen.');
          const result = await baseQuery({ url: `/company-documents/${encodeURIComponent(id)}`, method: 'PATCH', body: { expiresAt: expiryDate } });
          if (result.error) return result;
          const source = unwrapApiResponseData(result.data)?.document;
          const saved = source?.id === id && source.type === original.type ? companyDocumentView(source, ownerId) : null;
          return saved?.url && documentDateKey(source.expiresAt) === expiryDate ? { data: saved }
            : unavailable('The API did not confirm the renewed company document. Reload Documents before retrying.');
        }
        if (ownerType === 'driver') {
          if (!text(id) || !text(ownerId)) return unavailable('Select a driver document with a confirmed API ID.');
          if (!validDate(expiryDate)) return unavailable('Enter a valid expiry date.');
          baseQuery = companyQuery(api, baseQuery);
          const driver = await ownedDriver(baseQuery, ownerId);
          if (driver.error) return driver;
          const current = await driverDocuments(baseQuery, driver.data);
          if (current.error) return current;
          const original = current.data.documents.find((doc) => doc.id === id);
          if (!original) return unavailable('This document does not belong to the selected driver. Reload Documents.');
          const result = await baseQuery({
            url: `/company/drivers/${encodeURIComponent(ownerId)}/documents/${encodeURIComponent(id)}`,
            method: 'PATCH', body: { expiresAt: expiryDate },
          });
          if (result.error) return result;
          const source = unwrapApiResponseData(result.data)?.document;
          const saved = source?.id === id ? driverDocumentView(source, driver.data) : null;
          if (!saved?.url || saved.type !== original.type || documentDateKey(source.expiresAt) !== expiryDate) {
            return unavailable('The API did not confirm the renewed driver document. Reload Documents before retrying.');
          }
          // Renewal receipts may omit file metadata. Read the current record
          // rather than replacing its name and upload details with empty values.
          const readback = await driverDocuments(baseQuery, driver.data);
          if (readback.error) return unavailable('The renewal was submitted, but confirmation could not be loaded. Reload Documents before retrying.');
          const confirmed = readback.data.documents.find((doc) => doc.id === id);
          return confirmed?.url && confirmed.type === original.type && confirmed.expiryDate === dateLabel(expiryDate)
            ? { data: confirmed } : unavailable('The API did not confirm the renewed driver document. Reload Documents before retrying.');
        }
        if (ownerType !== 'vehicle') return unavailable('Choose a company, vehicle or driver document.');
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
      invalidatesTags: ['CompanyDocuments', 'AuthOnboardingDocuments', 'CompanyFleet', 'CompanyDrivers', 'CompanyDashboard'],
    }),
  }),
});

export const { useGetCompanyDocumentLibraryQuery, useGetDocumentCompanyQuery, useGetDocumentVehiclesQuery, useGetDocumentDriversQuery, useGetDriverDocumentLibraryQuery, useGetDocumentDetailQuery, useUploadCompanyComplianceDocumentMutation, useUploadDriverComplianceDocumentMutation, useRenewComplianceDocumentMutation } = documentsApi;
