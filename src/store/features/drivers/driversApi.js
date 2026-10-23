import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { companyDriverDetailView, companyDriverView, count, driverReviewsView, driverTripView, driverSummaryView, rows, text } from './driverContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const phoneKey = (value) => {
  const digits = text(value)?.replace(/\D/g, '');
  return digits && /^0\d{10}$/.test(digits) ? '234' + digits.slice(1) : digits;
};
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
        const result = await allPages(baseQuery, api, '/company/drivers', 'drivers');
        if (result.error) return result;
        const drivers = result.data.map(companyDriverView);
        return drivers.every(Boolean) ? { data: drivers } : unavailable('The API did not identify the company drivers.');
      },
      providesTags: ['CompanyDrivers', 'CompanyFleet'],
    }),
    getCompanyDriverSummary: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await companyQuery(api, baseQuery)({ url: '/company/drivers', params: { page: 1, limit: 1 } });
        return result.error ? result : { data: driverSummaryView(unwrapApiResponseData(result.data)?.summary) };
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
    setCompanyDriverAvailability: builder.mutation({
      async queryFn({ id, availability }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id) || !['AVAILABLE', 'OFF_DUTY'].includes(availability)) return unavailable('Choose a driver and a supported duty status.');
        baseQuery = companyQuery(api, baseQuery);
        const owned = await baseQuery('/company/drivers/' + encodeURIComponent(id));
        if (owned.error) return owned;
        if (unwrapApiResponseData(owned.data)?.driver?.id !== id) return unavailable('The API did not identify your company driver.');
        const result = await baseQuery({ url: '/company/drivers/' + encodeURIComponent(id) + '/availability', method: 'PATCH', body: { availability } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        return saved?.driverId === id && saved.availability === availability ? { data: { id } }
          : unavailable('The API did not confirm the driver availability. Reload Drivers before retrying.');
      },
      invalidatesTags: ['CompanyDrivers', 'CompanyFleet', 'CompanyDashboard'],
    }),
    addCompanyDriver: builder.mutation({
      async queryFn({ name, email, phone, licenseNumber }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const fullName = text(name), contact = text(email), telephone = text(phone)?.replace(/[\s-]/g, '');
        if (!fullName || !contact || !/^\S+@\S+\.\S+$/.test(contact) || !telephone || !/^\+?\d{10,15}$/.test(telephone)) {
          return unavailable('Enter the driver’s full name, phone and email. Email is required to send their account invite.');
        }
        baseQuery = companyQuery(api, baseQuery);
        const result = await baseQuery({ url: '/company/drivers', method: 'POST', body: {
          name: fullName, phone: telephone, email: contact, ...(text(licenseNumber) ? { licenseNumber: licenseNumber.trim() } : {}),
        } });
        if (result.error) return result;
        const source = unwrapApiResponseData(result.data), driver = source?.driver;
        return text(driver?.id) && text(driver.email)?.toLowerCase() === contact.toLowerCase() && phoneKey(driver.phone) === phoneKey(telephone)
          && driver.status === 'ACTIVE' && (!text(licenseNumber) || driver.licenseNumber === licenseNumber.trim()) && typeof source.invite?.expiresAt === 'string' && Number.isFinite(Date.parse(source.invite.expiresAt))
          ? { data: { id: driver.id } } : unavailable('The API did not confirm the driver and invite. Check Drivers before retrying.');
      },
      invalidatesTags: ['CompanyDrivers', 'CompanyFleet', 'CompanyDashboard'],
    }),
  }),
});

export const { useGetCompanyDriversQuery, useGetCompanyDriverSummaryQuery, useGetCompanyDriverQuery, useGetDriverTripsQuery, useGetDriverReviewsQuery, useAddCompanyDriverMutation, useSetCompanyDriverAvailabilityMutation } = driversApi;
