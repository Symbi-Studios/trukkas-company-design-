// Payout requests: Trukkas releasing earnings for completed trips. Each payout
// covers one or more trips (`items`, gross at the job's per-truck rate); the
// company receives `amount` (net of the service fee, see domain/payouts.js).
// `jobId`/`tripId` mirror the first item for older callers.
import { SERVICE_FEE_RATE, payoutTotals } from '../../domain/payouts.js';

function payout({ items, ...entry }) {
  const { gross, fee, net } = payoutTotals(items);
  return {
    method: 'Bank Transfer', destination: 'Bank', bankLast4: '4821', paidOn: null, feeRate: SERVICE_FEE_RATE,
    jobId: items[0]?.jobId, tripId: items[0]?.tripId,
    items, gross, fee, amount: net,
    ...entry,
  };
}

export const payoutRequests = [
  payout({ id: 'PYT-2026-0048', items: [{ tripId: 'TRP-0039', jobId: 'TK-2026-000038', gross: 890000 }], status: 'Processing', requestedOn: 'May 31, 2026', reference: 'TRK-PO-771204' }),
  payout({ id: 'PYT-2026-0045', items: [{ tripId: 'TRP-0037', jobId: 'TK-2026-000012', gross: 600000 }], status: 'Paid', requestedOn: 'May 18, 2026', paidOn: 'May 22, 2026', reference: 'TRK-PO-770981' }),
  payout({ id: 'PYT-2026-0041', items: [{ tripId: 'TRP-0036', jobId: 'TK-2026-000028', gross: 470000 }], status: 'Paid', requestedOn: 'May 14, 2026', paidOn: 'May 18, 2026', reference: 'TRK-PO-770844' }),
  payout({ id: 'PYT-2026-0039', items: [{ tripId: 'TRP-0034', jobId: 'TK-2026-000021', gross: 440000 }], status: 'Paid', requestedOn: 'May 7, 2026', paidOn: 'May 12, 2026', reference: 'TRK-PO-770512' }),
  payout({ id: 'PYT-2026-0035', items: [{ tripId: 'TRP-0040', jobId: 'TK-2026-000018', gross: 935000 }], status: 'Paid', requestedOn: 'Apr 29, 2026', paidOn: 'May 3, 2026', reference: 'TRK-PO-770233' }),
  payout({ id: 'PYT-2026-0031', items: [{ tripId: 'TRP-0031', jobId: 'TK-2026-000019', gross: 1230000 }], status: 'Paid', requestedOn: 'Apr 21, 2026', paidOn: 'Apr 25, 2026', reference: 'TRK-PO-769904' }),
  payout({ id: 'PYT-2026-0028', items: [{ tripId: 'TRP-0032', jobId: 'TK-2026-000008', gross: 380000 }], status: 'Failed', requestedOn: 'Apr 10, 2026', failureReason: 'Trip was cancelled before delivery was confirmed.', reference: 'TRK-PO-769610' }),
];
