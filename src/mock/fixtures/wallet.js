export const walletSummary = {
  balance: 2841250,
  pendingPayout: 845500,
  earningsThisMonth: 2322750,
  earningsLastMonth: 1168500,
  completedTripsThisMonth: 5,
  bankAccount: { bankCode: '058', bankName: 'GTBank', accountName: 'SPEEDLINE LOGISTICS LIMITED', last4: '4821', updatedOn: 'Mar 3, 2021' },
};

// Oldest first; `balanceAfter` is the running balance once each transaction lands.
// Credits are paid-out trip earnings (net of the service fee) and link to the
// payout that produced them via `payoutId`.
export const walletTransactions = [
  { id: 'TXN-8811', type: 'Debit', desc: 'Withdrawal to GTBank ••4821', amount: -2000000, date: 'Apr 20, 2026', status: 'Completed', balanceAfter: 250000 },
  { id: 'TXN-8870', type: 'Credit', desc: 'Payout · TRP-0031 (Apapa → Kaduna)', payoutId: 'PYT-2026-0031', amount: 1168500, date: 'Apr 25, 2026', status: 'Completed', balanceAfter: 1418500 },
  { id: 'TXN-8902', type: 'Credit', desc: 'Payout · TRP-0040 (Ibadan → Sokoto)', payoutId: 'PYT-2026-0035', amount: 888250, date: 'May 3, 2026', status: 'Completed', balanceAfter: 2306750 },
  { id: 'TXN-8940', type: 'Credit', desc: 'Payout · TRP-0034 (Lagos → Ilorin)', payoutId: 'PYT-2026-0039', amount: 418000, date: 'May 12, 2026', status: 'Completed', balanceAfter: 2724750 },
  { id: 'TXN-8971', type: 'Debit', desc: 'Withdrawal to GTBank ••4821', amount: -900000, date: 'May 15, 2026', status: 'Completed', balanceAfter: 1824750 },
  { id: 'TXN-8994', type: 'Credit', desc: 'Payout · TRP-0036 (Lagos → Kaduna)', payoutId: 'PYT-2026-0041', amount: 446500, date: 'May 18, 2026', status: 'Completed', balanceAfter: 2271250 },
  { id: 'TXN-9001', type: 'Credit', desc: 'Payout · TRP-0037 (Lagos → Port Harcourt)', payoutId: 'PYT-2026-0045', amount: 570000, date: 'May 22, 2026', status: 'Completed', balanceAfter: 2841250 },
].slice().reverse();
