import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value : null;
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const invalid = (message) => ({ error: { status: 'CUSTOM_ERROR', error: message } });
const kinds = {
  JOB: { type: 'job', icon: 'briefcase' },
  BID: { type: 'job', icon: 'gavel' },
  PAYMENT: { type: 'payout', icon: 'wallet' },
  SYSTEM: { type: 'system', icon: 'bell' },
  TRACKING: { type: 'job', icon: 'map-pin' },
  DISPUTE: { type: 'system', icon: 'triangle-alert' },
};

function notificationView(notification) {
  const kind = kinds[notification.type] || { type: 'system', icon: 'bell' };
  const date = typeof notification.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(notification.createdAt)
    ? new Date(notification.createdAt) : null;
  const createdAt = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(date)
    : '—';
  const jobId = text(notification.data?.jobId);
  return {
    id: text(notification.id),
    ...kind,
    title: text(notification.title) ?? '—',
    body: text(notification.body) ?? '—',
    read: typeof notification.isRead === 'boolean' ? notification.isRead : null,
    createdAt,
    link: jobId ? `/jobs/${encodeURIComponent(jobId)}` : null,
  };
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      // The existing screen has no pagination controls. Read every documented
      // page so its All/Unread filters and search cover the entire collection.
      async queryFn(_arg, api, _options, baseQuery) {
        const notifications = [];
        const seen = new Set();
        let unreadCount = null;
        let page = 1;
        let totalPages = 1;
        do {
          if (api.signal.aborted) return invalid('The notification request was cancelled.');
          const result = await baseQuery({ url: '/notifications', params: { page, limit: 20 } });
          if (result.error) return result;
          const data = unwrapApiResponseData(result.data);
          if (!Array.isArray(data?.notifications)) return invalid('The API did not return a notification collection.');
          if (page === 1) unreadCount = count(data.unreadCount);
          const pages = count(data.totalPages);
          if (pages === null || count(data.page) !== page || (pages === 0 && data.notifications.length > 0)) {
            return invalid('The API did not return valid notification pagination.');
          }
          // Keep the first page's bound so new arrivals cannot extend this
          // request indefinitely. A later refresh picks up those arrivals.
          totalPages = page === 1 ? pages : Math.min(totalPages, pages);
          for (const item of data.notifications) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return invalid('The API returned an invalid notification.');
            const notification = notificationView(item);
            if (!notification.id || !seen.has(notification.id)) {
              notifications.push(notification);
              if (notification.id) seen.add(notification.id);
            }
          }
          page += 1;
        } while (page <= totalPages);
        return { data: { notifications, unreadCount } };
      },
      providesTags: ['Notifications'],
    }),
    getNotificationUnreadCount: builder.query({
      query: () => '/notifications/unread-count',
      transformResponse: (response) => count(unwrapApiResponseData(response)?.count),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation({
      queryFn(id, _api, _options, baseQuery) {
        if (!text(id)) return invalid('This notification has no API ID and cannot be marked as read.');
        return baseQuery({ url: `/notifications/${encodeURIComponent(id)}/read`, method: 'PATCH' });
      },
      invalidatesTags: (_data, error) => error ? [] : ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: (_data, error) => error ? [] : ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
