export const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const rows = (value) => Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value : null;
export const count = (value) => Number.isSafeInteger(value) && value >= 0;
const date = (value, withTime = false) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const statuses = { OPEN: 'Open', IN_PROGRESS: 'In Progress', PENDING: 'Pending', ESCALATED: 'Escalated', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const categories = { DELIVERY_DELAY: 'Delivery Delay', PAYMENT_ISSUE: 'Payments', DISPUTE: 'Dispute', DRIVER_ISSUE: 'Driver Issue', DOCUMENT_QUERY: 'Documents', GENERAL: 'General' };

export function safeAttachmentUrl(value) {
  if (!text(value)) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function threadView(source) {
  if (!text(source?.id)) return null;
  return { id: source.id, subject: text(source.subject) ?? '—', category: categories[source.category] ?? '—', status: statuses[source.status] ?? '—', createdAt: date(source.createdAt), updatedAt: date(source.updatedAt) };
}

export function messageView(source, threadId) {
  if (!text(source?.id) || source.threadId !== threadId) return null;
  return {
    id: source.id, author: source.senderType === 'USER' ? 'You' : '—', role: source.senderType === 'USER' ? 'You' : source.senderType === 'ADMIN' ? 'Support Agent' : '—',
    agent: source.senderType === 'ADMIN', time: date(source.createdAt, true), timestamp: typeof source.createdAt === 'string' ? Date.parse(source.createdAt) : NaN,
    body: text(source.content) ?? '—',
    // URLs alone do not establish a filename, MIME type or size. Keep their
    // existing attachment cards usable without inventing file metadata.
    attachments: Array.isArray(source.attachmentUrls) ? source.attachmentUrls.map((url) => ({ url: safeAttachmentUrl(url), name: '—', size: '—', type: '' })) : [],
  };
}

// The Submit Ticket form uses help-centre topics (domain/support.js) as its
// issue categories. Until the API has matching categories, map each topic to
// the closest documented one; the topic itself is kept in the message details.
const topicCategories = {
  'Account & Login': 'GENERAL', 'Jobs & Bookings': 'GENERAL', 'Payments & Wallet': 'PAYMENT_ISSUE', 'Truck & Fleet': 'GENERAL',
  'Driver Management': 'DRIVER_ISSUE', 'Documents & Compliance': 'DOCUMENT_QUERY', Technical: 'GENERAL', Other: 'GENERAL',
};
export const categoryToWire = (value) => Object.entries(categories).find(([, label]) => label === value)?.[0] ?? topicCategories[value] ?? null;

/**
 * The create-ticket API takes only subject, category and message. Fields it has
 * no slot for yet (topic, priority, related job/trip, truck, driver) are
 * appended to the message so support still sees them. `details` is
 * [[label, value]]; empty values are skipped.
 */
export function ticketMessage(body, details = []) {
  const lines = details.filter(([, value]) => text(value)).map(([label, value]) => `${label}: ${value.trim()}`);
  return lines.length ? `${body.trim()}\n\n— Ticket details —\n${lines.join('\n')}` : body.trim();
}
