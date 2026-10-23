import { SUPPORT_TOPICS } from '../../../domain/support.js';
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
  return { id: source.id, subject: text(source.subject) ?? '—', category: text(source.subcategory) ?? categories[source.category] ?? '—', status: statuses[source.status] ?? '—', createdAt: date(source.createdAt), updatedAt: date(source.updatedAt) };
}

export function messageView(source, threadId) {
  if (!text(source?.id) || source.threadId !== threadId) return null;
  return {
    id: source.id, author: source.senderType === 'USER' ? 'You' : text(source.senderName) ?? '—', role: source.senderType === 'USER' ? 'You' : source.senderType === 'ADMIN' ? 'Support Agent' : '—',
    agent: source.senderType === 'ADMIN', time: date(source.createdAt, true), timestamp: typeof source.createdAt === 'string' ? Date.parse(source.createdAt) : NaN,
    body: text(source.content) ?? '—',
    attachments: Array.isArray(source.attachmentUrls) ? source.attachmentUrls.map((url) => {
      const attachment = rows(source.attachments)?.find((item) => item.url === url);
      return { url: safeAttachmentUrl(url), name: text(attachment?.fileName) ?? '—', size: '—', type: ({ IMAGE: 'image/', VIDEO: 'video/', PDF: 'application/pdf' })[attachment?.kind] ?? '' };
    }) : [],
  };
}

// Broad support categories are separate from the customer-selected help topic.
const topicCategories = {
  'Account & Login': 'GENERAL', 'Jobs & Bookings': 'GENERAL', 'Payments & Wallet': 'PAYMENT_ISSUE', 'Truck & Fleet': 'GENERAL',
  'Driver Management': 'DRIVER_ISSUE', 'Documents & Compliance': 'DOCUMENT_QUERY', Technical: 'GENERAL', Other: 'GENERAL',
};
export const categoryToWire = (value) => Object.entries(categories).find(([, label]) => label === value)?.[0] ?? topicCategories[value] ?? null;

const normalized = (value) => text(value)?.toLowerCase();
function articleTopic(category) {
  return SUPPORT_TOPICS.find((topic) => [topic.slug, topic.value, topic.label].some((value) => normalized(value) === normalized(category)));
}

// Render documented Markdown/structured-guide content in the existing article
// sections. Text stays text; backend HTML is never injected into the page.
function articleSections(source) {
  const guide = source.guide;
  const steps = rows(guide?.steps);
  if (steps?.length) {
    const sections = steps.map((step) => ({ heading: text(step.title) ?? '—', body: Array.isArray(step.paragraphs) ? step.paragraphs.filter(text).join('\n\n') || '—' : '—' }));
    const fields = rows(guide.fieldItems);
    fields?.forEach((field) => sections.push({ heading: text(field.label) ?? '—', body: text(field.description) ?? '—' }));
    if (text(guide.tip)) sections[sections.length - 1].tip = guide.tip;
    return sections;
  }
  if (!text(source.body)) return [{ heading: '—', body: '—' }];
  const sections = [];
  let section = null;
  for (const line of source.body.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) { section = { heading: heading[1], body: '' }; sections.push(section); }
    else {
      if (!section) { section = { heading: '—', body: '' }; sections.push(section); }
      section.body += (section.body ? '\n' : '') + line;
    }
  }
  return sections;
}

export function guideView(source, detail = false) {
  const topic = articleTopic(source.category);
  return {
    id: source.id, title: text(source.title) ?? '—', summary: text(source.summary) ?? '—',
    category: text(source.category) ?? '—', topic: topic?.slug ?? null,
    topicInfo: topic ?? { value: text(source.category) ?? '—', label: text(source.category) ?? '—', icon: 'file-text', slug: null },
    popular: typeof source.featured === 'boolean' ? source.featured : null,
    readMinutes: null, updated: date(source.updatedAt),
    sections: detail ? articleSections(source) : [],
    related: detail ? rows(source.relatedArticles)?.filter((item) => text(item.id)).map((item) => ({ id: item.id, title: text(item.title) ?? '—' })) ?? null : null,
    allowFeedback: typeof source.allowFeedback === 'boolean' ? source.allowFeedback : null,
    vote: source.myVote === 'HELPFUL' ? 'yes' : source.myVote === 'NOT_HELPFUL' ? 'no' : null,
  };
}
