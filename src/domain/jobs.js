// Pure helpers for the job marketplace and the company's won jobs. A job is the
// forwarder's booking; the haulage runs as trips (see ./trips.js) — one per
// dispatched truck, up to `job.trucksRequired`.
export const JOB_CATEGORIES = ['Container', 'Break-bulk', 'General Cargo'];

// A hijack replaces an empty-container return: instead of taking the empty back
// to the shipping line, the haulier delivers it to an exporter who books it.
// Only hauliers already carrying an empty from that shipping line can accept.
export const JOB_TYPES = [
  { value: 'Port-to-Port', description: 'Pickup and delivery are both port terminals.' },
  { value: 'Port-to-Destination', description: 'Pickup at a port, delivery to the consignee’s location.' },
  { value: 'Hijack', description: 'Deliver an empty container you are returning to an exporter instead of the shipping line.' },
];

export function isHijack(job) {
  return job?.jobType === 'Hijack';
}

// Only break-bulk cargo comes with forwarder photos; containers are sealed.
export function hasCargoPhotos(job) {
  return job?.category === 'Break-bulk' && job.photos > 0;
}

export const JOB_SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'closing', label: 'Closing Soon' },
  { value: 'budget', label: 'Highest Budget' },
  { value: 'pickup', label: 'Earliest Pickup' },
];

const JOB_STATUS_TONE = {
  Pending: 'warning',
  Quoted: 'purple',
  'In Progress': 'info',
  Completed: 'success',
  Cancelled: 'danger',
};

export function jobStatusTone(status) {
  return JOB_STATUS_TONE[status] || 'neutral';
}

export function jobTitle(job) {
  return job?.title || `${job?.cargoType} (${job?.equipment})`;
}

/** Marketplace listing: requests still open, including ones we've already bid on. */
export function isMarketplaceJob(job) {
  return job.status === 'Pending' || job.status === 'Quoted';
}

export function isBiddable(job) {
  return job.status === 'Pending';
}

/** Per-truck rate we're paid: our accepted bid, else the posted budget. */
export function jobRate(job) {
  return job?.myBid?.amount ?? job?.budget ?? 0;
}

export function closesInLabel(days) {
  if (days == null) return null;
  if (days <= 0) return 'Closes today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function closesInTone(days) {
  if (days == null) return 'var(--tk-ink-400)';
  return days <= 1 ? 'var(--tk-danger)' : 'var(--tk-success)';
}

export function suggestedBidRange(job) {
  const round = (n) => Math.round(n / 50000) * 50000;
  return [round(job.budget * 0.9), round(job.budget * 1.1)];
}

export function nextStepFor(job, jobTrips = []) {
  if (job.status === 'Pending') return job.requirement || 'Awaiting your response';
  if (job.status === 'Quoted') return 'Awaiting forwarder response';
  if (job.status === 'Cancelled') return 'Job cancelled';
  if (job.status === 'Completed') return 'Job completed';
  const live = jobTrips.filter((t) => t.status !== 'Cancelled');
  if (live.length < (job.trucksRequired || 1)) return `Dispatch ${(job.trucksRequired || 1) - live.length} more truck(s)`;
  return 'Deliver to destination';
}
