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

export function companyPayoutSummary(source) {
  if (source?.currency !== 'NGN') return null;
  return {
    availableToRequest: amount(source.availableToRequest),
    paid: amount(source.totalWithdrawn), processing: amount(source.pendingWithdrawals), failed: amount(source.failedWithdrawals),
  };
}

export function companyPayoutRecord(source) {
  if (!text(source?.id) || !['WITHDRAWAL', 'JOB_PAYMENT'].includes(source.kind)) return null;
  const jobId = text(source.job?.id), jobPayment = source.kind === 'JOB_PAYMENT';
  return {
    id: source.id, reference: text(source.reference) ?? '—', type: source.kind, jobId, tripId: jobId,
    status: statusLabels[source.status] ?? '—', amount: amount(source.net), gross: amount(source.amount), fee: amount(source.fee), feePercent: null,
    destination: jobPayment ? 'Wallet' : 'Bank', paidTo: jobPayment ? 'Trukkas Wallet' : '—',
    requestedOn: jobPayment ? '—' : date(source.createdAt), createdOn: date(source.createdAt), createdAt: timestamp(source.createdAt), paidOn: null,
    items: jobId ? [{ tripId: jobId, jobId, jobNumber: text(source.job.jobNumber) ?? '—', gross: amount(source.amount) }] : [],
    tripCount: jobId ? 1 : null, failureReason: text(source.failureReason) ?? '—', description: text(source.description) ?? '—',
  };
}

export function payoutRecord(source) {
  if (!text(source?.id) || !PAYOUT_TRANSACTION_TYPES.includes(source.type)) return null;
  const jobPayment = source.type !== 'WITHDRAWAL';
  const jobId = text(source.jobId);
  const value = amount(source.amount);
  const receipt = !jobPayment && source.receipt && typeof source.receipt === 'object' && !Array.isArray(source.receipt) ? source.receipt : null;
  // Withdrawal gross/net and dates come from the historical receipt block,
  // never today's bank account or an inferred meaning of transaction.amount.
  return {
    id: source.id, reference: text(source.reference) ?? '—', type: source.type, jobId, tripId: jobId,
    status: statusLabels[source.status] ?? '—',
    amount: jobPayment ? value : amount(receipt?.netAmount), gross: jobPayment ? value : amount(receipt?.grossAmount), fee: jobPayment ? amount(source.fee) : amount(receipt?.feeAmount), feePercent: jobPayment ? null : amount(receipt?.feePercent),
    destination: jobPayment ? 'Wallet' : 'Bank', paidTo: jobPayment ? 'Trukkas Wallet' : text(source.paidTo) ?? '—',
    requestedOn: jobPayment ? '—' : date(receipt?.requestedAt), createdOn: date(source.createdAt), createdAt: timestamp(source.createdAt), paidOn: !jobPayment && timestamp(receipt?.paidAt) ? date(receipt.paidAt) : null,
    // One company job is one trip, per GET /company/trips/{id}.
    items: jobId ? [{ tripId: jobId, jobId, jobNumber: text(source.jobNumber) ?? '—', gross: jobPayment ? value : null }] : [],
    tripCount: jobId ? 1 : null, failureReason: text(receipt?.failureReason) ?? '—', description: text(source.description) ?? text(source.label) ?? '—',
  };
}

export function payoutReceiptView(payout, user, trip) {
  const value = payout.amount;
  return {
    kind: 'Payout Receipt', number: payout.id, status: payout.status, issuedOn: payout.paidOn ?? payout.createdOn,
    company: { name: text(user?.businessName) ?? '—', rcNumber: text(user?.cacNumber) ?? '—', address: text(user?.businessAddress) ?? '—', email: text(user?.companyProfile?.companyEmail) ?? '—' },
    meta: [['Payout ID', payout.id], ['Reference', payout.reference], ['Requested On', payout.requestedOn], ['Paid On', payout.paidOn ?? '—'], ['Paid To', payout.paidTo], ['Status', payout.status]],
    lines: [{ description: payout.description, detail: [payout.items[0]?.jobId, text(trip?.origin), text(trip?.destination), text(trip?.truckPlate)].filter(Boolean).join(' · '), amount: value }],
    totals: [
      { label: payout.type === 'WITHDRAWAL' ? 'Withdrawal amount' : 'Gross earnings', amount: payout.gross },
      { label: payout.type === 'WITHDRAWAL' ? `Withdrawal fee (${payout.feePercent ?? '—'}%)` : `Trukkas service fee (${payout.fee === 0 ? '0' : '—'}%)`, amount: payout.fee === null ? null : -payout.fee },
      { label: payout.status === 'Paid' ? 'Net amount paid' : 'Net amount due', amount: payout.amount, strong: true },
    ],
    note: payout.status === 'Failed' ? `Payout failed: ${payout.failureReason}` : 'Thank you for hauling with Trukkas.',
  };
}
