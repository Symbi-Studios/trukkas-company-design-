// Mock API — every function is async and shaped like a real network call
// (await, resolves with the affected record) even though it just reads/writes
// the in-memory db. See HANDOFF.md, "Mock data contract" for what a real
// backend implementation of each function needs to do.
import { seed, patchRow, prependRow, getRow, getSnapshot, setRows } from './db.js';
import { trucks } from './fixtures/trucks.js';
import { drivers } from './fixtures/drivers.js';
import { jobs } from './fixtures/jobs.js';
import { documents } from './fixtures/documents.js';
import { maintenanceRecords } from './fixtures/maintenance.js';
import { payoutRequests } from './fixtures/payouts.js';
import { walletSummary, walletTransactions } from './fixtures/wallet.js';
import { notifications } from './fixtures/notifications.js';
import { supportTickets, faqs } from './fixtures/support.js';
import { reviews, reviewSummary } from './fixtures/reviews.js';
import { myCompany } from './fixtures/companies.js';

seed('trucks', trucks);
seed('drivers', drivers);
seed('jobs', jobs);
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

export async function addTruck(truck) {
  await delay();
  return prependRow('trucks', {
    status: 'Active', location: '—', driverId: null, driver: null, driverPhone: null,
    odometer: 0, odometerUpdated: 'Just now', activityLog: [], notes: '',
    specs: {}, ...truck,
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

// ---- Jobs & Trips (bidding + dispatch) -------------------------------
let tripSeq = 43;

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

export async function assignTruckToJob(jobId, plate, driverId) {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  const truck = getRow('trucks', 'plate', plate);
  const driver = getRow('drivers', 'id', driverId);
  if (!job || !truck || !driver) throw new Error('Job, truck, or driver not found.');
  if (truck.status !== 'Active') throw new Error(`${plate} is not currently available.`);
  const tripId = `TRP-${String(tripSeq++).padStart(4, '0')}`;
  patchRow('trucks', 'plate', plate, { status: 'On Trip' });
  patchRow('drivers', 'id', driverId, { status: 'On Trip', truckPlate: plate });
  const trip = {
    id: tripId, truckPlate: plate, driverId, driverName: driver.name, driverPhone: driver.phone,
    status: 'Assigned', progress: 0, currentLocation: job.origin, lastUpdated: 'Just now',
    timeline: [{ title: 'Trip Assigned', time: 'Just now', detail: `Trip assigned to ${plate} (${driver.name}).`, state: 'done' }],
    documents: [], notes: [],
  };
  return patchRow('jobs', 'id', jobId, { status: 'In Progress', trip });
}

const TRIP_PROGRESS = { Assigned: 10, 'Picked Up': 35, 'In Transit': 60, 'At Destination': 90, Completed: 100 };

export async function updateTripStatus(jobId, status) {
  await delay(80);
  const job = getRow('jobs', 'id', jobId);
  if (!job?.trip) return null;
  const trip = {
    ...job.trip,
    status,
    progress: TRIP_PROGRESS[status] ?? job.trip.progress,
    lastUpdated: 'Just now',
    timeline: [{ title: status, time: 'Just now', detail: `Trip status updated to ${status}.`, state: status === 'Completed' ? 'done' : 'active' }, ...job.trip.timeline],
  };
  if (status === 'Completed') {
    if (trip.truckPlate) patchRow('trucks', 'plate', trip.truckPlate, { status: 'Active' });
    if (trip.driverId) patchRow('drivers', 'id', trip.driverId, { status: 'Available' });
    return patchRow('jobs', 'id', jobId, { status: 'Completed', trip });
  }
  return patchRow('jobs', 'id', jobId, { trip });
}

export async function addTripNote(jobId, body) {
  await delay(80);
  const job = getRow('jobs', 'id', jobId);
  if (!job?.trip) return null;
  return patchRow('jobs', 'id', jobId, {
    trip: { ...job.trip, notes: [...job.trip.notes, { author: 'You', time: 'Just now', body }] },
  });
}

export async function cancelJob(jobId, reason = '') {
  await delay();
  const job = getRow('jobs', 'id', jobId);
  if (!job) return null;
  if (job.trip?.truckPlate) patchRow('trucks', 'plate', job.trip.truckPlate, { status: 'Active' });
  if (job.trip?.driverId) patchRow('drivers', 'id', job.trip.driverId, { status: 'Available' });
  return patchRow('jobs', 'id', jobId, {
    status: 'Cancelled',
    trip: job.trip ? { ...job.trip, status: 'Cancelled', timeline: [{ title: 'Trip Cancelled', time: 'Just now', detail: reason || 'Cancelled.', state: 'cancelled' }, ...job.trip.timeline] } : null,
  });
}

// ---- Documents ---------------------------------------------------------
export async function createDocument(draft) {
  await delay(90);
  return prependRow('documents', {
    id: 'DOC-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    status: 'Valid', uploadedOn: 'Just now', fileSize: '—',
    ...draft,
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

export async function replyToTicket(id, body) {
  await delay(90);
  const ticket = getRow('supportTickets', 'id', id);
  if (!ticket) return null;
  return patchRow('supportTickets', 'id', id, {
    updatedAt: 'Just now',
    messages: [...ticket.messages, { author: 'You', role: 'You', time: 'Just now', agent: false, body }],
  });
}

// ---- Company Settings ---------------------------------------------------
export async function updateCompanyProfile(changes) {
  await delay(120);
  return patchRow('companyProfile', 'id', myCompany.id, changes);
}
