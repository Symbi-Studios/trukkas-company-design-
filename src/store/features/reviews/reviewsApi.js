import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, rows, text } from '../jobs/jobContracts.js';
import { reviewSummaryView, reviewView } from './reviewContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });

export const reviewsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyReviews'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getCompanyReviews: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const companyId = api.getState().auth.account?.id;
        if (!companyId) return unavailable('Sign in to view company reviews.');
        // The existing screen searches locally and has no pagination controls.
        // Load every page before exposing the collection to that search.
        const reviews = [];
        let total = null, pages = 1, summary = null;
        for (let page = 1; page <= pages; page += 1) {
          if (api.signal.aborted) return unavailable('The reviews request was cancelled.');
          const result = await baseQuery({ url: '/company/reviews', params: { page, limit: 100, sort: 'newest' } });
          if (result.error) return result;
          if (api.getState().auth.account?.id !== companyId) return unavailable('Your company session changed. Reload Ratings & Reviews.');
          const data = unwrapApiResponseData(result.data), items = rows(data?.reviews), pagination = data?.pagination;
          if (!items || pagination?.page !== page || count(pagination?.total) === null || count(pagination?.totalPages) === null) return unavailable('The API did not return valid reviews and pagination.');
          if (page === 1) { total = pagination.total; pages = pagination.totalPages; summary = reviewSummaryView(data.summary); }
          if (pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The reviews changed while loading. Please reload.');
          reviews.push(...items);
          if (reviews.length > total) return unavailable('The API returned invalid review pagination.');
        }
        if (reviews.length !== total || reviews.some((review) => !text(review.id)) || new Set(reviews.map((review) => review.id)).size !== total) return unavailable('The API did not return the complete review collection.');
        return { data: { summary, reviews: reviews.map(reviewView) } };
      },
      providesTags: ['CompanyReviews'],
    }),
  }),
});

export const { useGetCompanyReviewsQuery } = reviewsApi;
