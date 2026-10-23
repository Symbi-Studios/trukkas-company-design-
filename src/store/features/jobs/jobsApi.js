import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { getBidValidationError } from '../../../domain/jobs.js';
import { count, earningsView, jobReviewView, jobView, lifetimeEarningsView, paperworkView, rows, text } from './jobContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const changedTags = ['CompanyJobs', 'CompanyDashboard', 'CompanyTrips', 'CompanyTrip'];
const signedIn = (api) => {
  const { account, activeCompanyId } = api.getState().auth;
  return account?.apiRole === 'TRUCKER' && account.truckerType === 'COMPANY' && account.id === activeCompanyId
    ? null : unavailable('Sign in with your trucking-company account to manage jobs.');
};

function companyQuery(api, baseQuery) {
  const identity = () => {
    const { account, activeCompanyId } = api.getState().auth;
    return JSON.stringify([account?.id, account?.actualUserId, activeCompanyId]);
  };
  const company = identity();
  return async (args) => {
    if (api.signal.aborted) return unavailable('The job request was cancelled.');
    if (identity() !== company) return unavailable('Your company session changed. Reload Jobs before continuing.');
    const result = await baseQuery(args);
    return identity() === company ? result : unavailable('Your company session changed. Reload Jobs before continuing.');
  };
}

// Read every documented page for the existing local filters and pagination.
async function collection(baseQuery, api, url, key, params = {}) {
  const resultRows = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The job request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, limit: 100 } });
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.[key]), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination?.total) === null || count(pagination?.totalPages) === null) return unavailable('The API did not return a valid job collection and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if ((total > 0 && pages === 0) || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The jobs changed while loading. Please reload.');
    resultRows.push(...items);
    if (resultRows.length > total) return unavailable('The API returned invalid job pagination.');
  }
  if (resultRows.length !== total || resultRows.some((item) => !text(item.id)) || new Set(resultRows.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete job collection.');
  return { data: resultRows };
}

export const jobsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyJobs', 'CompanyJob', 'CompanyDashboard', 'CompanyTrips', 'CompanyTrip', 'CompanyDrivers', 'CompanyFleet'] }).injectEndpoints({
  endpoints: (builder) => ({
    getAvailableJobs: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const available = await collection(baseQuery, api, '/jobs/available', 'jobs');
        if (available.error) return available;
        const bids = await collection(baseQuery, api, '/company/bids', 'bids', { tab: 'active' });
        if (bids.error) return bids;
        if (bids.data.some((bid) => !text(bid.job?.id))) return unavailable('The API did not identify the job attached to a bid.');
        const byJob = new Map(bids.data.map((bid) => [bid.job?.id, bid]));
        const jobs = new Map(available.data.map((job) => [job.id, jobView(job, 'market', byJob.get(job.id))]));
        // Keep real open bids visible even if a fleet change means that job no
        // longer appears in the capability-matched marketplace collection.
        const extras = bids.data.filter((bid) => !jobs.has(bid.job.id));
        for (let offset = 0; offset < extras.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The job request was cancelled.');
          const batch = extras.slice(offset, offset + 4);
          const details = await Promise.all(batch.map((bid) => baseQuery(`/jobs/${encodeURIComponent(bid.job.id)}`)));
          for (let index = 0; index < details.length; index += 1) {
            const result = details[index];
            if (result.error) return result;
            const bid = batch[index], job = jobView(unwrapApiResponseData(result.data), 'detail', bid);
            if (job?.id !== bid.job.id) return unavailable('The API did not return the requested bid’s job.');
            jobs.set(job.id, job);
          }
        }
        return { data: [...jobs.values()] };
      },
      providesTags: ['CompanyJobs'],
    }),
    getMyJobs: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const assigned = await collection(baseQuery, api, '/company/jobs', 'jobs');
        if (assigned.error) return assigned;
        const bids = await collection(baseQuery, api, '/company/bids', 'bids', { tab: 'active' });
        if (bids.error) return bids;
        const byId = new Map(assigned.data.map((job) => [job.id, null]));
        for (const bid of bids.data) {
          const job = jobView(bid.job, 'bid', bid);
          if (!job) return unavailable('The API did not identify the job attached to a bid.');
          if (!byId.has(job.id)) byId.set(job.id, job);
        }
        // Enrich company rows and open offers with the full job terms, so the
        // existing local filters and company inspector use the same contract.
        const ids = [...byId.keys()];
        const byJob = new Map(bids.data.map((bid) => [bid.job.id, bid]));
        for (let offset = 0; offset < ids.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The job request was cancelled.');
          const batch = ids.slice(offset, offset + 4);
          const results = await Promise.all(batch.map((id) => baseQuery(`/jobs/${encodeURIComponent(id)}`)));
          for (let index = 0; index < results.length; index += 1) {
            const result = results[index];
            if (result.error) return result;
            const id = batch[index];
            const job = jobView(unwrapApiResponseData(result.data), 'detail', byJob.get(id));
            if (job?.id !== id) return unavailable('The API did not return the requested job.');
            byId.set(id, job);
          }
        }
        return { data: [...byId.values()] };
      },
      providesTags: ['CompanyJobs'],
    }),
    getMyJobLifetimeEarnings: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const result = await baseQuery({ url: '/company/earnings', params: { period: '30d' } });
        if (result.error) return result;
        return { data: lifetimeEarningsView(unwrapApiResponseData(result.data)) };
      },
      providesTags: ['CompanyJobs', 'CompanyDashboard', 'CompanyTrips'],
    }),
    getJobReview: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(id)) return unavailable('This job has no API ID.');
        const result = await collection(baseQuery, api, '/company/reviews', 'reviews', { jobId: id, sort: 'newest' });
        if (result.error) return result;
        if (result.data.some((review) => review.jobId !== id || !['COMPANY', 'DRIVER'].includes(review.reviewed?.type))) return unavailable('The API did not identify whether a job review rates the company or a driver.');
        const companyReviews = result.data.filter((review) => review.reviewed.type === 'COMPANY');
        if (companyReviews.length > 1) return unavailable('The API returned multiple company reviews for this job.');
        const review = companyReviews.length ? jobReviewView(companyReviews[0]) : null;
        if (companyReviews.length && !review) return unavailable('The API did not return a valid job rating.');
        return { data: { review } };
      },
      providesTags: ['CompanyJobs', 'CompanyDashboard'],
    }),
    getJobDetail: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(id)) return unavailable('This job has no API ID.');
        const result = await baseQuery(`/jobs/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const job = jobView(unwrapApiResponseData(result.data));
        return job?.id === id ? { data: job } : unavailable('The API did not return the requested job.');
      },
      providesTags: (_data, _error, id) => ['CompanyJobs', { type: 'CompanyJob', id }],
    }),
    getJobEarnings: builder.query({
      async queryFn(job, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(job?.id)) return unavailable('This job has no API ID.');
        const result = await baseQuery(`/company/trips/${encodeURIComponent(job.id)}`);
        if (result.error) return result;
        const trip = unwrapApiResponseData(result.data)?.trip;
        if (trip?.id !== job.id) return unavailable('The API did not identify this job’s trip.');
        return { data: earningsView(trip, job) };
      },
      providesTags: ['CompanyJobs'],
    }),
    getJobPaperwork: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(id)) return unavailable('This job has no API ID.');
        const result = await baseQuery(`/company/trips/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const trip = unwrapApiResponseData(result.data)?.trip;
        if (trip?.id !== id || trip.jobId !== id) return unavailable('The API did not identify this job’s trip.');
        return { data: paperworkView(trip) };
      },
      providesTags: (_data, _error, id) => ['CompanyJobs', { type: 'CompanyTrip', id }],
    }),
    getJobDispatchOptions: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const result = await collection(baseQuery, api, '/company/drivers', 'drivers', { status: 'ACTIVE', availability: 'AVAILABLE' });
        if (result.error) return result;
        return { data: result.data.filter((driver) => driver.status === 'ACTIVE' && driver.availability === 'AVAILABLE' && text(driver.truck?.id)).map((driver) => ({
          id: driver.id, name: text(driver.name) ?? '—', licenseClass: text(driver.license?.class) ?? '—',
          truckId: driver.truck.id, plate: text(driver.truck.plateNumber) ?? '—',
          makeModel: [text(driver.truck.make), text(driver.truck.model)].filter(Boolean).join(' ') || '—', location: text(driver.truck.locationLabel) ?? '—',
        })) };
      },
      providesTags: ['CompanyJobs', 'CompanyDrivers', 'CompanyFleet', 'CompanyTrips'],
    }),
    submitJobBid: builder.mutation({
      async queryFn({ jobId, amount, message = '' }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const error = getBidValidationError(amount, message);
        if (!text(jobId) || error) return unavailable(error ?? 'This job has no API ID.');
        const result = await baseQuery({ url: `/jobs/${encodeURIComponent(jobId)}/bids`, method: 'POST', body: { proposedPrice: Number(amount), ...(message.trim() ? { message: message.trim() } : {}) } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        return saved?.jobId === jobId && text(saved.bidId) && saved.status === 'PENDING' && saved.amountBasis === 'WHOLE_JOB' && saved.amount === Number(amount) ? { data: { id: saved.bidId } } : unavailable('The API did not confirm the bid. Reload the job before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    withdrawJobBid: builder.mutation({
      async queryFn({ jobId, bidId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(jobId) || !text(bidId)) return unavailable('The API has not identified this bid.');
        const result = await baseQuery({ url: `/company/bids/${encodeURIComponent(bidId)}/withdraw`, method: 'POST' });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data);
        return saved?.bidId === bidId && saved.jobId === jobId && saved.status === 'WITHDRAWN' ? { data: { id: bidId } } : unavailable('The API did not confirm withdrawal. Reload the job before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    setSavedJob: builder.mutation({
      async queryFn({ jobId, saved }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(jobId) || typeof saved !== 'boolean') return unavailable('The job’s saved state is unavailable.');
        const result = await baseQuery({ url: `/jobs/saved-jobs/${encodeURIComponent(jobId)}`, method: 'PUT', body: { saved } });
        if (result.error) return result;
        const confirmed = unwrapApiResponseData(result.data);
        return confirmed?.jobId === jobId && confirmed.saved === saved ? { data: { saved } } : unavailable('The API did not confirm the saved state. Reload the job.');
      },
      invalidatesTags: changedTags,
    }),
    dispatchJobDriver: builder.mutation({
      async queryFn({ jobId, driverId, truckId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (![jobId, driverId, truckId].every(text)) return unavailable('Select a driver and their assigned truck.');
        const options = jobsApi.endpoints.getJobDispatchOptions.select(undefined)(api.getState());
        if (options.isError || options.status !== 'fulfilled' || !options.data?.some((driver) => driver.id === driverId && driver.truckId === truckId)) {
          return unavailable('Load and select an available driver and their assigned truck before dispatching.');
        }
        const result = await baseQuery({ url: `/jobs/${encodeURIComponent(jobId)}/assignment/dispatch`, method: 'POST', body: { driverId, truckId } });
        if (result.error) return result;
        const assignment = unwrapApiResponseData(result.data)?.assignment;
        return assignment?.jobId === jobId && assignment.tripId === jobId && assignment.driverId === driverId && assignment.truckId === truckId && assignment.status === 'DRIVER_ASSIGNED' ? { data: { id: assignment.tripId, truckPlate: text(assignment.plateNumber) ?? '—' } } : unavailable('The API did not confirm dispatch. Reload the job before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    sendJobMessage: builder.mutation({
      async queryFn({ jobId, receiverId, content }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        if (!text(jobId) || !text(receiverId)) return unavailable('The API has not identified this job’s forwarder.');
        const message = text(content);
        if (!message || message.length > 500) return unavailable('Enter a message of 500 characters or fewer.');
        const result = await baseQuery({ url: '/messaging/send', method: 'POST', body: { jobId, receiverId, content: message } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.message;
        return text(saved?.id) && saved.jobId === jobId && saved.receiverId === receiverId && saved.content === message ? { data: { id: saved.id } } : unavailable('The API did not confirm the sent message. Check the conversation before trying again.');
      },
    }),
  }),
});

export const { useGetAvailableJobsQuery, useGetMyJobsQuery, useGetMyJobLifetimeEarningsQuery, useGetJobReviewQuery, useGetJobDetailQuery, useGetJobEarningsQuery, useLazyGetJobEarningsQuery, useGetJobPaperworkQuery, useGetJobDispatchOptionsQuery, useSubmitJobBidMutation, useWithdrawJobBidMutation, useSetSavedJobMutation, useDispatchJobDriverMutation, useSendJobMessageMutation } = jobsApi;
