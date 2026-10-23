import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { categoryToWire, count, messageView, rows, safeAttachmentUrl, text, threadView, guideView } from './supportContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account?.apiRole === 'TRUCKER' && api.getState().auth.account?.truckerType === 'COMPANY' ? null : unavailable('Sign in to contact support.');
const identity = (api) => JSON.stringify([api.getState().auth.account?.id, api.getState().auth.account?.actualUserId, api.getState().auth.activeCompanyId]);
const uploadedFiles = new WeakMap();

async function uploadAttachments(files, api, baseQuery, maxFiles, maxBytes) {
  if (!Array.isArray(files) || files.length > maxFiles || files.some((entry) => !(entry?.file instanceof File) || entry.file.size > maxBytes)) return unavailable('Remove files that exceed the attachment limits before sending.');
  const account = identity(api);
  const pending = files.filter((entry) => uploadedFiles.get(entry.file)?.account !== account);
  if (pending.length) {
    const form = new FormData(); pending.forEach((entry) => form.append('files', entry.file));
    const result = await baseQuery({ url: '/uploads/files', method: 'POST', body: form });
    if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
    if (result.error) return result;
    const uploaded = rows(unwrapApiResponseData(result.data)?.files);
    if (!uploaded || uploaded.length !== pending.length || uploaded.some((file, i) => !safeAttachmentUrl(file.url) || file.fileName !== pending[i].file.name || file.sizeBytes !== pending[i].file.size)) return unavailable('The API did not confirm every uploaded file. No message was sent.');
    pending.forEach((entry, i) => uploadedFiles.set(entry.file, { account, url: safeAttachmentUrl(uploaded[i].url) }));
  }
  return { data: files.map((entry) => uploadedFiles.get(entry.file).url) };
}

async function allPages(api, baseQuery, url, key, limit, params = {}) {
  const account = identity(api);
  const items = [];
  let pages = 1, total = null, first = null;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The support request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, ...(limit ? { limit } : {}) } });
    if (result.error) return result;
    if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
    const data = unwrapApiResponseData(result.data), batch = rows(data?.[key]), pagination = data?.pagination;
    if (!batch || pagination?.page !== page || !count(pagination.total) || !count(pagination.totalPages)) return unavailable('The API did not return valid support records and pagination.');
    if (page === 1) { first = data; total = pagination.total; pages = pagination.totalPages; if (pages > 500) return unavailable('The collection is too large to load completely.'); }
    if ((total > 0 && pages === 0) || total !== pagination.total || pages !== pagination.totalPages || (page < pages && !batch.length)) return unavailable('The support records changed or could not be loaded completely. Reload before continuing.');
    items.push(...batch);
    if (items.length > total) return unavailable('The API returned inconsistent support pagination.');
  }
  if (items.length !== total || items.some((item) => !text(item.id)) || new Set(items.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete support collection.');
  return { data: { items, first } };
}

export const supportApi = baseApi.enhanceEndpoints({ addTagTypes: ['SupportTickets', 'SupportTicket', 'SupportGuides'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getSupportGuides: builder.query({
      async queryFn({ search = '' } = {}, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await allPages(api, baseQuery, '/help/articles', 'articles', 50, text(search) ? { search: search.trim() } : {});
        return result.error ? result : { data: result.data.items.map((item) => guideView(item)) };
      },
      providesTags: ['SupportGuides'],
    }),
    getSupportGuide: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('Choose a guide with a confirmed API ID.');
        const account = identity(api);
        const result = await baseQuery('/help/articles/' + encodeURIComponent(id));
        if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
        if (result.error) return result;
        const source = unwrapApiResponseData(result.data);
        return source?.id === id ? { data: guideView(source, true) } : unavailable('The API did not identify this guide.');
      },
      providesTags: (_data, _error, id) => [{ type: 'SupportGuides', id }],
    }),
    voteSupportGuide: builder.mutation({
      async queryFn({ id, helpful }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id) || typeof helpful !== 'boolean') return unavailable('Choose a guide and a feedback option.');
        const account = identity(api);
        const result = await baseQuery({ url: '/help/articles/' + encodeURIComponent(id) + '/feedback', method: 'POST', body: { helpful } });
        if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
        if (result.error) return result;
        const vote = unwrapApiResponseData(result.data);
        return vote?.articleId === id && text(vote.id) && vote.helpful === helpful ? { data: { helpful } } : unavailable('The API did not confirm your feedback.');
      },
      invalidatesTags: (_data, _error, { id }) => [{ type: 'SupportGuides', id }],
    }),
    getSupportTickets: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await allPages(api, baseQuery, '/support/threads', 'threads', 20);
        return result.error ? result : { data: result.data.items.map(threadView) };
      },
      providesTags: ['SupportTickets'],
    }),
    getSupportTicket: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('Choose a ticket with a confirmed API ID.');
        const account = identity(api);
        const result = await allPages(api, baseQuery, `/support/threads/${encodeURIComponent(id)}/messages`, 'messages');
        if (result.error) return result;
        const source = result.data.first?.thread;
        if (source?.id !== id) return unavailable('The API did not identify this support ticket.');
        const cached = supportApi.endpoints.getSupportTickets.select()(api.getState()).data;
        const list = cached ? { data: cached } : await api.dispatch(supportApi.endpoints.getSupportTickets.initiate(undefined, { subscribe: false }));
        if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
        const meta = list.data?.find((ticket) => ticket.id === id);
        const messages = result.data.items.map((message) => messageView(message, id));
        if (messages.some((message) => !message)) return unavailable('The API returned a message outside this support thread.');
        // Message pages are not documented as oldest/newest first. Sort real
        // timestamps only; retain server order when a timestamp is unavailable.
        messages.sort((a, b) => Number.isFinite(a.timestamp) && Number.isFinite(b.timestamp) ? a.timestamp - b.timestamp : 0);
        const ticket = threadView(source);
        return { data: { ...ticket, createdAt: meta?.createdAt ?? ticket.createdAt, updatedAt: meta?.updatedAt ?? ticket.updatedAt, messages } };
      },
      providesTags: (_data, _error, id) => [{ type: 'SupportTicket', id }],
    }),
    createSupportTicket: builder.mutation({
      async queryFn({ subject, category, body, priority, relatedType, relatedId, truckId, driverId, files = [] }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(subject) || !text(body) || !categoryToWire(category)) return unavailable('Enter a subject and a message for support.');
        const wirePriority = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH' }[priority];
        if (!wirePriority) return unavailable('The API supports Low, Medium or High priority. Choose one before sending.');
        if (relatedType && !['JOB', 'TRIP'].includes(relatedType) || relatedType && !text(relatedId)) return unavailable('Choose a related job or trip with a confirmed API ID.');
        if (!Array.isArray(files) || files.some((entry) => !['image/jpeg', 'image/png', 'application/pdf'].includes(entry?.file?.type))) return unavailable('Attach JPG, PNG or PDF files.');
        const account = identity(api);
        const content = body.trim();
        const uploaded = await uploadAttachments(files, api, baseQuery, 5, 10 * 1024 * 1024);
        if (uploaded.error) return uploaded;
        if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
        const attachmentUrls = uploaded.data;
        const result = await baseQuery({ url: '/support/threads', method: 'POST', body: { subject: subject.trim(), category: categoryToWire(category), topic: category, priority: wirePriority,
          ...(relatedType ? { relatedType, relatedId } : {}), ...(text(truckId) ? { truckId } : {}), ...(text(driverId) ? { driverId } : {}),
          message: content, ...(attachmentUrls.length ? { attachmentUrls } : {}) } });
        if (result.error) return result;
        if (identity(api) !== account) return unavailable('Your company session changed. Check your tickets before retrying.');
        const thread = unwrapApiResponseData(result.data)?.thread;
        return text(thread?.id) && thread.subject === subject.trim() && thread.category === categoryToWire(category)
          && rows(thread.messages)?.some((message) => message.threadId === thread.id && message.senderType === 'USER' && message.content === content && (!attachmentUrls.length || attachmentUrls.every((url) => message.attachmentUrls?.includes(url))))
          ? { data: threadView(thread) } : unavailable('The API did not confirm your support request. Check your tickets before retrying.');
      },
      invalidatesTags: ['SupportTickets'],
    }),
    replyToSupportTicket: builder.mutation({
      async queryFn({ id, body, files = [] }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id) || !text(body)) return unavailable('Enter a reply before sending it.');
        const account = identity(api);
        const uploaded = await uploadAttachments(files, api, baseQuery, 6, 25 * 1024 * 1024);
        if (uploaded.error) return uploaded;
        if (identity(api) !== account) return unavailable('Your company session changed. Reload support.');
        const attachmentUrls = uploaded.data;
        const result = await baseQuery({ url: `/support/threads/${encodeURIComponent(id)}/messages`, method: 'POST', body: { content: body.trim(), ...(attachmentUrls.length ? { attachmentUrls } : {}) } });
        if (result.error) return result;
        if (identity(api) !== account) return unavailable('Your company session changed. Check the ticket before retrying.');
        const source = unwrapApiResponseData(result.data);
        return source?.threadId === id && text(source.id) && source.senderType === 'USER' && source.content === body.trim()
          && (!attachmentUrls.length || (Array.isArray(source.attachmentUrls) && attachmentUrls.every((url) => source.attachmentUrls.includes(url))))
          ? { data: messageView(source, id) } : unavailable('The API did not confirm the reply. Refresh this ticket before retrying.');
      },
      invalidatesTags: (_data, _error, { id }) => ['SupportTickets', { type: 'SupportTicket', id }],
    }),
  }),
});

export const { useGetSupportGuidesQuery, useGetSupportGuideQuery, useVoteSupportGuideMutation, useGetSupportTicketsQuery, useGetSupportTicketQuery, useCreateSupportTicketMutation, useReplyToSupportTicketMutation } = supportApi;
