'use client';

import { useState } from 'react';
import { Badge, Button, Card, DataTable, LineChart, Modal, PageHeader, StatCard, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { requestWithdrawal } from '../mock/api.js';
import { formatNaira } from '../mock/format.js';

function WithdrawModal({ open, onClose, available }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    const value = Number(amount);
    if (!value || value <= 0) { setError('Enter a valid amount.'); return; }
    setBusy(true);
    try {
      await requestWithdrawal(value);
      setAmount('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Withdraw Funds" description="Funds are sent to the bank account on file in Company Settings." width={420}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="withdraw-form" type="submit" disabled={busy}>{busy ? 'Processing…' : 'Withdraw'}</Button></>}>
      <form id="withdraw-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Amount (₦)" type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Available balance: ${formatNaira(available)}`} error={error} />
      </form>
    </Modal>
  );
}

export function EarningsWallet() {
  const wallet = useCollection('walletSummary')?.[0];
  const transactions = useCollection('walletTransactions') || [];
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  if (!wallet) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Earnings & Wallet" description="Track your wallet balance, pending payouts, and monthly earnings." actions={<Button icon="banknote" onClick={() => setWithdrawOpen(true)}>Withdraw Funds</Button>} />
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
        <strong>{wallet.bankAccount.bankName} •••• {wallet.bankAccount.last4} ({wallet.bankAccount.accountName})</strong>
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
          ]}
        />
      </Card>
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} available={wallet.balance} />
    </div>
  );
}
