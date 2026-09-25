const PAYOUT_STATUS_TONE = {
  Paid: 'success',
  Processing: 'info',
  Failed: 'danger',
};

export function payoutStatusTone(status) {
  return PAYOUT_STATUS_TONE[status] || 'neutral';
}

export function summarizePayouts(payouts) {
  const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
  return {
    totalEarned: sum(payouts.filter((p) => p.status !== 'Failed')),
    paid: sum(payouts.filter((p) => p.status === 'Paid')),
    processing: sum(payouts.filter((p) => p.status === 'Processing')),
    failed: sum(payouts.filter((p) => p.status === 'Failed')),
  };
}
