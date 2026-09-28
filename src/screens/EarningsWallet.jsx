'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, IconButton, LineChart, Modal, PageHeader, StatCard, TextField } from '../ds.js';
import { jobEarnings, jobReceipt, payoutReceipt } from '../domain/payouts.js';
import { jobTitle } from '../domain/jobs.js';
import { tripsForJob } from '../domain/trips.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { posterFor } from './Jobs.jsx';
import { useCollection } from '../mock/useCollection.js';
import { requestWithdrawal } from '../mock/api.js';
import { formatNaira } from '../mock/format.js';
import { PinPrompt } from '../components/SecurityInputs.jsx';

function WithdrawModal({ open, onClose, available, bank }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  function submit(event) {
    event.preventDefault();
    setError('');
    const value = Number(amount);
    if (!value || value <= 0) { setError('Enter a valid amount.'); return; }
    if (value > available) { setError('Amount exceeds your available balance.'); return; }
    if (!bank) { setError('Add a payout bank account in Company Settings first.'); return; }
    setPinOpen(true);
  }
  async function withdraw(pin) {
    await requestWithdrawal(Number(amount), pin);
    setPinOpen(false);
    setAmount('');
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Withdraw Funds" description={bank ? `Funds go to ${bank.bankName} •••• ${bank.last4} (${bank.accountName}).` : 'Add a payout bank account in Company Settings first.'} width={420}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="withdraw-form" type="submit" disabled={!bank}>Withdraw</Button></>}>
      <form id="withdraw-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Amount (₦)" type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Available balance: ${formatNaira(available)}`} error={error} />
      </form>
      <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} confirmLabel="Approve Withdrawal"
        description={`Withdraw ${formatNaira(Number(amount) || 0)} to your bank account.`} onConfirm={withdraw} />
    </Modal>
  );
}

export function EarningsWallet() {
  const wallet = useCollection('walletSummary')?.[0];
  const transactions = useCollection('walletTransactions') || [];
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const navigate = useNavigate();
  const payouts = useCollection('payoutRequests') || [];
  const trips = useCollection('trips') || [];
  const jobs = useCollection('jobs') || [];
  const company = useCollection('companyProfile')?.[0];
  const jobRows = useMemo(() => jobs
    .map((job) => ({ job, earnings: jobEarnings(job, tripsForJob(trips, job.id), payouts) }))
    .filter((r) => r.earnings.rows.length > 0), [jobs, trips, payouts]);
  if (!wallet) return null;
  const openPayoutReceipt = (payoutId) => {
    const payout = payouts.find((p) => p.id === payoutId);
    if (payout) setReceipt(payoutReceipt(payout, { trips, jobs, company, bank: wallet.bankAccount }));
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Earnings & Wallet" description="Track your wallet balance, pending payouts, and monthly earnings." actions={<><Button variant="outline" icon="hand-coins" onClick={() => navigate('/payouts')}>Request Payout</Button><Button icon="banknote" onClick={() => setWithdrawOpen(true)}>Withdraw Funds</Button></>} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="wallet" tint="green" label="Wallet Balance" value={formatNaira(wallet.balance)} caption="Available balance" />
        <StatCard icon="hourglass" tint="amber" label="Pending Payout" value={formatNaira(wallet.pendingPayout)} caption="In review" />
        <StatCard icon="banknote" tint="blue" label="Earnings This Month" value={formatNaira(wallet.earningsThisMonth)} delta="18%" caption="vs last month" />
        <StatCard icon="calendar" label="Earnings Last Month" value={formatNaira(wallet.earningsLastMonth)} caption={`${wallet.completedTripsThisMonth} trips this month`} />
      </section>
      <Card>
        <h3 className="tk-title" style={{ margin: '0 0 12px' }}>Earnings Trend</h3>
        <LineChart height={180} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May']} area
          series={[{ name: 'Earnings', color: 'var(--tk-blue)', points: [2.1, 2.8, 3.4, 1.2, wallet.earningsThisMonth / 1_000_000].map((v) => Math.round(v * 10) / 10) }]} />
      </Card>
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="tk-meta">Payout bank account</span>
        <strong>{wallet.bankAccount ? `${wallet.bankAccount.bankName} •••• ${wallet.bankAccount.last4} (${wallet.bankAccount.accountName})` : 'Not set — add one in Company Settings'}</strong>
      </Card>
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Earnings by Job</h3>
        <DataTable
          rows={jobRows}
          rowKey={(r) => r.job.id}
          onRowClick={(r) => navigate(`/jobs/${r.job.id}`)}
          columns={[
            { key: 'job', header: 'Job', render: ({ job }) => <span style={{ display: 'grid' }}><strong style={{ color: 'var(--tk-ink-900)' }}>{jobTitle(job)}</strong><span className="tk-meta">{job.id} · {posterFor(job.postedBy).name}</span></span> },
            { key: 'trips', header: 'Trips Delivered', render: ({ job, earnings }) => `${earnings.rows.length} of ${job.trucksRequired || 1}` },
            { key: 'gross', header: 'Gross', align: 'right', render: ({ earnings }) => formatNaira(earnings.totals.gross) },
            { key: 'net', header: 'Net Earnings', align: 'right', render: ({ earnings }) => <strong>{formatNaira(earnings.totals.net)}</strong> },
            { key: 'status', header: 'Payout', render: ({ earnings }) => (earnings.unpaid ? <Badge tone="warning">{formatNaira(earnings.unpaid)} unpaid</Badge> : <Badge tone="success">Paid / processing</Badge>) },
            { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (r) => <IconButton icon="receipt" tone="outline" size={30} label={`Earnings receipt for ${r.job.id}`} onClick={(e) => { e.stopPropagation(); setReceipt(jobReceipt(r.job, r.earnings, { company, poster: posterFor(r.job.postedBy) })); }} /> },
          ]}
        />
      </Card>
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Transaction History</h3>
        <DataTable
          rows={transactions}
          rowKey={(t) => t.id}
          columns={[
            { key: 'date', header: 'Date', render: (t) => t.date },
            { key: 'desc', header: 'Description', render: (t) => t.desc },
            { key: 'type', header: 'Type', render: (t) => <Badge tone={t.type === 'Credit' ? 'success' : 'neutral'}>{t.type}</Badge> },
            { key: 'amount', header: 'Amount', align: 'right', render: (t) => <strong style={{ color: t.amount >= 0 ? 'var(--tk-success)' : 'var(--tk-ink-900)' }}>{formatNaira(t.amount)}</strong> },
            { key: 'balance', header: 'Balance After', align: 'right', render: (t) => formatNaira(t.balanceAfter) },
            { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : 'info'}>{t.status}</Badge> },
            { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (t) => (t.payoutId ? <IconButton icon="receipt" tone="outline" size={30} label={`Receipt for ${t.payoutId}`} onClick={() => openPayoutReceipt(t.payoutId)} /> : <span className="tk-meta">—</span>) },
          ]}
        />
      </Card>
      <ReceiptModal receipt={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} available={wallet.balance} bank={wallet.bankAccount} />
    </div>
  );
}
