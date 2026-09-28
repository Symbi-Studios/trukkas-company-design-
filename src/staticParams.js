import { NAV } from './nav.js';
import { documents } from './mock/fixtures/documents.js';
import { drivers } from './mock/fixtures/drivers.js';
import { jobs } from './mock/fixtures/jobs.js';
import { notifications } from './mock/fixtures/notifications.js';
import { payoutRequests } from './mock/fixtures/payouts.js';
import { supportTickets } from './mock/fixtures/support.js';
import { trips } from './mock/fixtures/trips.js';
import { trucks } from './mock/fixtures/trucks.js';
import { plateSlug } from './domain/vehicles.js';
import { TRIP_SECTIONS } from './domain/trips.js';

const routeValues = {
  screen: [...NAV.flatMap((group) => group.items.map((item) => item.id)), 'profile', 'signed-out'],
  documentId: documents.map((item) => item.id),
  driverId: drivers.map((item) => item.id),
  jobId: jobs.map((item) => item.id),
  notificationId: notifications.map((item) => item.id),
  payoutId: payoutRequests.map((item) => item.id),
  ticketId: supportTickets.map((item) => item.id),
  tripId: trips.map((item) => item.id),
  vehicleId: trucks.map((item) => plateSlug(item.plate)),
};

export function staticParamsFor(key) {
  return [...new Set(routeValues[key] || [])].map((value) => ({ [key]: String(value) }));
}

/** Every trip × sub-tab combination for /trips/[tripId]/[section]. */
export function tripSectionParams() {
  return trips.flatMap((trip) => TRIP_SECTIONS
    .filter((section) => section.value !== 'overview')
    .map((section) => ({ tripId: trip.id, section: section.value })));
}
