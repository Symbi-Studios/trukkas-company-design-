// Help-centre topics. `value` is the ticket category, `slug` the guides filter
// (/support/guides?topic=<slug>) and the `topic` key on each guide.
export const SUPPORT_TOPICS = [
  { slug: 'account-login', value: 'Account & Login', label: 'Account & Login Issues', icon: 'user-round', description: 'Signing in, passwords, two-factor and team access.' },
  { slug: 'jobs-bookings', value: 'Jobs & Bookings', label: 'Job & Booking Issues', icon: 'briefcase', description: 'Finding jobs, bidding and managing won jobs.' },
  { slug: 'payments-wallet', value: 'Payments & Wallet', label: 'Payments & Wallet', icon: 'wallet', description: 'Earnings, payouts, withdrawals and fees.' },
  { slug: 'truck-fleet', value: 'Truck & Fleet', label: 'Truck & Fleet Management', icon: 'truck', description: 'Adding vehicles, status and maintenance.' },
  { slug: 'driver-management', value: 'Driver Management', label: 'Driver Management', icon: 'users', description: 'Onboarding drivers and assigning them to trips.' },
  { slug: 'documents-compliance', value: 'Documents & Compliance', label: 'Documents & Compliance', icon: 'file-text', description: 'Company, vehicle and driver documents and renewals.' },
  { slug: 'technical', value: 'Technical', label: 'Technical Issues', icon: 'settings', description: 'Uploads, notifications and troubleshooting.' },
];

export const topicBySlug = (slug) => SUPPORT_TOPICS.find((t) => t.slug === slug);
export const topicByValue = (value) => SUPPORT_TOPICS.find((t) => t.value === value);

/** Case-insensitive match on a guide's title, summary, topic and body text. */
export function guideMatches(guide, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const topic = topicBySlug(guide.topic);
  const text = [
    guide.title, guide.summary, topic?.label,
    ...guide.sections.flatMap((s) => [s.heading, s.body, s.tip, ...(s.steps || [])]),
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => text.includes(word));
}
