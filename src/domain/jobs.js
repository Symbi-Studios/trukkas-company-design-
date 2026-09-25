// Pure status/trip helpers for the company's own job pipeline. Simpler than the
// retired admin dispatch model: one company, one truck+driver per trip, no
// cross-company assignment validation.
export const JOB_TABS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'Pending', label: 'Job Requests' },
  { value: 'Quoted', label: 'Quotes' },
  { value: 'In Progress', label: 'Active Trips' },
  { value: 'Completed', label: 'Completed Trips' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const TRIP_STAGES = ['Assigned', 'Picked Up', 'In Transit', 'At Destination', 'Completed'];

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

const TRIP_STATUS_TONE = {
  Assigned: 'info',
  'Picked Up': 'info',
  'In Transit': 'info',
  'At Destination': 'warning',
  Completed: 'success',
  Cancelled: 'danger',
};

export function tripStatusTone(status) {
  return TRIP_STATUS_TONE[status] || 'neutral';
}

export function nextStepFor(job) {
  if (job.status === 'Pending') return job.requirement || 'Awaiting your response';
  if (job.status === 'Quoted') return 'Awaiting forwarder response';
  if (job.status === 'Cancelled') return 'Job cancelled';
  if (job.status === 'Completed') return 'Job completed';
  if (job.status === 'In Progress') {
    const stage = job.trip?.status;
    if (stage === 'At Destination') return 'Confirm delivery';
    return 'Deliver to destination';
  }
  return '—';
}

export function isBiddable(job) {
  return job.status === 'Pending';
}
