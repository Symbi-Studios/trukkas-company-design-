// Payouts: Trukkas releasing trip earnings to the company. A payout covers one
// or more completed trips (`items`), each at the job's per-truck rate (gross);
// Trukkas keeps a service fee and pays the net. A trip can be in at most one
// non-failed payout. The fee rate here is a prototype assumption — confirm the
// real commission model with the backend before relying on it.
export const SERVICE_FEE_RATE = 0.05;

const PAYOUT_STATUS_TONE = {
  Paid: 'success',
  Processing: 'info',
  Requested: 'warning',
  Failed: 'danger',
};

export function payoutStatusTone(status) {
  return PAYOUT_STATUS_TONE[status] || 'neutral';
}

export function payoutTotals(items, feeRate = SERVICE_FEE_RATE) {
  const gross = items.reduce((sum, item) => sum + (item.gross || 0), 0);
  const fee = Math.round(gross * feeRate);
  return { gross, fee, net: gross - fee };
}

export function summarizePayouts(payouts) {
  const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
  return {
    totalEarned: sum(payouts.filter((p) => p.status !== 'Failed')),
    paid: sum(payouts.filter((p) => p.status === 'Paid')),
    processing: sum(payouts.filter((p) => p.status === 'Processing' || p.status === 'Requested')),
    failed: sum(payouts.filter((p) => p.status === 'Failed')),
  };
}

/** Trip id → the non-failed payout that covers it. */
export function payoutByTrip(payouts) {
  const map = new Map();
  payouts.filter((p) => p.status !== 'Failed').forEach((p) => p.items.forEach((item) => map.set(item.tripId, p)));
  return map;
}

/** Completed trips not yet covered by a payout, with their gross earnings. */
export function eligibleTrips(trips, jobs, payouts) {
  const covered = payoutByTrip(payouts);
  const byJob = new Map(jobs.map((j) => [j.id, j]));
  return trips
    .filter((t) => t.status === 'Completed' && !covered.has(t.id))
    .map((t) => {
      const job = byJob.get(t.jobId);
      return { trip: t, job, gross: job?.myBid?.amount ?? job?.budget ?? 0 };
    });
}

/** Per-trip earnings for one job, with the payout that settled each trip. */
export function jobEarnings(job, jobTrips, payouts) {
  const covered = payoutByTrip(payouts);
  const rate = job.myBid?.amount ?? job.budget ?? 0;
  const rows = jobTrips
    .filter((t) => t.status === 'Completed')
    .map((t) => ({ trip: t, gross: rate, payout: covered.get(t.id) || null }));
  const totals = payoutTotals(rows);
  return {
    rows,
    totals,
    paid: rows.filter((r) => r.payout?.status === 'Paid').reduce((s, r) => s + r.gross, 0),
    unpaid: rows.filter((r) => !r.payout).reduce((s, r) => s + r.gross, 0),
  };
}

const route = (job) => (job ? `${job.origin.split(',')[0]} → ${job.destination.split(',')[0]}` : '');

/** Receipt view model shared by the on-screen receipt and the PDF download. */
export function payoutReceipt(payout, { trips = [], jobs = [], company, bank }) {
  const tripById = new Map(trips.map((t) => [t.id, t]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  return {
    kind: 'Payout Receipt',
    number: payout.id,
    status: payout.status,
    issuedOn: payout.paidOn || payout.requestedOn,
    company,
    meta: [
      ['Payout ID', payout.id],
      ['Reference', payout.reference || '—'],
      ['Requested On', payout.requestedOn],
      ['Paid On', payout.paidOn || '—'],
      ['Paid To', payout.destination === 'Wallet' ? 'Trukkas Wallet' : `${bank?.bankName || payout.method} •••• ${payout.bankLast4}`],
      ['Status', payout.status],
    ],
    lines: payout.items.map((item) => {
      const trip = tripById.get(item.tripId);
      const job = jobById.get(item.jobId);
      return {
        description: `${item.tripId} · ${job?.title || job?.cargoType || 'Trip'}`,
        detail: [item.jobId, route(job), trip?.truckPlate, trip?.deliveryDate && `Delivered ${trip.deliveryDate}`].filter(Boolean).join(' · '),
        amount: item.gross,
      };
    }),
    totals: [
      { label: 'Gross earnings', amount: payout.gross },
      { label: `Trukkas service fee (${Math.round((payout.feeRate ?? SERVICE_FEE_RATE) * 100)}%)`, amount: -payout.fee },
      { label: payout.status === 'Paid' ? 'Net amount paid' : 'Net amount due', amount: payout.amount, strong: true },
    ],
    note: payout.status === 'Failed' ? `Payout failed: ${payout.failureReason || 'contact support.'}` : 'Thank you for hauling with Trukkas.',
  };
}

export function jobReceipt(job, earnings, { company, poster }) {
  return {
    kind: 'Job Earnings Statement',
    number: `EST-${job.id}`,
    status: job.status,
    issuedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    company,
    meta: [
      ['Job ID', job.id],
      ['Job', job.title || job.cargoType],
      ['Route', `${job.origin} → ${job.destination}`],
      ['Forwarder', poster?.name || '—'],
      ['Rate per truck', null, job.myBid?.amount ?? job.budget],
      ['Trucks delivered', `${earnings.rows.length} of ${job.trucksRequired || 1}`],
    ],
    lines: earnings.rows.map((row) => ({
      description: `${row.trip.id} · ${row.trip.truckPlate}${row.trip.driverName ? ` (${row.trip.driverName})` : ''}`,
      detail: [`Delivered ${row.trip.deliveryDate}`, row.payout ? `${row.payout.id} · ${row.payout.status}` : 'Not yet paid out'].join(' · '),
      amount: row.gross,
    })),
    totals: [
      { label: 'Gross earnings', amount: earnings.totals.gross },
      { label: `Trukkas service fee (${Math.round(SERVICE_FEE_RATE * 100)}%)`, amount: -earnings.totals.fee },
      { label: 'Net earnings', amount: earnings.totals.net, strong: true },
    ],
    note: earnings.unpaid ? 'Trips marked "Not yet paid out" can be included in your next payout request.' : 'All delivered trips on this job have been paid out or are processing.',
  };
}
