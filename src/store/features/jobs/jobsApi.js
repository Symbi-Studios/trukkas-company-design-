import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const jobTypes = { PORT_TO_DESTINATION: 'Port-to-Destination', PORT_TO_PORT: 'Port-to-Port', BULK_BREAK: 'Break-bulk', EXPORT: 'Export' };
const statuses = {
  DOCUMENTS_VALIDATED: 'Pending', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  DRIVER_ASSIGNED: 'In Progress', DRIVER_EN_ROUTE: 'In Progress', DRIVER_ARRIVED: 'In Progress',
  PICKUP_COMPLETED: 'In Progress', IN_TRANSIT: 'In Progress', CARGO_ARRIVED: 'In Progress',
  OFFLOADING: 'In Progress', OFFLOAD_COMPLETED: 'In Progress', CONTAINER_RETURNED: 'In Progress',
};
const label = (value, labels) => typeof value === 'string' && Object.hasOwn(labels, value) ? labels[value] : '—';
const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const coordinates = (place) => typeof place?.latitude === 'number' && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90
  && typeof place?.longitude === 'number' && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180
  ? [place.latitude, place.longitude] : null;

function jobView(value) {
  const job = object(value);
  if (!text(job?.id)) return null;
  const forwarder = object(job.forwarder);
  const name = text(forwarder?.businessName) ?? [text(forwarder?.firstName), text(forwarder?.lastName)].filter(Boolean).join(' ');
  return {
    apiBacked: true, id: job.id, number: text(job.jobNumber) ?? '—',
    // Do not fill undocumented detail fields from fixtures, related companies,
    // fare estimates, or the prototype's assumed per-truck fee model.
    title: text(job.cargoDescription) ?? '—', cargoDescription: text(job.cargoDescription) ?? '—',
    jobType: label(job.movementType, jobTypes), status: label(job.status, statuses),
    origin: text(job.route?.origin?.address) ?? '—', destination: text(job.route?.destination?.address) ?? '—',
    routeCoordinates: { origin: coordinates(job.route?.origin), destination: coordinates(job.route?.destination) },
    category: '—', cargoType: '—', equipment: '—', quantity: '—', weightKg: null,
    pickupDate: '—', deliveryDate: '—', tripType: '—', insurance: '—', paymentTerms: '—',
    cargoValue: null, budget: null, trucksRequired: null, negotiable: null,
    postedOn: '—', postedAgo: null, closesInDays: null,
    distanceKm: number(job.feeBreakdown?.recommendedFare?.distanceKm),
    requirements: null, specialNotes: null, documents: null, myBid: null,
    contactId: text(forwarder?.id),
    poster: { id: text(forwarder?.id), name: name || '—', verified: null, rating: null, jobsPosted: null },
  };
}

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobDetail: builder.query({
      async queryFn(id, _api, _options, baseQuery) {
        if (!text(id)) return unavailable('This job has no API ID.');
        const result = await baseQuery(`/jobs/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const job = jobView(unwrapApiResponseData(result.data));
        return job?.id === id ? { data: job } : unavailable('The API did not return the requested job.');
      },
    }),
    sendJobMessage: builder.mutation({
      async queryFn({ jobId, receiverId, content, apiBacked }, _api, _options, baseQuery) {
        if (apiBacked !== true) return unavailable('Messaging is unavailable until this job is provided by the API.');
        if (!text(jobId) || !text(receiverId)) return unavailable('The API has not identified this job’s forwarder.');
        const message = text(content);
        if (!message || message.length > 500) return unavailable('Enter a message of 500 characters or fewer.');
        const result = await baseQuery({ url: '/messaging/send', method: 'POST', body: { jobId, receiverId, content: message } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.message;
        if (!text(saved?.id) || saved.jobId !== jobId || saved.receiverId !== receiverId || saved.content !== message) {
          return unavailable('The API did not confirm the sent message. Check the conversation before trying again.');
        }
        return { data: { id: saved.id } };
      },
    }),
  }),
});

export const { useGetJobDetailQuery, useSendJobMessageMutation } = jobsApi;
