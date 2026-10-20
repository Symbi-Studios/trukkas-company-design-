'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, IconButton, PageHeader, Skeleton, SkeletonRow, StatCard } from '../ds.js';
import { jobTitle } from '../domain/jobs.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { EarningsExpensesChart } from '../components/EarningsExpensesChart.jsx';
import { useGetCompanyWalletQuery, useGetWalletEarningsQuery, useGetWalletJobsQuery, useGetWalletTransactionsQuery } from '../store/features/wallet/walletApi.js';
import { EMPTY_WALLET, EMPTY_WALLET_EARNINGS, walletJobReceipt } from '../store/features/wallet/walletContracts.js';
import { useGetOnboardingBankQuery } from '../store/features/auth/onboardingApi.js';
import { useLazyGetPayoutRecordQuery } from '../store/features/payouts/payoutsApi.js';
import { WalletWithdrawModal, useWalletWithdrawalAttempt } from '../components/WalletWithdrawModal.jsx';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { useTopBarSearch } from '../pageSearch.js';
import { formatNaira } from '../mock/format.js';

const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';

export function EarningsWallet() {
  const { currentData: wallet = EMPTY_WALLET, error: walletError, isLoading: walletLoading } = useGetCompanyWalletQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: earnings = EMPTY_WALLET_EARNINGS, error: earningsError, isLoading: earningsLoading } = useGetWalletEarningsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: transactions, error: transactionsError, isLoading: transactionsLoading } = useGetWalletTransactionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: jobData, error: jobsError, isLoading: jobsLoading } = useGetWalletJobsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: bank, error: bankError, isLoading: bankLoading } = useGetOnboardingBankQuery(undefined, { refetchOnMountOrArgChange: true });
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [getPayoutReceipt, { isFetching: receiptLoading }] = useLazyGetPayoutRecordQuery();
  const navigate = useNavigate();
  const company = useSelector((state) => state.auth.account);
  const withdrawalAttempt = useWalletWithdrawalAttempt(company?.id, company?.actualUserId);
  const [toast, showToast] = useToast();
  const [query, setQuery] = useState('');
  useTopBarSearch(setQuery);
  const q = query.trim().toLowerCase();
  const matches = (...values) => !q || values.some((v) => String(v || '').toLowerCase().includes(q));
  const visibleJobRows = (jobData?.rows ?? []).filter(({ job }) => matches(job.id, job.number, jobTitle(job), job.poster.name));
  const visibleTransactions = (transactions ?? []).filter((t) => matches(t.id, t.reference, t.desc, t.date, t.type, t.status, t.jobNumber));
  const metric = (loading, value) => loading ? <Skeleton width={100} height={28} /> : money(value);
  async function openPayoutReceipt(id) {
    if (receiptLoading) return;
    try { const result = await getPayoutReceipt(id).unwrap(); setReceipt(result.receipt); }
    catch (err) { showToast(getApiErrorMessage(err)); }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Earnings & Wallet" description="Track your wallet balance, pending payouts, and monthly earnings." actions={<><Button variant="outline" icon="hand-coins" onClick={() => navigate('/payouts')}>Request Payout</Button><Button icon="banknote" onClick={() => setWithdrawOpen(true)}>Withdraw Funds</Button></>} />
      <section className="tk-money-stats">
        <StatCard icon="wallet" tint="green" label="Wallet Balance" value={metric(walletLoading, walletError ? null : wallet.available)} caption="Available balance" />
        <StatCard icon="hourglass" tint="amber" label="Pending Payout" value={metric(earningsLoading, earningsError ? null : earnings.pendingPayout)} caption="In review" />
        <StatCard icon="banknote" tint="blue" label="Earnings This Month" value={metric(earningsLoading, earningsError ? null : earnings.earningsThisMonth)} delta={earningsError || earnings.change === null ? '—' : `${Math.abs(earnings.change)}%`} direction={earnings.change !== null && earnings.change < 0 ? 'down' : 'up'} caption="vs last month" />
        <StatCard icon="calendar" label="Earnings Last Month" value={metric(earningsLoading, earningsError ? null : earnings.earningsLastMonth)} caption={`${earningsError ? '—' : earnings.completedThisMonth ?? '—'} trips this month`} />
      </section>
      <Card>
        <h3 className="tk-title" style={{ margin: '0 0 12px' }}>Earnings vs Expenses</h3>
        {earningsLoading ? <SkeletonRow variant="chart" /> : earningsError ? <EmptyState icon="wallet" title={getApiErrorMessage(earningsError)} /> : earnings.monthlyTrend === null ? <span className="tk-meta">—</span> : <EarningsExpensesChart trend={earnings.monthlyTrend} />}
      </Card>
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="tk-meta">Payout bank account</span>
        <strong>{bankLoading ? <Skeleton width={200} height={20} /> : bankError ? getApiErrorMessage(bankError) : bank ? `${bank.bankName} •••• ${bank.last4} (${bank.accountName})` : bank === null ? 'Not set — add one in Company Settings' : '—'}</strong>
      </Card>
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Earnings by Job</h3>
        {jobsLoading ? <SkeletonRow columns={6} /> : jobsError ? <EmptyState icon="briefcase" title={getApiErrorMessage(jobsError)} /> : <DataTable
          rows={visibleJobRows}
          rowKey={(r) => r.job.id}
          onRowClick={(r) => navigate(jobDetailHref(r.job.id))}
          columns={[
            { key: 'job', header: 'Job', render: ({ job }) => <span style={{ display: 'grid' }}><strong style={{ color: 'var(--tk-ink-900)' }}>{jobTitle(job)}</strong><span className="tk-meta">{job.number} · {job.poster.name}</span></span> },
            { key: 'trips', header: 'Trips Delivered', render: (row) => `${row.delivered ?? '—'} of ${row.required ?? '—'}` },
            { key: 'gross', header: 'Gross', align: 'right', render: ({ earnings }) => money(earnings?.totals.gross) },
            { key: 'net', header: 'Net Earnings', align: 'right', render: ({ earnings }) => <strong>{money(earnings?.totals.net)}</strong> },
            { key: 'status', header: 'Payout', render: ({ earnings }) => <Badge tone={earnings?.status === 'PAID' ? 'success' : 'neutral'}>{earnings?.status ?? '—'}</Badge> },
            { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (r) => <IconButton icon="receipt" tone="outline" size={30} disabled={!r.earnings?.complete} label={`Earnings receipt for ${r.job.id}`} onClick={(e) => { e.stopPropagation(); setReceipt(walletJobReceipt(r, company)); }} /> },
          ]}
        />}
        {!jobsLoading && !jobsError && q && visibleJobRows.length === 0 && <p className="tk-meta" style={{ margin: 0, padding: 16 }}>No jobs match your search.</p>}
      </Card>
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Transaction History</h3>
        {transactionsLoading ? <SkeletonRow columns={7} /> : transactionsError ? <EmptyState icon="wallet" title={getApiErrorMessage(transactionsError)} /> : <DataTable
          rows={visibleTransactions}
          rowKey={(t) => t.id}
          columns={[
            { key: 'date', header: 'Date', render: (t) => t.date },
            { key: 'desc', header: 'Description', render: (t) => t.desc },
            { key: 'type', header: 'Type', render: (t) => <Badge tone={t.type === 'Credit' ? 'success' : 'neutral'}>{t.type}</Badge> },
            { key: 'amount', header: 'Amount', align: 'right', render: (t) => <strong style={{ color: t.amount !== null && t.amount >= 0 ? 'var(--tk-success)' : 'var(--tk-ink-900)' }}>{money(t.amount)}</strong> },
            { key: 'balance', header: 'Balance After', align: 'right', render: (t) => money(t.balanceAfter) },
            { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : 'info'}>{t.status}</Badge> },
            { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (t) => t.receiptId ? <IconButton icon="receipt" tone="outline" size={30} disabled={receiptLoading} label={`Receipt for ${t.receiptId}`} onClick={() => openPayoutReceipt(t.receiptId)} /> : <span className="tk-meta">—</span> },
          ]}
        />}
        {!transactionsLoading && !transactionsError && q && visibleTransactions.length === 0 && <p className="tk-meta" style={{ margin: 0, padding: 16 }}>No transactions match your search.</p>}
      </Card>
      <ReceiptModal receipt={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
      {withdrawOpen && <WalletWithdrawModal onClose={() => setWithdrawOpen(false)} onDone={(result) => { setWithdrawOpen(false); showToast(`${result.reference}: withdrawal request submitted. Awaiting approval.`); }} available={walletError ? null : wallet.available} bank={bankError ? undefined : bank} attempt={withdrawalAttempt} companyId={company?.id} />}
      <Toast message={toast} />
    </div>
  );
}
