import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, object, text, tripCollectionView, tripStatusLabel, tripView } from './tripContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to manage company trips.');
const tripTags = ['CompanyTrips', 'AuthOnboardingSecurity'];

export const tripsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyTrips', 'CompanyTrip'] }).injectEndpoints({
  endpoints: (builder) => ({
    getCompanyTrips: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        // The existing tabs, search and filters operate on the whole collection.
        // Read every documented page so page-local rows never become fake totals.
        const collection = [];
        let total = null;
        let pages = 1;
        for (let page = 1; page <= pages; page += 1) {
          if (api.signal.aborted) return unavailable('The trip request was cancelled.');
          const result = await baseQuery({ url: '/company/trips', params: { page, limit: 100 } });
          if (result.error) return result;
          const data = unwrapApiResponseData(result.data);
          const trips = tripCollectionView(data);
          const pagination = data?.pagination;
          if (!trips || count(pagination?.total) === null || count(pagination?.totalPages) === null || pagination.page !== page) {
            return unavailable('The API did not return a valid company trip collection and pagination.');
          }
          if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
          if (pagination.total !== total || pagination.totalPages !== pages) return unavailable('The trip list changed while loading. Please reload it.');
          collection.push(...trips);
          if (collection.length > total || (page < pages && !trips.length)) return unavailable('The API returned incomplete trip pagination.');
        }
        if (collection.length !== total || new Set(collection.map((trip) => trip.id)).size !== total) return unavailable('The API did not return the complete company trip collection.');
        return { data: collection };
      },
      providesTags: ['CompanyTrips'],
    }),
    getCompanyTrip: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        if (!text(id)) return unavailable('This trip has no API ID.');
        const result = await baseQuery(`/company/trips/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        const source = object(data?.trip);
        if (!source || source.id !== id) return unavailable('The API did not identify the requested company trip.');
        const jobId = text(source.jobId) ?? id;
        const jobResult = await baseQuery(`/jobs/${encodeURIComponent(jobId)}`);
        if (jobResult.error) return jobResult;
        const job = unwrapApiResponseData(jobResult.data);
        if (job?.id !== jobId) return unavailable('The API did not return this trip’s job details.');
        return { data: tripView(source, job) };
      },
      providesTags: (_data, _error, id) => [{ type: 'CompanyTrip', id }],
    }),
    reportCompanyTripIssue: builder.mutation({
      async queryFn({ tripId, type, details }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const types = { Delay: 'DELAY', Breakdown: 'BREAKDOWN', Accident: 'OTHER', 'Cargo Damage': 'OTHER', 'Checkpoint / Security': 'OTHER', Documentation: 'OTHER', Other: 'OTHER' };
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        if (!trip) return unavailable('Load the company trip before reporting an issue.');
        if (!Object.hasOwn(types, type) || !text(details) || details.length > 500) return unavailable('Choose an issue type and enter up to 500 characters.');
        const body = new FormData();
        body.append('type', types[type]);
        body.append('description', types[type] === 'OTHER' && type !== 'Other' ? `${type}: ${details.trim()}` : details.trim());
        const result = await baseQuery({ url: `/jobs/${encodeURIComponent(trip.jobId)}/trip-updates`, method: 'POST', body });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.tripUpdate;
        return text(saved?.id) && saved.type === types[type] ? { data: { id: saved.id } } : unavailable('The API did not confirm the issue report. Check the trip before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    updateCompanyTripStatus: builder.mutation({
      async queryFn({ tripId, status }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        if (!trip) return unavailable('Load the company trip before updating its status.');
        if (status === 'Cancelled') return unavailable('Company trip cancellation is currently unavailable. Contact support.');
        let path;
        let body;
        let expected;
        if (['Picked Up', 'In Transit'].includes(status) && trip.wireStatus === 'DRIVER_ARRIVED') {
          path = 'in-transit'; body = new FormData(); expected = 'IN_TRANSIT';
        } else if (status === 'At Destination' && trip.wireStatus === 'IN_TRANSIT') {
          if (!trip.liveCoordinates) return unavailable('A current GPS position from the truck is required to confirm arrival.');
          path = 'cargo-arrived'; body = { latitude: trip.liveCoordinates[0], longitude: trip.liveCoordinates[1] }; expected = 'CARGO_ARRIVED';
        } else if (status === 'Completed' && ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'PICKUP_COMPLETED', 'IN_TRANSIT'].includes(trip.wireStatus)) {
          path = 'complete'; expected = 'COMPLETED';
        } else return unavailable('The API does not support that status change from this trip’s current stage.');
        const result = await baseQuery({ url: `/jobs/${encodeURIComponent(trip.jobId)}/${path}`, method: 'POST', ...(body ? { body } : {}) });
        if (result.error) return result;
        const job = unwrapApiResponseData(result.data)?.job;
        return job?.id === trip.jobId && job.status === expected ? { data: { status: tripStatusLabel(expected) } } : unavailable('The API did not confirm the trip status change. Reload the trip before trying again.');
      },
      // A status write can move funds. Never retry it automatically or infer success.
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    contactCompanyTripSupport: builder.mutation({
      async queryFn({ tripId, message }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        if (!trip || !text(message) || message.length > 500) return unavailable('Enter a support message of 500 characters or fewer.');
        const result = await baseQuery({ url: '/support/threads', method: 'POST', body: {
          subject: `Trip ${trip.number === '—' ? trip.id : trip.number}`, category: 'GENERAL', message: `Trip ID: ${trip.id}\nJob ID: ${trip.jobId}\n\n${message.trim()}`,
        } });
        if (result.error) return result;
        const thread = unwrapApiResponseData(result.data)?.thread;
        return text(thread?.id) ? { data: { id: thread.id } } : unavailable('The API did not confirm the support request. Check your support threads before trying again.');
      },
    }),
  }),
});

export const {
  useGetCompanyTripsQuery, useGetCompanyTripQuery, useReportCompanyTripIssueMutation,
  useUpdateCompanyTripStatusMutation, useContactCompanyTripSupportMutation,
} = tripsApi;
