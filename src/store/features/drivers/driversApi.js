import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { companyDriverView, count, driverReviewsView, driverTripView, rows, text } from './driverContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to manage your company’s drivers.');

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
    if (pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The records changed while loading. Please reload.');
    collection.push(...items);
    if (collection.length > total) return unavailable('The API returned invalid pagination.');
  }
  if (collection.length !== total || collection.some((item) => !text(item.id)) || new Set(collection.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete collection.');
  return { data: collection };
}

export const driversApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyDrivers', 'CompanyFleet', 'CompanyTrips'] }).injectEndpoints({
  endpoints: (builder) => ({
    getCompanyDrivers: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery('/dashboard/drivers');
        if (result.error) return result;
        const drivers = rows(unwrapApiResponseData(result.data)?.drivers)?.map(companyDriverView);
        if (!drivers || drivers.some((driver) => !driver) || new Set(drivers.map((driver) => driver.id)).size !== drivers.length) return unavailable('The API did not identify the company’s drivers.');
        return { data: drivers };
      },
      providesTags: ['CompanyDrivers', 'CompanyFleet'],
    }),
    getDriverTrips: builder.query({
      async queryFn(driverId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(driverId)) return unavailable('This driver has no API ID.');
        const result = await allPages(baseQuery, api, '/company/trips', 'trips', { driverId });
        if (result.error) return result;
        const trips = result.data.map(driverTripView);
        return trips.every(Boolean) ? { data: trips } : unavailable('The API did not return valid driver trips.');
      },
      providesTags: ['CompanyDrivers', 'CompanyTrips', 'CompanyFleet'],
    }),
    getDriverReviews: builder.query({
      async queryFn(driverId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(driverId)) return unavailable('This driver has no API ID.');
        const result = await allPages(baseQuery, api, '/company/reviews', 'reviews', { driverId, sort: 'newest' });
        if (result.error) return result;
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

export const { useGetCompanyDriversQuery, useGetDriverTripsQuery, useGetDriverReviewsQuery, useAddCompanyDriverMutation } = driversApi;
