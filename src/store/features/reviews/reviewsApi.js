import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, rows, text } from '../jobs/jobContracts.js';
import { reviewSummaryView, reviewView } from './reviewContracts.js';
import { reviewCsvRecords } from './reviewCsv.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.id && account.apiRole === 'TRUCKER' && account.truckerType === 'COMPANY'
    ? null : unavailable('Sign in to manage company reviews.');
};
const identity = (state) => JSON.stringify([state.auth.account?.id, state.auth.account?.actualUserId, state.auth.activeCompanyId]);
function companyQuery(api, baseQuery) {
  const company = identity(api.getState());
  return async (args) => {
    if (identity(api.getState()) !== company) return unavailable('Your company session changed. Reload Ratings & Reviews.');
    if (api.signal.aborted) return unavailable('The reviews request was cancelled.');
    const result = await baseQuery(args);
    return identity(api.getState()) === company ? result : unavailable('Your company session changed. Reload Ratings & Reviews.');
  };
}

async function loadReviews(baseQuery, api) {
  const reviews = [];
  let total = null, pages = 1, summary = null;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The reviews request was cancelled.');
    const result = await baseQuery({ url: '/company/reviews', params: { page, limit: 100, sort: 'newest' } });
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.reviews), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination?.total) === null || count(pagination?.totalPages) === null) return unavailable('The API did not return valid reviews and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; summary = reviewSummaryView(data.summary); }
    if (total > 0 && pages === 0) return unavailable('The API did not return valid review pagination.');
    if (summary.total !== null && summary.total !== total) return unavailable('The rating summary and review totals do not match. Reload Ratings & Reviews.');
    if (pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The reviews changed while loading. Please reload.');
    reviews.push(...items);
    if (reviews.length > total) return unavailable('The API returned invalid review pagination.');
  }
  if (reviews.length !== total || reviews.some((review) => !text(review.id)) || new Set(reviews.map((review) => review.id)).size !== total) return unavailable('The API did not return the complete review collection.');
  return { data: { summary, reviews: reviews.map(reviewView) } };
}

async function changeReply({ id, reply, expectedReply }, api, baseQuery, remove = false) {
  const blocked = signedIn(api); if (blocked) return blocked;
  if (!text(id)) return unavailable('Select a review with a confirmed API ID.');
  if (!remove && (typeof reply !== 'string' || !reply.trim() || reply.length > 1000)) return unavailable('Enter a reply of up to 1,000 characters.');
  baseQuery = companyQuery(api, baseQuery);
  const before = await loadReviews(baseQuery, api);
  if (before.error) return before;
  const current = before.data.reviews.find((review) => review.id === id);
  if (!current || !current.replyKnown) return unavailable('The API could not confirm this review’s current reply. Reload Ratings & Reviews.');
  if (remove ? current.reply === null : current.reply?.text === reply.trim()) return before;
  if (expectedReply !== (current.reply?.text ?? null)) return unavailable('This reply changed while you were editing. Close this dialog and reopen it from the refreshed review.');
  const result = await baseQuery({
    url: `/company/reviews/${encodeURIComponent(id)}/reply`, method: remove ? 'DELETE' : 'PUT',
    ...(remove ? {} : { body: { reply: reply.trim() } }),
  });
  if (result.error) return result;
  // These write routes have no documented response shape; confirm the saved state.
  const confirmed = await loadReviews(baseQuery, api);
  if (confirmed.error) return unavailable('The request was sent, but the saved reply could not be confirmed. Reload Ratings & Reviews before trying again.');
  const saved = confirmed.data.reviews.find((review) => review.id === id);
  return saved?.replyKnown && (remove ? saved.reply === null : saved.reply?.text === reply.trim())
    ? confirmed : unavailable('The API did not confirm the reply change. Reload Ratings & Reviews before trying again.');
}

async function syncConfirmedReviews(_arg, { dispatch, getState, queryFulfilled }) {
  const company = identity(getState());
  try {
    const { data } = await queryFulfilled;
    if (identity(getState()) === company) dispatch(reviewsApi.util.updateQueryData('getCompanyReviews', undefined, () => data));
  } catch {
    // Keep the last confirmed state; the dialog displays the API error.
  }
}

export const reviewsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyReviews'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getCompanyReviews: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        return loadReviews(companyQuery(api, baseQuery), api);
      },
      providesTags: ['CompanyReviews'],
    }),
    saveCompanyReviewReply: builder.mutation({
      queryFn: (arg, api, _options, baseQuery) => changeReply(arg, api, baseQuery),
      onQueryStarted: syncConfirmedReviews,
      invalidatesTags: ['CompanyReviews'],
    }),
    deleteCompanyReviewReply: builder.mutation({
      queryFn: (arg, api, _options, baseQuery) => changeReply(arg, api, baseQuery, true),
      onQueryStarted: syncConfirmedReviews,
      invalidatesTags: ['CompanyReviews'],
    }),
    exportCompanyReviews: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const list = await baseQuery({ url: '/company/reviews', params: { page: 1, limit: 1, sort: 'newest' } });
        if (list.error) return list;
        const total = count(unwrapApiResponseData(list.data)?.pagination?.total);
        if (total === null) return unavailable('The API did not confirm how many reviews to export.');
        const records = [];
        let header = null;
        for (let page = 1; page <= Math.max(1, Math.ceil(total / 100)); page += 1) {
          const result = await baseQuery({
            url: '/company/export/reviews', params: { page, limit: 100, sort: 'newest' },
            responseHandler: async (response) => {
              const contentType = response.headers.get('content-type') ?? '';
              return contentType.toLowerCase().includes('json') ? response.json() : { content: await response.text(), contentType };
            },
          });
          if (result.error) return result;
          if (typeof result.data?.content !== 'string' || !result.data.contentType.toLowerCase().includes('text/csv')) return unavailable('The API did not return a CSV file.');
          const batch = reviewCsvRecords(result.data.content);
          if (!batch || header !== null && batch[0] !== header) return unavailable('The API returned inconsistent CSV columns. Please reload and export again.');
          header = batch[0];
          const items = batch.slice(1);
          // Some exporters send the complete collection in one download.
          if (page === 1 && items.length === total) return { data: { content: '\uFEFF' + result.data.content.replace(/^\uFEFF/, '') } };
          if (items.length !== Math.min(100, total - records.length)) return unavailable('The CSV export did not match the review count. Please reload and export again.');
          records.push(...items);
        }
        return records.length === total
          ? { data: { content: '\uFEFF' + [header, ...records].join('\r\n') + '\r\n' } }
          : unavailable('The API did not return the complete review export.');
      },
    }),
  }),
});

export const {
  useGetCompanyReviewsQuery, useSaveCompanyReviewReplyMutation,
  useDeleteCompanyReviewReplyMutation, useLazyExportCompanyReviewsQuery,
} = reviewsApi;
