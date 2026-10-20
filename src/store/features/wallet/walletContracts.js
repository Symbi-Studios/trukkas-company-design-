import { count, dateLabel, earningsView, jobView, number, object, rows, text } from '../jobs/jobContracts.js';
import { PAYOUT_TRANSACTION_TYPES } from '../payouts/payoutContracts.js';

const finite = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const decimal = (value) => {
  const parsed = number(value) ?? (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null);
  return parsed !== null && Number.isFinite(parsed) && parsed <= Number.MAX_SAFE_INTEGER ? parsed : null;
};
const month = (value) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;

export const EMPTY_WALLET = { available: null };
export function walletView(source) {
  const wallet = object(source?.wallet);
  return { available: wallet?.currency === 'NGN' ? decimal(wallet.available) : null };
}

export const EMPTY_WALLET_EARNINGS = { pendingPayout: null, earningsThisMonth: null, earningsLastMonth: null, completedThisMonth: null, change: null, monthlyTrend: null };
export function walletEarningsView(source) {
  const monthly = object(source?.monthly), series = rows(monthly?.series);
  const valid = monthly?.currency === 'NGN';
  const validSeries = valid && series && series.every((item) => month(item.month) && number(item.earnings) !== null && number(item.expenses) !== null)
    && new Set(series.map((item) => item.month)).size === series.length && series.every((item, index) => index === 0 || item.month > series[index - 1].month);
  return {
    pendingPayout: number(source?.wallet?.pendingWithdrawals),
    earningsThisMonth: valid && month(monthly.currentMonth?.month) ? number(monthly.currentMonth.earnings) : null,
    earningsLastMonth: valid && month(monthly.previousMonth?.month) ? number(monthly.previousMonth.earnings) : null,
    completedThisMonth: valid && month(monthly.currentMonth?.month) ? count(monthly.currentMonth.completedTrips) : null,
    change: valid ? finite(monthly.changePercent) : null,
    monthlyTrend: validSeries ? series.map((item) => ({ month: new Intl.DateTimeFormat('en-NG', { month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(`${item.month}-15T12:00:00Z`)), earnings: item.earnings, expenses: item.expenses })) : null,
  };
}

export function walletTransactionView(source) {
  const direction = ({ CREDIT: 'Credit', DEBIT: 'Debit' })[source.direction] ?? '—';
  const amount = decimal(source.amount);
  return {
    id: source.id, reference: text(source.reference), jobId: text(source.jobId), jobNumber: text(source.jobNumber),
    desc: text(source.description) ?? text(source.label) ?? '—', date: dateLabel(source.createdAt), type: direction,
    amount: amount === null || direction === '—' ? null : direction === 'Debit' ? -amount : amount,
    balanceAfter: decimal(source.balanceAfter), receiptId: PAYOUT_TRANSACTION_TYPES.includes(source.type) ? text(source.id) : null,
    status: source.escrow ? text(source.escrow.label) ?? '—' : ({ PENDING: 'Pending', PROCESSING: 'Processing', COMPLETED: 'Completed', FAILED: 'Failed', REVERSED: 'Reversed' })[source.status] ?? '—',
  };
}

export function walletJobView(jobSource, trip) {
  const job = jobView(jobSource);
  if (!job) return null;
  const earnings = earningsView(trip, job);
  return { job, earnings, completedOn: dateLabel(trip.completedAt), delivered: trip.status === 'COMPLETED' ? 1 : null, required: 1 };
}

export function walletJobReceipt({ job, earnings, delivered, required, completedOn }, company) {
  if (!earnings?.complete) return null;
  return {
    kind: 'Job Earnings Statement', number: `EST-${job.id}`, status: job.status,
    issuedOn: dateLabel(new Date().toISOString()),
    company: { name: text(company?.companyName) ?? '—', rcNumber: text(company?.cacNumber) ?? '—', address: text(company?.businessAddress) ?? '—', email: text(company?.email) ?? '—' },
    meta: [
      ['Job ID', job.number], ['Job', job.title], ['Route', `${job.origin} → ${job.destination}`], ['Forwarder', job.poster.name],
      ['Job amount', null, earnings.totals.gross], ['Trucks delivered', `${delivered ?? '—'} of ${required ?? '—'}`],
    ],
    lines: [{ description: `${job.number} · ${job.truckPlate}`, detail: `Delivered ${completedOn ?? '—'} · ${earnings.status ?? '—'}`, amount: earnings.totals.gross }],
    totals: [
      { label: 'Gross earnings', amount: earnings.totals.gross },
      { label: `Trukkas service fee (${earnings.totals.fee === 0 ? '0' : '—'}%)`, amount: -earnings.totals.fee },
      { label: 'Net earnings', amount: earnings.totals.net, strong: true },
    ],
    note: earnings.status === 'PAID' ? 'All delivered trips on this job have been paid out or are processing.' : '—',
  };
}

export function withdrawalFeeView(source, amount) {
  if (source?.amount !== amount || number(source.feeAmount) === null || number(source.netAmount) === null || number(source.feePercent) === null
    || source.feeAmount > amount || Math.abs(source.netAmount + source.feeAmount - amount) > 0.01) return null;
  return { amount, fee: source.feeAmount, net: source.netAmount, feePercent: source.feePercent };
}

export function withdrawalResultView(source, amount) {
  const transaction = object(source?.transaction);
  const fee = transaction && withdrawalFeeView({ ...transaction, amount: transaction.grossAmount }, amount);
  if (!fee || !text(transaction.id) || !text(transaction.reference) || transaction.status !== 'PENDING' || transaction.requiresApproval !== true) return null;
  return { id: transaction.id, reference: transaction.reference, ...fee, status: 'Pending', requiresApproval: true };
}
