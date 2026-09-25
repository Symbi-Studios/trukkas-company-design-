export const walletSummary = {
  balance: 3230000,
  pendingPayout: 2400000,
  earningsThisMonth: 4920000,
  earningsLastMonth: 1210000,
  completedTripsThisMonth: 5,
  bankAccount: { bankName: 'GTBank', accountName: 'SpeedLine Logistics Limited', last4: '4821' },
};

// Oldest first; `balanceAfter` is the running balance once each transaction lands.
export const walletTransactions = [
  { id: 'TXN-8811', type: 'Debit', desc: 'Withdrawal to GTBank ••4821', amount: -2000000, date: 'Apr 20, 2026', status: 'Completed', balanceAfter: -2000000 },
  { id: 'TXN-8870', type: 'Credit', desc: 'Payout · TRP-0031 (Apapa → Kaduna)', amount: 1210000, date: 'Apr 25, 2026', status: 'Completed', balanceAfter: -790000 },
  { id: 'TXN-8902', type: 'Credit', desc: 'Payout · TRP-0040 (Ibadan → Sokoto)', amount: 920000, date: 'May 3, 2026', status: 'Completed', balanceAfter: 130000 },
  { id: 'TXN-8940', type: 'Credit', desc: 'Payout · TRP-0034 (Lagos → Benin City)', amount: 950000, date: 'May 12, 2026', status: 'Completed', balanceAfter: 1080000 },
  { id: 'TXN-8971', type: 'Debit', desc: 'Withdrawal to GTBank ••4821', amount: -900000, date: 'May 15, 2026', status: 'Completed', balanceAfter: 180000 },
  { id: 'TXN-8994', type: 'Credit', desc: 'Payout · TRP-0036 (Lagos → Port Harcourt)', amount: 1250000, date: 'May 18, 2026', status: 'Completed', balanceAfter: 1430000 },
  { id: 'TXN-9001', type: 'Credit', desc: 'Payout · TRP-0037 (Lagos → Port Harcourt)', amount: 1800000, date: 'May 22, 2026', status: 'Completed', balanceAfter: 3230000 },
].slice().reverse();
