import { NAV } from './nav.js';
import { documents } from './mock/fixtures/documents.js';
import { drivers } from './mock/fixtures/drivers.js';
import { jobs } from './mock/fixtures/jobs.js';
import { notifications } from './mock/fixtures/notifications.js';
import { payoutRequests } from './mock/fixtures/payouts.js';
import { supportTickets } from './mock/fixtures/support.js';
import { trucks } from './mock/fixtures/trucks.js';
import { plateSlug } from './domain/vehicles.js';

const routeValues = {
  screen: [...NAV.flatMap((group) => group.items.map((item) => item.id)), 'profile', 'signed-out'],
  documentId: documents.map((item) => item.id),
  driverId: drivers.map((item) => item.id),
  jobId: jobs.map((item) => item.id),
  notificationId: notifications.map((item) => item.id),
  payoutId: payoutRequests.map((item) => item.id),
  ticketId: supportTickets.map((item) => item.id),
  vehicleId: trucks.map((item) => plateSlug(item.plate)),
};

export function staticParamsFor(key) {
  return [...new Set(routeValues[key] || [])].map((value) => ({ [key]: String(value) }));
}
