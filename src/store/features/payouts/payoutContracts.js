export const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const rows = (value) => Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value : null;
export function amount(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= Number.MAX_SAFE_INTEGER ? number : null;
}
export const payoutAmountLabel = (value) => typeof value === 'number' && Number.isFinite(value)
  ? `${value < 0 ? '-' : ''}₦${Math.abs(value).toLocaleString('en-NG')}` : '—';
const timestamp = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
const date = (value) => timestamp(value) ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
export const PAYOUT_TRANSACTION_TYPES = ['ESCROW_RELEASE', 'MOBILIZATION', 'FINAL_PAYMENT', 'WITHDRAWAL'];
const statusLabels = { PENDING: 'Requested', PROCESSING: 'Processing', COMPLETED: 'Paid', FAILED: 'Failed', REVERSED: 'Reversed' };

export function payoutRecord(source) {
  if (!text(source?.id) || !PAYOUT_TRANSACTION_TYPES.includes(source.type)) return null;
  const jobPayment = source.type !== 'WITHDRAWAL';
  const jobId = text(source.jobId);
  const value = amount(source.amount);
  // A company job payment is an escrow credit with no company service fee.
  // Withdrawal transaction.amount is not documented as gross or net: do not
  // label it as either, infer bank snapshots, or borrow today's bank account.
  return {
    id: source.id, reference: text(source.reference) ?? '—', type: source.type, jobId, tripId: jobId,
    status: statusLabels[source.status] ?? '—',
    amount: jobPayment ? value : null, gross: jobPayment ? value : null, fee: amount(source.fee),
    destination: jobPayment ? 'Wallet' : 'Bank', paidTo: jobPayment ? 'Trukkas Wallet' : text(source.paidTo) ?? '—',
    requestedOn: jobPayment ? '—' : date(source.createdAt), createdOn: date(source.createdAt), createdAt: timestamp(source.createdAt), paidOn: null,
    // One company job is one trip, per GET /company/trips/{id}.
    items: jobId ? [{ tripId: jobId, jobId, gross: jobPayment ? value : null }] : [],
    tripCount: jobId ? 1 : null, failureReason: '—', description: text(source.description) ?? text(source.label) ?? '—',
  };
}

export function payoutReceiptView(payout, user, trip) {
  const value = payout.type === 'WITHDRAWAL' ? null : payout.amount;
  return {
    kind: 'Payout Receipt', number: payout.id, status: payout.status, issuedOn: payout.paidOn ?? payout.createdOn,
    company: { name: text(user?.businessName) ?? '—', rcNumber: text(user?.cacNumber) ?? '—', address: text(user?.businessAddress) ?? '—', email: text(user?.companyProfile?.companyEmail) ?? '—' },
    meta: [['Payout ID', payout.id], ['Reference', payout.reference], ['Requested On', payout.requestedOn], ['Paid On', payout.paidOn ?? '—'], ['Paid To', payout.paidTo], ['Status', payout.status]],
    lines: [{ description: payout.description, detail: [payout.items[0]?.jobId, text(trip?.origin), text(trip?.destination), text(trip?.truckPlate)].filter(Boolean).join(' · '), amount: value }],
    totals: [
      { label: 'Gross earnings', amount: payout.gross },
      { label: `Trukkas service fee (${payout.type !== 'WITHDRAWAL' && payout.fee === 0 ? '0' : '—'}%)`, amount: payout.fee === null ? null : -payout.fee },
      { label: payout.status === 'Paid' ? 'Net amount paid' : 'Net amount due', amount: payout.amount, strong: true },
    ],
    note: payout.status === 'Failed' ? 'Payout failed: —' : 'Thank you for hauling with Trukkas.',
  };
}
