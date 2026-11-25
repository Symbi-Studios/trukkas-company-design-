// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
import { baseApi, unwrapApiResponseData } from '../../api/baseApi';

// Feedback about Trukkas itself (not a delivery rating). Admins read it in the console's Feedback inbox
// and reply; replies reach the user as notifications.
const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const identity = (api) => JSON.stringify([api.getState().auth.account?.id, api.getState().auth.account?.actualUserId, api.getState().auth.activeCompanyId]);
const signedIn = (api) => (api.getState().auth.accessToken && api.getState().auth.account?.id ? null : unavailable('Sign in to send feedback.'));

export const FEEDBACK_TYPES = [
  { value: 'SUGGESTION', label: 'Suggestion', icon: 'lightbulb', hint: 'An idea to make Trukkas better' },
  { value: 'ISSUE', label: 'Something’s wrong', icon: 'bug', hint: 'A bug or something confusing' },
  { value: 'PRAISE', label: 'Praise', icon: 'heart', hint: 'Something you like' },
  { value: 'OTHER', label: 'Other', icon: 'message-circle', hint: 'Anything else' },
];
const TYPE_LABEL = { SUGGESTION: 'Suggestion', ISSUE: 'Issue', PRAISE: 'Praise', OTHER: 'Other' };
const STATUS_LABEL = { OPEN: 'Received', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', SPAM: 'Closed' };

function when(value) {
  const at = Date.parse(value || '');
  return Number.isNaN(at) ? null : at;
}

function feedbackView(row) {
  return {
    id: row.id, title: text(row.title) ?? '—', body: text(row.body) ?? text(row.excerpt) ?? '', topic: text(row.topic),
    type: TYPE_LABEL[row.type] ?? '—', statusCode: text(row.status), status: STATUS_LABEL[row.status] ?? '—',
    submittedAt: when(row.submittedAt ?? row.createdAt), resolvedAt: when(row.resolvedAt),
  };
}

export const feedbackApi = baseApi.enhanceEndpoints({ addTagTypes: ['MyFeedback'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getFeedbackTopics: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery('/feedback/topics');
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        const topics = Array.isArray(data?.topics) ? data.topics.filter(text) : [];
        return { data: { topics } };
      },
    }),
    getMyFeedback: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = identity(api), items = [];
        for (let page = 1; page <= 50; page += 1) {
          const result = await baseQuery({ url: '/feedback/mine', params: { page, limit: 50 } });
          if (identity(api) !== account) return unavailable('Your session changed. Reload the page.');
          if (result.error) return result;
          const data = unwrapApiResponseData(result.data);
          const batch = Array.isArray(data?.feedback) ? data.feedback : Array.isArray(data?.items) ? data.items : null;
          if (!batch) return unavailable('Your feedback couldn’t be loaded. Try again in a moment.');
          items.push(...batch.filter((row) => text(row?.id)));
          const pages = Number(data?.pagination?.totalPages) || 1;
          if (page >= pages || !batch.length) break;
        }
        return { data: items.map(feedbackView).sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0)) };
      },
      providesTags: ['MyFeedback'],
    }),
    sendFeedback: builder.mutation({
      async queryFn({ title, body, type, topic }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(title) || title.trim().length > 150 || !text(body) || body.trim().length > 5000 || !TYPE_LABEL[type]) return unavailable('Add a short title and your message.');
        const result = await baseQuery({ url: '/feedback', method: 'POST', body: { title: title.trim(), body: body.trim(), type, channel: 'WEB', ...(text(topic) ? { topic: topic.trim() } : {}) } });
        if (result.error) {
          if (result.error.status === 403) return unavailable('Feedback is turned off right now. Contact support if you need help.');
          return result;
        }
        const saved = unwrapApiResponseData(result.data);
        return text(saved?.id) ? { data: { id: saved.id } } : unavailable('We couldn’t confirm your feedback was sent. Check “Your feedback” before sending it again.');
      },
      invalidatesTags: ['MyFeedback'],
    }),
  }),
});

export const { useGetFeedbackTopicsQuery, useGetMyFeedbackQuery, useSendFeedbackMutation } = feedbackApi;
