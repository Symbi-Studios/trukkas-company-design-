import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { companyDriverDetailView, companyDriverView, count, driverReviewsView, driverTripView, rows, text } from './driverContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.apiRole === 'TRUCKER' && account?.truckerType === 'COMPANY' ? null : unavailable('Sign in to manage your company’s drivers.');
};
function companyQuery(api, baseQuery) {
  const identity = () => {
    const { account, activeCompanyId } = api.getState().auth;
    return JSON.stringify([account?.id, account?.actualUserId, activeCompanyId]);
  };
  const company = identity();
  return async (args) => {
    if (identity() !== company) return unavailable('Your company session changed. Reload Drivers.');
    const result = await baseQuery(args);
    return identity() === company ? result : unavailable('Your company session changed. Reload Drivers.');
  };
}

async function allPages(baseQuery, api, url, key, params) {
  const collection = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The driver request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, limit: 100 } });
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.[key]), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination?.total) === null || count(pagination?.totalPages) === null) return unavailable('The API did not return a valid driver collection and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if (pages > 500 || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The records changed while loading. Please reload.');
    collection.push(...items);
    if (collection.length > total) return unavailable('The API returned invalid pagination.');
  }
  if (collection.length !== total || collection.some((item) => !text(item.id)) || new Set(collection.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete collection.');
  return { data: collection };
}

export const driversApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyDrivers', 'CompanyFleet', 'CompanyTrips'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getCompanyDrivers: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const result = await baseQuery('/dashboard/drivers');
        if (result.error) return result;
        const members = rows(unwrapApiResponseData(result.data)?.drivers);
        if (members?.some((member) => text(member.companyId) && member.companyId !== api.getState().auth.account?.id)) return unavailable('The API returned drivers outside your company.');
        const drivers = members?.map(companyDriverView);
        if (!drivers || drivers.some((driver) => !driver) || new Set(drivers.map((driver) => driver.id)).size !== drivers.length) return unavailable('The API did not identify the company’s drivers.');
        const profiles = [];
        for (let offset = 0; offset < drivers.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The driver request was cancelled.');
          const loaded = await Promise.all(drivers.slice(offset, offset + 4).map(async (member) => {
            const detail = await baseQuery(`/company/drivers/${encodeURIComponent(member.id)}`);
            if (detail.error) return detail.error.status === 'CUSTOM_ERROR' ? detail : { data: member };
            const driver = companyDriverDetailView(unwrapApiResponseData(detail.data)?.driver);
            return driver?.id === member.id ? { data: driver } : unavailable('The API did not identify this company driver.');
          }));
          for (const item of loaded) { if (item.error) return item; profiles.push(item.data); }
        }
        return { data: profiles };
      },
      providesTags: ['CompanyDrivers', 'CompanyFleet'],
    }),
    getCompanyDriver: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This driver has no API ID.');
        baseQuery = companyQuery(api, baseQuery);
        const result = await baseQuery(`/company/drivers/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const driver = companyDriverDetailView(unwrapApiResponseData(result.data)?.driver);
        return driver?.id === id ? { data: driver } : unavailable('The API did not identify this company driver.');
      },
      providesTags: ['CompanyDrivers', 'CompanyFleet'],
    }),
    getDriverTrips: builder.query({
      async queryFn(driverId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(driverId)) return unavailable('This driver has no API ID.');
        const result = await allPages(baseQuery, api, '/company/trips', 'trips', { driverId });
        if (result.error) return result;
        const trips = [];
        for (let offset = 0; offset < result.data.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The driver request was cancelled.');
          const loaded = await Promise.all(result.data.slice(offset, offset + 4).map(async (row) => {
            const response = await baseQuery(`/company/trips/${encodeURIComponent(row.id)}`);
            if (response.error) return response;
            const source = unwrapApiResponseData(response.data)?.trip;
            if (source?.id !== row.id || source.driver?.id !== driverId) return unavailable('The API returned a trip for another driver.');
            const trip = driverTripView(source, true);
            return trip ? { data: trip } : unavailable('The API did not return valid driver trips.');
          }));
          for (const item of loaded) { if (item.error) return item; trips.push(item.data); }
        }
        return { data: trips };
      },
      providesTags: ['CompanyDrivers', 'CompanyTrips', 'CompanyFleet'],
    }),
    getDriverReviews: builder.query({
      async queryFn(driverId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(driverId)) return unavailable('This driver has no API ID.');
        const result = await allPages(baseQuery, api, '/company/reviews', 'reviews', { driverId, sort: 'newest' });
        if (result.error) return result;
        if (result.data.some((review) => review.reviewed?.type === 'COMPANY' || text(review.reviewed?.id) && review.reviewed.id !== driverId || text(review.driver?.id) && review.driver.id !== driverId)) return unavailable('The API returned reviews outside this driver.');
        return { data: driverReviewsView(result.data) };
      },
      providesTags: ['CompanyDrivers'],
    }),
    addCompanyDriver: builder.mutation({
      async queryFn(_draft, api) {
        const blocked = signedIn(api); if (blocked) return blocked;
        return unavailable('The company invite API requires an existing driver’s email and a truck ID. Adding a driver with name, phone and licence number is not supported by the documented company API.');
      },
    }),
  }),
});

export const { useGetCompanyDriversQuery, useGetCompanyDriverQuery, useGetDriverTripsQuery, useGetDriverReviewsQuery, useAddCompanyDriverMutation } = driversApi;
