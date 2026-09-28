// Mock API — every function is async and shaped like a real network call
// (await, resolves with the affected record) even though it just reads/writes
// the in-memory db. See HANDOFF.md, "Mock data contract" for what a real
// backend implementation of each function needs to do.
import { seed, patchRow, prependRow, getRow, getSnapshot, setRows } from './db.js';
import { trucks } from './fixtures/trucks.js';
import { drivers } from './fixtures/drivers.js';
import { jobs } from './fixtures/jobs.js';
import { trips } from './fixtures/trips.js';
import { documents } from './fixtures/documents.js';
import { maintenanceRecords } from './fixtures/maintenance.js';
import { payoutRequests } from './fixtures/payouts.js';
import { walletSummary, walletTransactions } from './fixtures/wallet.js';
import { notifications } from './fixtures/notifications.js';
import { supportTickets, faqs } from './fixtures/support.js';
import { reviews, reviewSummary } from './fixtures/reviews.js';
import { myCompany } from './fixtures/companies.js';
import { TRIP_PROGRESS, dispatchSummary, isDriverFree, isOpenTrip, isTruckFree } from '../domain/trips.js';
import { formatDisplayDate, statusFromExpiry } from '../domain/documents.js';
import { SERVICE_FEE_RATE, eligibleTrips, payoutTotals } from '../domain/payouts.js';

seed('trucks', trucks);
seed('drivers', drivers);
seed('jobs', jobs);
seed('trips', trips);
seed('documents', documents);
seed('maintenance', maintenanceRecords);
seed('payoutRequests', payoutRequests);
seed('walletSummary', [walletSummary]);
seed('walletTransactions', walletTransactions);
seed('notifications', notifications);
seed('supportTickets', supportTickets);
seed('faqs', faqs);
seed('reviews', reviews);
seed('reviewSummary', [reviewSummary]);
seed('companyProfile', [myCompany]);

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Fleet -----------------------------------------------------------
export async function setTruckStatus(plate, status) {
  await delay();
  return patchRow('trucks', 'plate', plate, { status });
}

export async function updateTruck(plate, changes) {
  await delay(80);
  return patchRow('trucks', 'plate', plate, changes);
}

/**
 * Registers a vehicle. `documents` are [{ type, name, fileSize, expiryDate, number }]
 * and `photos` [{ label, name, url }] from the Add Vehicle flow; `driverId`
 * optionally assigns an onboarded driver straight away.
 */
export async function addTruck(truck, { documents: docs = [], photos = [], driverId = null } = {}) {
  await delay();
  if (getRow('trucks', 'plate', truck.plate)) throw new Error(`A vehicle with registration ${truck.plate} already exists.`);
  const row = prependRow('trucks', {
    status: 'Active', location: '—', driverId: null, driver: null, driverPhone: null,
    odometer: 0, odometerUpdated: 'Just now', notes: '', remindersEnabled: true,
    specs: {}, photos,
    activityLog: [{ icon: 'truck', tone: 'success', title: 'Vehicle added to fleet', detail: `${docs.length} document(s), ${photos.length} photo(s) uploaded`, time: 'Just now' }],
    ...truck,
  });
  const uploaded = [
    ...docs,
    ...photos.map((p) => ({ type: 'Vehicle Photos', name: `Vehicle Photo (${p.label}) · ${p.name}`, fileSize: p.fileSize, url: p.url })),
  ];
  uploaded.forEach((d) => prependRow('documents', {
    id: 'DOC-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    ownerType: 'vehicle', ownerId: truck.plate, truckPlate: truck.plate, uploadedOn: 'Just now', number: null,
    status: d.type === 'Vehicle Photos' ? 'N/A' : statusFromExpiry(d.expiryDate), expiryDate: d.expiryDate ? formatDisplayDate(d.expiryDate) : '—',
    ...d,
  }));
  if (driverId) return assignDriverToTruck(truck.plate, driverId, { silent: true });
  return row;
}

/**
 * Sets (or clears, with `driverId = null`) the driver of a truck, keeping
 * trucks.driverId and drivers.truckPlate in sync on both sides. A driver moving
 * from another truck leaves that truck without a driver. Blocked while either
 * the truck or the driver is on an open trip.
 */
export async function assignDriverToTruck(plate, driverId, { silent = false } = {}) {
  if (!silent) await delay();
  const truck = getRow('trucks', 'plate', plate);
  if (!truck) throw new Error('Vehicle not found.');
  const openTrips = getSnapshot('trips').filter(isOpenTrip);
  if (openTrips.some((t) => t.truckPlate === plate)) throw new Error(`${plate} is on an active trip. Change its driver after the trip is completed.`);
  const driver = driverId ? getRow('drivers', 'id', driverId) : null;
  if (driverId && !driver) throw new Error('Driver not found.');
  if (driver && openTrips.some((t) => t.driverId === driver.id)) throw new Error(`${driver.name} is on an active trip.`);

  const log = (list, entry) => [{ time: 'Just now', ...entry }, ...(list || [])];
  if (truck.driverId && truck.driverId !== driverId) {
    const previous = getRow('drivers', 'id', truck.driverId);
    if (previous) patchRow('drivers', 'id', previous.id, {
      truckPlate: null,
      activityLog: log(previous.activityLog, { icon: 'user-minus', tone: 'warning', title: `Removed from ${plate}`, detail: driver ? `Replaced by ${driver.name}` : 'Truck left without a driver' }),
    });
  }
  if (driver?.truckPlate && driver.truckPlate !== plate) {
    const other = getRow('trucks', 'plate', driver.truckPlate);
    if (other) patchRow('trucks', 'plate', other.plate, {
      driverId: null, driver: null, driverPhone: null,
      activityLog: log(other.activityLog, { icon: 'user-minus', tone: 'warning', title: 'Driver reassigned', detail: `${driver.name} moved to ${plate}` }),
    });
  }
  if (driver) patchRow('drivers', 'id', driver.id, {
    truckPlate: plate,
    activityLog: log(driver.activityLog, { icon: 'truck', tone: 'info', title: `Assigned to ${plate}`, detail: truck.makeModel }),
  });
  return patchRow('trucks', 'plate', plate, {
    driverId: driver?.id || null, driver: driver?.name || null, driverPhone: driver?.phone || null,
    activityLog: log(truck.activityLog, driver
      ? { icon: 'user-check', tone: 'orange', title: 'Assigned to a driver', detail: driver.name }
      : { icon: 'user-minus', tone: 'warning', title: 'Driver removed', detail: truck.driver || '' }),
  });
}

export async function addTruckActivity(plate, entry) {
  await delay(60);
  const truck = getRow('trucks', 'plate', plate);
  if (!truck) return null;
  return patchRow('trucks', 'plate', plate, {
    activityLog: [{ time: 'Just now', ...entry }, ...(truck.activityLog || [])],
  });
}

// ---- Drivers ---------------------------------------------------------
export async function setDriverStatus(id, status) {
  await delay();
  return patchRow('drivers', 'id', id, { status });
}

export async function addDriver(driver) {
  await delay();
  return prependRow('drivers', {
    status: 'Available', truckPlate: null, tripsCompleted: 0, rating: null, reviewCount: 0,
    joined: 'Just now', kyc: 'Pending', ...driver,
  });
}

export async function updateDriver(id, changes) {
  await delay(80);
  return patchRow('drivers', 'id', id, changes);
}

// ---- Jobs (marketplace + bidding) --------------------------------------
export async function placeBid(jobId, amount, message = '') {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  if (!job || job.status !== 'Pending') throw new Error('This job is no longer open for bidding.');
  return patchRow('jobs', 'id', jobId, {
    status: 'Quoted',
    myBid: { amount: Number(amount), message, submittedAt: 'Just now' },
  });
}

export async function withdrawBid(jobId) {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  if (!job || job.status !== 'Quoted') return job;
  return patchRow('jobs', 'id', jobId, { status: 'Pending', myBid: null });
}

export async function toggleSaveJob(jobId) {
  await delay(40);
  const job = getRow('jobs', 'id', jobId);
  if (!job) return null;
  return patchRow('jobs', 'id', jobId, { saved: !job.saved });
}

export async function cancelJob(jobId, reason = '') {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  if (!job) return null;
  getSnapshot('trips').filter((t) => t.jobId === jobId && isOpenTrip(t)).forEach((t) => closeTrip(t, 'Cancelled', reason || 'Job cancelled.'));
  return patchRow('jobs', 'id', jobId, { status: 'Cancelled' });
}

// ---- Trips (dispatch + execution) ---------------------------------------
// A won job needs `trucksRequired` trips; each dispatch creates one trip.
// Assigning reserves the truck and driver; pickup puts them "On Trip";
// completing or cancelling frees them again.
let tripSeq = 45;

export async function assignTruckToJob(jobId, plate, driverId) {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  const truck = getRow('trucks', 'plate', plate);
  const driver = getRow('drivers', 'id', driverId);
  if (!job || !truck || !driver) throw new Error('Job, truck, or driver not found.');
  if (job.status !== 'In Progress') throw new Error('Trucks can only be dispatched on a won job.');
  const { remaining, dispatched, required } = dispatchSummary(job, getSnapshot('trips').filter((t) => t.jobId === jobId));
  if (remaining <= 0) throw new Error(`All ${required} trucks for this job are already dispatched.`);
  if (!isTruckFree(truck, getSnapshot('trips'))) throw new Error(`${plate} is not currently available.`);
  if (!isDriverFree(driver, getSnapshot('trips'))) throw new Error(`${driver.name} is not currently available.`);
  const tripId = `TRP-${String(tripSeq++).padStart(4, '0')}`;
  return prependRow('trips', {
    id: tripId, jobId, truckPlate: plate, trailer: null, driverId, driverName: driver.name, driverPhone: driver.phone,
    status: 'Assigned', delayed: false, progress: TRIP_PROGRESS.Assigned, currentLocation: truck.location || job.origin,
    lastUpdated: 'Just now', speedKmh: 0, pickupDate: job.pickupDate, pickupTime: '', deliveryDate: job.deliveryDate,
    stageDates: { Assigned: 'Today' },
    timeline: [{ title: 'Trip Assigned', date: 'Today', time: 'Just now', detail: `Truck ${dispatched + 1} of ${required}: ${plate} (${driver.name}).`, state: 'done', icon: 'file-text' }],
    documents: [], notes: [], costs: [], messages: [], issues: [],
  });
}

function patchTrip(tripId, changes) {
  return patchRow('trips', 'id', tripId, changes);
}

function syncJobCompletion(jobId) {
  const job = getRow('jobs', 'id', jobId);
  if (!job || job.status !== 'In Progress') return;
  const { completed, required } = dispatchSummary(job, getSnapshot('trips').filter((t) => t.jobId === jobId));
  if (completed >= required) patchRow('jobs', 'id', jobId, { status: 'Completed' });
}

function closeTrip(trip, status, detail) {
  if (trip.truckPlate && getRow('trucks', 'plate', trip.truckPlate)?.status === 'On Trip') patchRow('trucks', 'plate', trip.truckPlate, { status: 'Active' });
  if (trip.driverId && getRow('drivers', 'id', trip.driverId)?.status === 'On Trip') patchRow('drivers', 'id', trip.driverId, { status: 'Available' });
  const settled = trip.timeline.map((item) => (item.state === 'active' ? { ...item, state: 'done' } : item)).filter((item) => item.state !== 'pending');
  return patchTrip(trip.id, {
    status,
    delayed: false,
    progress: status === 'Completed' ? 100 : trip.progress,
    lastUpdated: 'Just now',
    stageDates: status === 'Completed' ? { ...trip.stageDates, Completed: 'Today' } : trip.stageDates,
    timeline: [...settled, {
      title: status === 'Completed' ? 'Trip Completed' : 'Trip Cancelled', date: 'Today', time: 'Just now', detail,
      state: status === 'Completed' ? 'done' : 'cancelled', icon: status === 'Completed' ? 'circle-check' : 'ban',
    }],
  });
}

export async function updateTripStatus(tripId, status) {
  await delay(80);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  if (status === 'Completed') {
    const updated = closeTrip(trip, 'Completed', 'Delivery confirmed. Trip closed.');
    syncJobCompletion(trip.jobId);
    return updated;
  }
  if (status === 'Picked Up') {
    if (trip.truckPlate) patchRow('trucks', 'plate', trip.truckPlate, { status: 'On Trip' });
    if (trip.driverId) patchRow('drivers', 'id', trip.driverId, { status: 'On Trip', truckPlate: trip.truckPlate });
  }
  const done = trip.timeline.map((item) => (item.state === 'active' ? { ...item, state: 'done' } : item));
  const firstPending = done.findIndex((item) => item.state === 'pending');
  const entry = { title: status, date: 'Today', time: 'Just now', detail: `Trip status updated to ${status}.`, state: 'active', icon: status === 'At Destination' ? 'map-pin' : status === 'Picked Up' ? 'package' : 'truck' };
  const timeline = firstPending < 0 ? [...done, entry] : [...done.slice(0, firstPending), entry, ...done.slice(firstPending)];
  return patchTrip(tripId, {
    status,
    progress: TRIP_PROGRESS[status] ?? trip.progress,
    lastUpdated: 'Just now',
    stageDates: { ...trip.stageDates, [status]: 'Today' },
    timeline,
  });
}

export async function cancelTrip(tripId, reason = '') {
  await delay();
  const trip = getRow('trips', 'id', tripId);
  if (!trip || !isOpenTrip(trip)) return trip;
  return closeTrip(trip, 'Cancelled', reason || 'Cancelled by fleet manager.');
}

export async function updateTripLocation(tripId, location) {
  await delay(80);
  return patchTrip(tripId, { currentLocation: location, lastUpdated: 'Just now' });
}

export async function reportTripIssue(tripId, { type, details }) {
  await delay(90);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  const issue = { type, details, time: 'Just now' };
  return patchTrip(tripId, {
    issues: [issue, ...trip.issues],
    delayed: trip.delayed || ['Delay', 'Breakdown', 'Accident', 'Checkpoint / Security'].includes(type),
    notes: [...trip.notes, { author: 'You', time: 'Just now', body: `Issue reported (${type}): ${details}` }],
  });
}

export async function addTripNote(tripId, body) {
  await delay(80);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  return patchTrip(tripId, { notes: [...trip.notes, { author: 'You', time: 'Just now', body }] });
}

export async function sendTripMessage(tripId, body) {
  await delay(80);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  return patchTrip(tripId, { messages: [...trip.messages, { author: 'You', role: 'You', time: 'Just now', body }] });
}

export async function uploadTripDocument(tripId, name) {
  await delay(120);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  const exists = trip.documents.some((d) => d.name === name);
  const documents = exists
    ? trip.documents.map((d) => (d.name === name ? { ...d, status: 'Uploaded', uploadedOn: 'Just now', size: d.size || '—' } : d))
    : [...trip.documents, { name, status: 'Uploaded', uploadedOn: 'Just now', kind: 'doc', size: '—' }];
  return patchTrip(tripId, { documents });
}

export async function addTripCost(tripId, cost) {
  await delay(80);
  const trip = getRow('trips', 'id', tripId);
  if (!trip) return null;
  return patchTrip(tripId, {
    costs: [...trip.costs, { id: `C${trip.costs.length + 1}-${Date.now()}`, date: 'Today', ...cost, amount: Number(cost.amount) }],
  });
}

// ---- Documents ---------------------------------------------------------
/**
 * Uploads a compliance document for an owner: { ownerType: 'company'|'vehicle'|'driver',
 * ownerId, type, name, fileSize, expiryDate (YYYY-MM-DD), number }. Sensitive
 * numbers must already be masked by the caller. New uploads start as
 * 'Pending Review' (or Expiring Soon / Expired from the expiry date).
 */
export async function createDocument(draft) {
  await delay(90);
  return prependRow('documents', {
    id: 'DOC-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    uploadedOn: 'Just now', fileSize: '—', number: null,
    truckPlate: draft.ownerType === 'vehicle' ? draft.ownerId : undefined,
    ...draft,
    status: draft.status || statusFromExpiry(draft.expiryDate),
    expiryDate: draft.expiryDate ? formatDisplayDate(draft.expiryDate) : '—',
  });
}

export async function updateDocument(id, changes) {
  await delay(70);
  return patchRow('documents', 'id', id, changes);
}

export async function deleteDocument(id) {
  await delay(70);
  setRows('documents', getSnapshot('documents').filter((d) => d.id !== id));
}

// ---- Maintenance ---------------------------------------------------------
export async function createMaintenance(draft) {
  await delay(100);
  const id = `MTN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  if (draft.truckPlate) setTruckStatus(draft.truckPlate, 'In Maintenance');
  return prependRow('maintenance', {
    id, status: 'Upcoming', cost: 0, nextDue: null, ...draft,
  });
}

export async function updateMaintenance(id, changes) {
  await delay(80);
  const updated = patchRow('maintenance', 'id', id, changes);
  if (changes.status === 'Completed' && updated?.truckPlate) setTruckStatus(updated.truckPlate, 'Active');
  return updated;
}

// ---- Wallet & Payouts ---------------------------------------------------
export async function requestWithdrawal(amount) {
  await delay();
  const summary = getSnapshot('walletSummary')[0];
  if (amount > summary.balance) throw new Error('Withdrawal amount exceeds available balance.');
  setRows('walletSummary', [{ ...summary, balance: summary.balance - amount }]);
  return prependRow('walletTransactions', {
    id: `TXN-${Math.floor(Math.random() * 9000) + 1000}`,
    type: 'Debit', desc: `Withdrawal to ${summary.bankAccount.bankName} ••${summary.bankAccount.last4}`,
    amount: -amount, date: 'Just now', status: 'Processing', balanceAfter: summary.balance - amount,
  });
}

let payoutSeq = 49;

/** Requests a payout for completed trips not yet covered by another payout. */
export async function requestPayout(tripIds, destination = 'Bank') {
  await delay();
  const available = eligibleTrips(getSnapshot('trips'), getSnapshot('jobs'), getSnapshot('payoutRequests'));
  const items = available.filter((row) => tripIds.includes(row.trip.id))
    .map((row) => ({ tripId: row.trip.id, jobId: row.trip.jobId, gross: row.gross }));
  if (items.length === 0) throw new Error('Select at least one completed trip that has not been paid out.');
  const summary = getSnapshot('walletSummary')[0];
  const { gross, fee, net } = payoutTotals(items);
  const payout = prependRow('payoutRequests', {
    id: `PYT-2026-${String(payoutSeq++).padStart(4, '0')}`,
    items, jobId: items[0].jobId, tripId: items[0].tripId, gross, fee, amount: net, feeRate: SERVICE_FEE_RATE,
    status: 'Requested', method: destination === 'Wallet' ? 'Trukkas Wallet' : 'Bank Transfer', destination,
    bankLast4: summary.bankAccount.last4, requestedOn: 'Just now', paidOn: null,
    reference: `TRK-PO-${Math.floor(100000 + Math.random() * 900000)}`,
  });
  setRows('walletSummary', [{ ...summary, pendingPayout: summary.pendingPayout + net }]);
  return payout;
}

// ---- Notifications -------------------------------------------------------
export async function markNotificationRead(id) {
  await delay(50);
  return patchRow('notifications', 'id', id, { read: true });
}

export async function markAllNotificationsRead() {
  await delay(60);
  setRows('notifications', getSnapshot('notifications').map((row) => ({ ...row, read: true })));
}

export async function deleteNotification(id) {
  await delay(60);
  setRows('notifications', getSnapshot('notifications').filter((row) => row.id !== id));
}

// ---- Support ---------------------------------------------------------
export async function createSupportTicket(draft) {
  await delay(100);
  return prependRow('supportTickets', {
    id: `TCK-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: 'Open', createdAt: 'Just now', updatedAt: 'Just now', messages: [],
    ...draft,
  });
}

/** `attachments`: [{ name, size, type, url }] — url is a local object URL in the prototype. */
export async function replyToTicket(id, body, attachments = []) {
  await delay(90);
  const ticket = getRow('supportTickets', 'id', id);
  if (!ticket) return null;
  return patchRow('supportTickets', 'id', id, {
    updatedAt: 'Just now',
    status: ticket.status === 'Resolved' ? 'Open' : ticket.status,
    messages: [...ticket.messages, { author: 'You', role: 'You', time: 'Just now', agent: false, body, attachments }],
  });
}

// ---- Company Settings ---------------------------------------------------
export async function updateCompanyProfile(changes) {
  await delay(120);
  return patchRow('companyProfile', 'id', myCompany.id, changes);
}
