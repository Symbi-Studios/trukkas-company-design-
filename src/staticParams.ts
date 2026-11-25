import { NAV } from './nav';
import { documents } from './mock/fixtures/documents';
import { drivers } from './mock/fixtures/drivers';
import { jobs } from './mock/fixtures/jobs';
import { notifications } from './mock/fixtures/notifications';
import { payoutRequests } from './mock/fixtures/payouts';
import { supportTickets } from './mock/fixtures/support';
import { guides } from './mock/fixtures/guides';
import { trips } from './mock/fixtures/trips';
import { trucks } from './mock/fixtures/trucks';
import { plateSlug } from './domain/vehicles';
import { TRIP_SECTIONS } from './domain/trips';

const routeValues = {
  screen: [...NAV.flatMap((group) => group.items.map((item) => item.id)), 'profile', 'signed-out'],
  documentId: documents.map((item) => item.id),
  driverId: drivers.map((item) => item.id),
  jobId: jobs.map((item) => item.id),
  notificationId: notifications.map((item) => item.id),
  payoutId: payoutRequests.map((item) => item.id),
  ticketId: supportTickets.map((item) => item.id),
  guideId: guides.map((item) => item.id),
  tripId: trips.map((item) => item.id),
  vehicleId: trucks.map((item) => plateSlug(item.plate)),
};

export function staticParamsFor(key: keyof typeof routeValues) {
  return [...new Set(routeValues[key] || [])].map((value) => ({ [key]: String(value) }));
}

/** Every trip × sub-tab combination for /trips/[tripId]/[section]. */
export function tripSectionParams() {
  return trips.flatMap((trip) => TRIP_SECTIONS
    .filter((section) => section.value !== 'overview')
    .map((section) => ({ tripId: trip.id, section: section.value })));
}
