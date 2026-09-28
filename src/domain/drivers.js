// Pure driver helpers: performance metrics and an activity timeline built from
// the driver's own log plus their trips. Figures the platform would compute
// server-side (`onTimeRate`, `safetyScore`) come straight from the record.
import { jobRate } from './jobs.js';

export const DRIVER_STATUS_TONE = { Available: 'success', 'On Trip': 'info', 'Off Duty': 'neutral' };

const when = (text) => {
  if (!text || /just now/i.test(text)) return Date.now();
  const t = new Date(String(text).replace(/,? \d{1,2}:\d{2}.*$/, '').replace(' · ', ' ')).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** `trips` must be joined with their job (see trips.js `withJobs`). */
export function driverPerformance(driver, trips) {
  const completed = trips.filter((t) => t.status === 'Completed');
  const cancelled = trips.filter((t) => t.status === 'Cancelled');
  const closed = completed.length + cancelled.length;
  return {
    rating: driver.rating,
    reviewCount: driver.reviewCount,
    tripsCompleted: driver.tripsCompleted,
    onTimeRate: driver.onTimeRate ?? null,
    safetyScore: driver.safetyScore ?? null,
    completionRate: closed ? Math.round((completed.length / closed) * 100) : null,
    distanceKm: completed.reduce((sum, t) => sum + (t.job?.distanceKm || 0), 0),
    earnings: completed.reduce((sum, t) => sum + jobRate(t.job), 0),
    incidents: trips.reduce((sum, t) => sum + (t.issues?.length || 0), 0),
    activeTrip: trips.find((t) => t.status !== 'Completed' && t.status !== 'Cancelled') || null,
  };
}

/** Newest-first activity: assignments/log entries, trip milestones and reported issues. */
export function driverActivity(driver, trips) {
  const events = [
    ...(driver.activityLog || []).map((a) => ({ title: a.title, description: a.detail, time: a.time, icon: a.icon, tone: a.tone })),
    ...trips.flatMap((t) => {
      const route = t.job ? `${t.job.origin.split(',')[0]} → ${t.job.destination.split(',')[0]}` : '';
      const first = t.timeline[0];
      const last = t.timeline[t.timeline.length - 1];
      const rows = [{ title: `Assigned to ${t.id}`, description: `${t.truckPlate} · ${route}`, time: first?.date, icon: 'route', tone: 'info' }];
      if (t.status === 'Completed') rows.push({ title: `Completed ${t.id}`, description: `Delivered · ${route}`, time: last?.date, icon: 'circle-check', tone: 'success' });
      if (t.status === 'Cancelled') rows.push({ title: `${t.id} cancelled`, description: last?.detail, time: last?.date, icon: 'ban', tone: 'danger' });
      (t.issues || []).forEach((issue) => rows.push({ title: `${issue.type} reported on ${t.id}`, description: issue.details, time: issue.time, icon: 'triangle-alert', tone: 'warning' }));
      return rows;
    }),
  ];
  return events.sort((a, b) => when(b.time) - when(a.time));
}

export function ratingBreakdown(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars], pct: reviews.length ? Math.round((counts[stars] / reviews.length) * 100) : 0 }));
}
