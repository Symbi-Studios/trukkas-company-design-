import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { categoryToWire, count, messageView, rows, safeAttachmentUrl, text, threadView } from './supportContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to contact support.');
const uploadedImages = new WeakMap();

async function allPages(api, baseQuery, url, key, limit) {
  const account = api.getState().auth.account;
  const items = [];
  let pages = 1, total = null, first = null;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The support request was cancelled.');
    const result = await baseQuery({ url, params: { page, ...(limit ? { limit } : {}) } });
    if (result.error) return result;
    if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload support.');
    const data = unwrapApiResponseData(result.data), batch = rows(data?.[key]), pagination = data?.pagination;
    if (!batch || pagination?.page !== page || !count(pagination.total) || !count(pagination.totalPages)) return unavailable('The API did not return valid support records and pagination.');
    if (page === 1) { first = data; total = pagination.total; pages = pagination.totalPages; }
    if ((total > 0 && pages === 0) || total !== pagination.total || pages !== pagination.totalPages || (page < pages && !batch.length)) return unavailable('The support records changed or could not be loaded completely. Reload before continuing.');
    items.push(...batch);
    if (items.length > total) return unavailable('The API returned inconsistent support pagination.');
  }
  if (items.length !== total || items.some((item) => !text(item.id)) || new Set(items.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete support collection.');
  return { data: { items, first } };
}

export const supportApi = baseApi.enhanceEndpoints({ addTagTypes: ['SupportTickets', 'SupportTicket'] }).injectEndpoints({
  endpoints: (builder) => ({
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
        const account = api.getState().auth.account;
        const result = await allPages(api, baseQuery, `/support/threads/${encodeURIComponent(id)}/messages`, 'messages');
        if (result.error) return result;
        const source = result.data.first?.thread;
        if (source?.id !== id) return unavailable('The API did not identify this support ticket.');
        const cached = supportApi.endpoints.getSupportTickets.select()(api.getState()).data;
        const list = cached ? { data: cached } : await api.dispatch(supportApi.endpoints.getSupportTickets.initiate(undefined, { subscribe: false }));
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload support.');
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
      async queryFn({ subject, category, body, files = [] }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(subject) || !text(body) || !categoryToWire(category)) return unavailable('Enter a subject and a message for support.');
        if (!Array.isArray(files) || files.length) return unavailable('The ticket creation API does not support attachments. Remove the files before sending.');
        const account = api.getState().auth.account;
        const result = await baseQuery({ url: '/support/threads', method: 'POST', body: { subject: subject.trim(), category: categoryToWire(category), message: body.trim() } });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Check your tickets before retrying.');
        const thread = unwrapApiResponseData(result.data)?.thread;
        return text(thread?.id) && thread.subject === subject.trim() && thread.category === categoryToWire(category)
          && rows(thread.messages)?.some((message) => message.threadId === thread.id && message.senderType === 'USER' && message.content === body.trim())
          ? { data: threadView(thread) } : unavailable('The API did not confirm your support request. Check your tickets before retrying.');
      },
      invalidatesTags: ['SupportTickets'],
    }),
    replyToSupportTicket: builder.mutation({
      async queryFn({ id, body, files = [] }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id) || !text(body)) return unavailable('Enter a reply before sending it.');
        if (!Array.isArray(files) || files.length > 6 || files.some((entry) => !(entry.file instanceof File) || !entry.file.type.startsWith('image/') || entry.file.size > 25 * 1024 * 1024)) return unavailable('The documented upload API supports image attachments only. Remove videos and documents before sending.');
        const account = api.getState().auth.account;
        const pending = files.filter((entry) => uploadedImages.get(entry.file)?.account !== account);
        if (pending.length) {
          const form = new FormData(); pending.forEach((entry) => form.append('files', entry.file));
          const upload = await baseQuery({ url: '/uploads/images', method: 'POST', body: form });
          if (upload.error) return upload;
          if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload this ticket.');
          const images = rows(unwrapApiResponseData(upload.data)?.images);
          if (!images || images.length !== pending.length || images.some((image) => !safeAttachmentUrl(image.url))) return unavailable('The API did not confirm every uploaded image. No reply was sent.');
          pending.forEach((entry, index) => uploadedImages.set(entry.file, { account, url: safeAttachmentUrl(images[index].url) }));
        }
        const attachmentUrls = files.map((entry) => uploadedImages.get(entry.file).url);
        const result = await baseQuery({ url: `/support/threads/${encodeURIComponent(id)}/messages`, method: 'POST', body: { content: body.trim(), ...(attachmentUrls.length ? { attachmentUrls } : {}) } });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Check the ticket before retrying.');
        const source = unwrapApiResponseData(result.data);
        return source?.threadId === id && text(source.id) && source.senderType === 'USER' && source.content === body.trim()
          && (!attachmentUrls.length || (Array.isArray(source.attachmentUrls) && attachmentUrls.every((url) => source.attachmentUrls.includes(url))))
          ? { data: messageView(source, id) } : unavailable('The API did not confirm the reply. Refresh this ticket before retrying.');
      },
      invalidatesTags: (_data, _error, { id }) => ['SupportTickets', { type: 'SupportTicket', id }],
    }),
  }),
});

export const { useGetSupportTicketsQuery, useGetSupportTicketQuery, useCreateSupportTicketMutation, useReplyToSupportTicketMutation } = supportApi;
