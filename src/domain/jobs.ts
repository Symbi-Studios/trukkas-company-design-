// Pure helpers for the job marketplace and the company's won jobs. A job is the
// forwarder's booking. One bid covers the whole job (all its trucks); after award
// the lead driver runs the trip and each container / rack is given to a driver.
import { validMoneyAmount } from './money';
// The platform classifies cargo only as containerised or break-bulk (General Cargo is break-bulk).
export const JOB_CATEGORIES = ['Container', 'Break-bulk'];
export const MIN_BID_AMOUNT = 1000;

/** `bounds` = [min, max] the API allows for this job (the max is the bid cap); either may be null. */
export function getBidValidationError(amount: unknown, message = '', bounds: [number | null, number | null] = [null, null]) {
  const value = typeof amount === 'string' && amount.trim() ? Number(amount) : typeof amount === 'number' ? amount : NaN;
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER || value < MIN_BID_AMOUNT) {
    return 'Enter a valid bid amount of at least ₦1,000.';
  }
  const [low, high] = bounds ?? [];
  const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
  if (typeof low === 'number' && value < low) return `The lowest bid allowed on this job is ${naira(low)}.`;
  if (typeof high === 'number' && value > high) return `The highest bid allowed on this job is ${naira(high)}.`;
  if (!validMoneyAmount(amount)) return 'Enter an amount with at most two decimal places.';
  if (typeof message !== 'string' || message.length > 500) return 'Enter a message of 500 characters or fewer.';
  return null;
}

export const JOB_TYPES = [
  { value: 'Port-to-Port', description: 'Pickup and delivery are both port terminals.' },
  { value: 'Port-to-Destination', description: 'Pickup at a port, delivery to the consignee’s location.' },
];

export function hasCargoPhotos(job: JobView | null | undefined) {
  return (job?.cargoPhotos?.length ?? 0) > 0;
}

export const JOB_SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'budget', label: 'Highest Offer' },
  { value: 'pickup', label: 'Earliest TDO Date' },
];

const JOB_STATUS_TONE: Record<string, 'warning' | 'purple' | 'info' | 'success' | 'danger'> = {
  Pending: 'warning',
  Quoted: 'purple',
  'In Progress': 'info',
  Completed: 'success',
  Cancelled: 'danger',
};

export function jobStatusTone(status: string) {
  return JOB_STATUS_TONE[status] || 'neutral';
}

export function jobTitle(job: JobView | null | undefined) {
  return job?.title || `${job?.cargoType} (${job?.equipment})`;
}

/** Marketplace listing: requests still open, including ones we've already bid on. */
export function isMarketplaceJob(job: JobView) {
  return job.status === 'Pending' || job.status === 'Quoted';
}

export function isBiddable(job: JobView) {
  return job.status === 'Pending';
}

/** Per-truck rate we're paid: our accepted bid, else the posted budget. */
export function jobRate(job: JobView | null | undefined) {
  return job?.myBid?.amount ?? job?.budget ?? 0;
}

export function closesInLabel(days: number | null | undefined) {
  if (days == null) return null;
  if (days <= 0) return 'Closes today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function closesInTone(days: number | null | undefined) {
  if (days == null) return 'var(--tk-ink-400)';
  return days <= 1 ? 'var(--tk-danger)' : 'var(--tk-success)';
}

export function suggestedBidRange(job: JobView & { budget: number }) {
  const round = (n: number) => Math.round(n / 50000) * 50000;
  return [round(job.budget * 0.9), round(job.budget * 1.1)];
}

export function nextStepFor(job: JobView, jobTrips: Array<{ status: string }> = []) {
  if (job.status === 'Pending') return job.requirement || 'Awaiting your response';
  if (job.status === 'Quoted') return 'Awaiting forwarder response';
  if (job.status === 'Cancelled') return 'Job cancelled';
  if (job.status === 'Completed') return 'Job completed';
  const live = jobTrips.filter((t) => t.status !== 'Cancelled');
  if (live.length < (job.trucksRequired || 1)) return `Dispatch ${(job.trucksRequired || 1) - live.length} more truck(s)`;
  return 'Deliver to destination';
}

interface JobView {
  category?: string; photos?: number; cargoPhotos?: unknown[]; title?: string; cargoType?: string; equipment?: string;
  status?: string; myBid?: { amount?: number } | null; budget?: number;
  requirement?: string; trucksRequired?: number;
}
