// Pure trip helpers. A trip is one truck + driver carrying out (part of) a job;
// `trip.jobId` links back to the job, and a job may have many trips.
export const TRIP_STAGES = ['Assigned', 'Picked Up', 'In Transit', 'At Destination', 'Completed'];

export const TRIP_PROGRESS = { Assigned: 10, 'Picked Up': 35, 'In Transit': 60, 'At Destination': 90, Completed: 100 };

export const TRIP_TABS = [
  { value: 'all', label: 'All Trips' },
  { value: 'Upcoming', label: 'Assigned' },
  { value: 'Active', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const TRIP_SECTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'documents', label: 'Documents' },
  { value: 'costs', label: 'Costs' },
  { value: 'notes', label: 'Notes' },
  { value: 'communication', label: 'Communication' },
];

export const TRIP_ISSUE_TYPES = ['Delay', 'Breakdown', 'Accident', 'Cargo Damage', 'Checkpoint / Security', 'Documentation', 'Other'];

export const TRIP_COST_CATEGORIES = ['Fuel', 'Tolls & Levies', 'Driver Allowance', 'Port Charges', 'Repairs', 'Other'];

/** Tab bucket: Upcoming (labelled "Assigned": not picked up yet), Active (on the road), Completed, Cancelled. */
export function tripPhase(trip) {
  if (!trip) return null;
  if (trip.status === 'Cancelled') return 'Cancelled';
  if (trip.status === 'Completed') return 'Completed';
  if (trip.status === 'Assigned') return 'Upcoming';
  return 'Active';
}

export function isOpenTrip(trip) {
  return trip.status !== 'Completed' && trip.status !== 'Cancelled';
}

/** Dispatchable: an active truck head / available driver not already on an open trip. */
export function isTruckFree(truck, trips) {
  return truck.status === 'Active' && truck.vehicleClass !== 'Trailer'
    && !trips.some((t) => t.truckPlate === truck.plate && isOpenTrip(t));
}

export function isDriverFree(driver, trips) {
  return driver.status === 'Available' && !trips.some((t) => t.driverId === driver.id && isOpenTrip(t));
}

const STATUS_TONE = {
  Assigned: 'info', 'Picked Up': 'info', 'In Transit': 'info', 'At Destination': 'warning', Completed: 'success', Cancelled: 'danger',
};

/** Headline status shown in badges: the trip's stage, or Delayed for an active trip running behind. */
export function tripHealth(trip) {
  if (!trip) return null;
  if (tripPhase(trip) === 'Active' && trip.delayed) return 'Delayed';
  return trip.status;
}

export function tripHealthTone(label) {
  return label === 'Delayed' ? 'danger' : STATUS_TONE[label] || 'neutral';
}

export function tripStatusTone(status) {
  return STATUS_TONE[status] || 'neutral';
}

export function nextTripStage(trip) {
  const index = TRIP_STAGES.indexOf(trip.status);
  if (index < 0 || index >= TRIP_STAGES.length - 1) return null;
  return TRIP_STAGES[index + 1];
}

/** Joins each trip with its parent job so screens can show cargo and route. */
export function withJobs(trips, jobs) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return trips.map((trip) => ({ ...trip, job: byId.get(trip.jobId) || null }));
}

export function tripsForJob(trips, jobId) {
  return trips.filter((trip) => trip.jobId === jobId);
}

/** How far through dispatch a won job is. Cancelled trips free their slot. */
export function dispatchSummary(job, jobTrips) {
  const live = jobTrips.filter((t) => t.status !== 'Cancelled');
  const required = job.trucksRequired || 1;
  return {
    required,
    dispatched: live.length,
    completed: live.filter((t) => t.status === 'Completed').length,
    remaining: Math.max(0, required - live.length),
  };
}

export function tripCostTotal(trip) {
  return (trip.costs || []).reduce((sum, cost) => sum + (cost.amount || 0), 0);
}

export function estimateDuration(km) {
  if (!km) return '—';
  if (km < 200) return 'Same day';
  const low = Math.max(1, Math.round(km / 500));
  return `${low} – ${low + 1} days`;
}

export function shortPlace(location = '') {
  return location.split(',')[0].replace(/ Port$/, '').trim();
}
