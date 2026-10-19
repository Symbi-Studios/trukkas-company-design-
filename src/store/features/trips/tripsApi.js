import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, object, text, tripCollectionView, tripCostCategoryToWire, tripMessageViews, tripStatusLabel, tripView } from './tripContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const numberIs = (value, expected) => typeof value === 'number' && Number.isFinite(value) && value === expected;
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to manage company trips.');
const tripTags = ['CompanyTrips', 'AuthOnboardingSecurity'];

export const tripsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyTrips', 'CompanyTrip', 'CompanyTripMessages'] }).injectEndpoints({
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
        if (job?.id !== jobId) return unavailable('The API did not return this trip’s related job details.');
        const trip = tripView(source, true, job);
        return trip ? { data: trip } : unavailable('The API did not return usable company trip details.');
      },
      providesTags: (_data, _error, id) => [{ type: 'CompanyTrip', id }],
    }),
    getCompanyTripMessages: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        if (!text(id)) return unavailable('This trip has no API ID.');
        const trip = tripsApi.endpoints.getCompanyTrip.select(id)(api.getState()).data;
        if (!trip) return unavailable('Load the company trip before loading its messages.');
        const messages = [];
        let total = null;
        let pages = 1;
        for (let page = 1; page <= pages; page += 1) {
          if (api.signal.aborted) return unavailable('The trip message request was cancelled.');
          const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(id)}/messages`, params: { page, limit: 100 } });
          if (result.error) return result;
          const data = unwrapApiResponseData(result.data);
          const collection = Array.isArray(data?.messages) && data.messages.every((message) => object(message)) ? data.messages : null;
          const pagination = data?.pagination;
          if (!collection || count(pagination?.page) !== page || count(pagination?.total) === null || count(pagination?.totalPages) === null) {
            return unavailable('The API did not return valid trip messages and pagination.');
          }
          if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
          if (pagination.total !== total || pagination.totalPages !== pages) return unavailable('The trip conversation changed while loading. Please reload it.');
          messages.push(...collection);
          if (messages.length > total || (page < pages && !collection.length)) return unavailable('The API returned incomplete trip message pagination.');
        }
        if (messages.length !== total) return unavailable('The API did not return the complete trip conversation.');
        const view = tripMessageViews(messages, trip.driverId, trip.driverName);
        return view ? { data: view } : unavailable('The API did not return a valid trip conversation.');
      },
      providesTags: (_data, _error, id) => [{ type: 'CompanyTripMessages', id }],
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
    addCompanyTripNote: builder.mutation({
      async queryFn({ tripId, body }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const noteBody = text(body);
        if (!trip || !noteBody || noteBody.length > 2000) return unavailable('Enter a trip note of 2,000 characters or fewer.');
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/notes`, method: 'POST', body: { body: noteBody } });
        if (result.error) return result;
        const note = unwrapApiResponseData(result.data)?.note;
        return text(note?.id) && text(note?.body) ? { data: note } : unavailable('The API did not confirm the trip note. Check the trip before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    addCompanyTripCost: builder.mutation({
      async queryFn({ tripId, category, amount, description }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const wireCategory = tripCostCategoryToWire(category);
        if (!trip || !wireCategory || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return unavailable('Choose a trip cost category and enter an amount greater than zero.');
        const body = { category: wireCategory, amount, currency: 'NGN' };
        if (text(description)) body.description = text(description);
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/costs`, method: 'POST', body });
        if (result.error) return result;
        const cost = unwrapApiResponseData(result.data)?.cost;
        return text(cost?.id) && cost.category === wireCategory && numberIs(cost.amount, amount)
          ? { data: cost }
          : unavailable('The API did not confirm the trip cost. Check the trip before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    uploadCompanyTripDocument: builder.mutation({
      async queryFn({ tripId, file, name }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
        if (!trip || typeof File === 'undefined' || !(file instanceof File) || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
          return unavailable('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.');
        }
        const body = new FormData();
        body.append('file', file);
        if (text(name)) body.append('name', text(name));
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/documents`, method: 'POST', body });
        if (result.error) return result;
        const document = unwrapApiResponseData(result.data)?.document;
        return text(document?.id) && text(document?.url) && document.status === 'UPLOADED'
          ? { data: document }
          : unavailable('The API did not confirm the trip document upload. Check the trip before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    updateCompanyTripLocation: builder.mutation({
      async queryFn({ tripId, location }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const place = text(location);
        if (trip?.phase !== 'Active' || !place || place.length > 200) return unavailable('Enter a place name of 200 characters or fewer for an active trip.');
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/location`, method: 'PATCH', body: { location: place } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        return saved?.location === place && text(saved.updatedAt)
          ? { data: saved }
          : unavailable('The API did not confirm the trip location update. Reload the trip before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [...tripTags, { type: 'CompanyTrip', id: tripId }],
    }),
    requestCompanyTripCancellation: builder.mutation({
      async queryFn({ tripId, reason }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const cancellationReason = text(reason);
        if (!trip?.open || !cancellationReason) return unavailable('Enter a reason for requesting trip cancellation.');
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/cancel`, method: 'POST', body: { reason: cancellationReason } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        if (saved?.tripId !== tripId || saved.status !== trip.wireStatus || saved.cancellationRequested !== true) {
          return unavailable('The API did not confirm the cancellation request. Check the trip before trying again.');
        }
        api.dispatch(tripsApi.util.updateQueryData('getCompanyTrip', tripId, (draft) => { draft.cancellationRequested = true; }));
        return { data: { message: text(saved.message) ?? 'Cancellation request sent to support. The trip stays active until support confirms.' } };
      },
    }),
    sendCompanyTripMessage: builder.mutation({
      async queryFn({ tripId, content }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        const message = text(content);
        if (!trip || !message || message.length > 500) return unavailable('Enter a message of 500 characters or fewer.');
        if (trip.driverAssigned === false) return unavailable('Assign a driver before messaging about this trip.');
        const result = await baseQuery({ url: `/company/trips/${encodeURIComponent(tripId)}/messages`, method: 'POST', body: { content: message } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        return text(saved?.id) && text(saved?.content) === message
          ? { data: saved }
          : unavailable('The API did not confirm the trip message. Check the conversation before trying again.');
      },
      invalidatesTags: (_data, error, { tripId }) => error ? [] : [{ type: 'CompanyTripMessages', id: tripId }],
    }),
    updateCompanyTripStatus: builder.mutation({
      async queryFn({ tripId, status }, api, _options, baseQuery) {
        const blocked = signedIn(api);
        if (blocked) return blocked;
        const trip = tripsApi.endpoints.getCompanyTrip.select(tripId)(api.getState()).data;
        if (!trip) return unavailable('Load the company trip before updating its status.');
        if (status === 'Cancelled') return unavailable('Request trip cancellation with a reason so support can review it.');
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
        } else if (status === 'Completed' && ['CARGO_ARRIVED', 'DEMURRAGE_IN_PROGRESS', 'OFFLOADING', 'OFFLOAD_COMPLETED', 'CONTAINER_RETURNED'].includes(trip.wireStatus)) {
          return unavailable('After arrival, the driver must submit proof of delivery, finish offloading and return the container. The forwarder then confirms completion.');
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
  useGetCompanyTripsQuery, useGetCompanyTripQuery, useGetCompanyTripMessagesQuery, useReportCompanyTripIssueMutation,
  useAddCompanyTripNoteMutation, useAddCompanyTripCostMutation, useUploadCompanyTripDocumentMutation,
  useUpdateCompanyTripLocationMutation, useRequestCompanyTripCancellationMutation, useSendCompanyTripMessageMutation,
  useUpdateCompanyTripStatusMutation, useContactCompanyTripSupportMutation,
} = tripsApi;
