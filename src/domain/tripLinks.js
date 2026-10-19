import { TRIP_SECTIONS } from './trips.js';

// Fixed exported routes support backend IDs that are unknown at build time.
export function tripDetailHref(id, section = 'overview') {
  const tab = TRIP_SECTIONS.some((item) => item.value === section) ? section : 'overview';
  return `/trips/detail?tripId=${encodeURIComponent(id)}${tab === 'overview' ? '' : `&section=${tab}`}`;
}
