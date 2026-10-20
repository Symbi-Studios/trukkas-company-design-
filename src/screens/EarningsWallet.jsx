'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, IconButton, LabelValue, Modal, PageHeader, Skeleton, SkeletonRow, StatCard, TextField } from '../ds.js';
import { jobTitle } from '../domain/jobs.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { EarningsExpensesChart } from '../components/EarningsExpensesChart.jsx';
import { useGetCompanyWalletQuery, useGetWalletEarningsQuery, useGetWalletJobsQuery, useGetWalletTransactionsQuery, useGetWithdrawalFeeQuery, useRequestWalletWithdrawalMutation } from '../store/features/wallet/walletApi.js';
import { EMPTY_WALLET, EMPTY_WALLET_EARNINGS, walletJobReceipt } from '../store/features/wallet/walletContracts.js';
import { useGetOnboardingBankQuery, useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation } from '../store/features/auth/onboardingApi.js';
import { useLazyGetPayoutRecordQuery } from '../store/features/payouts/payoutsApi.js';
import { PinPrompt } from '../components/SecurityInputs.jsx';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { useTopBarSearch } from '../pageSearch.js';
import { formatNaira } from '../mock/format.js';

const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';

function WithdrawModal({ onClose, available, bank }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('amount');
  const { currentData: security, error: securityError, isFetching: securityLoading } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [savePin] = useSaveOnboardingPinMutation();
  const [requestWithdrawal] = useRequestWalletWithdrawalMutation();
  const value = Number(amount);
  const validAmount = Number.isFinite(value) && value >= 1000 && value <= Number.MAX_SAFE_INTEGER && typeof available === 'number' && value <= available;
  const { currentData: fee, error: feeError, isFetching: feeLoading } = useGetWithdrawalFeeQuery(value, { skip: step === 'amount' || !validAmount, refetchOnMountOrArgChange: true });
  const ready = validAmount && bank && fee && !feeError && !feeLoading && !securityError && !securityLoading && typeof security?.pin?.set === 'boolean';
  function submit(event) {
    event.preventDefault();
    setError('');
    if (!Number.isFinite(value) || value < 1000 || value > Number.MAX_SAFE_INTEGER) { setError('Enter a withdrawal amount of at least ₦1,000.'); return; }
    if (typeof available !== 'number' || !Number.isFinite(available)) { setError('Your available balance could not be confirmed. Please reload.'); return; }
    if (value > available) { setError('Amount exceeds your available balance.'); return; }
    if (!bank) { setError('Add a payout bank account in Company Settings first.'); return; }
    setStep('confirm');
  }
  async function createPin(fields) {
    try { await savePin(fields).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function withdraw() {
    // Do not send an unverified PIN or submit without backend PIN enforcement.
    try { await requestWithdrawal().unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  return (
    <>
    <Modal open={step === 'amount'} onClose={onClose} title="Withdraw Funds" description={bank ? `Funds go to ${bank.bankName} •••• ${bank.last4} (${bank.accountName}).` : bank === null ? 'Add a payout bank account in Company Settings first.' : '—'} width={420}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="withdraw-form" type="submit" disabled={!bank}>Withdraw</Button></>}>
      <form id="withdraw-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Amount (₦)" type="number" min="1000" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Available balance: ${money(available)}`} error={error} />
      </form>
    </Modal>
    <Modal open={step === 'confirm'} onClose={onClose} title="Confirm Withdrawal" description="Review the fee and amount your bank will receive. Withdrawals require backend approval." width={420}
      footer={<><Button variant="outline" onClick={() => setStep('amount')}>Back</Button><Button disabled={!ready} onClick={() => { if (ready) setStep('pin'); }}>Continue</Button></>}>
      {feeLoading || securityLoading ? <SkeletonRow columns={2} /> : feeError || securityError ? <EmptyState icon="wallet" title={getApiErrorMessage(feeError || securityError)} /> : <>
        <LabelValue label="Withdrawal amount" value={money(fee?.amount)} />
        <LabelValue label="Withdrawal fee" value={money(fee?.fee)} />
        <LabelValue label="Amount received" value={money(fee?.net)} />
        <LabelValue label="Bank account" value={bank ? `${bank.bankName} •••• ${bank.last4}` : '—'} />
      </>}
    </Modal>
    <PinPrompt open={step === 'pin'} onClose={onClose} confirmLabel="Approve Withdrawal" securityState={security ?? { pin: { set: null } }} createPin={createPin}
      description={`Withdraw ${money(fee?.amount)} to your bank account. Fee: ${money(fee?.fee)}. Amount received: ${money(fee?.net)}.`} onConfirm={withdraw} />
    </>
  );
}

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
        <StatCard icon="calendar" label="Earnings Last Month" value={metric(earningsLoading, earningsError ? null : earnings.earningsLastMonth)} caption={`${jobData?.completedThisMonth ?? '—'} trips this month`} />
      </section>
      <Card>
        <h3 className="tk-title" style={{ margin: '0 0 12px' }}>Earnings vs Expenses</h3>
        {earningsLoading ? <SkeletonRow columns={3} /> : earningsError ? <EmptyState icon="wallet" title={getApiErrorMessage(earningsError)} /> : earnings.monthlyTrend === null ? <span className="tk-meta">—</span> : <EarningsExpensesChart trend={earnings.monthlyTrend} />}
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
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} available={walletError ? null : wallet.available} bank={bankError ? undefined : bank} />}
      <Toast message={toast} />
    </div>
  );
}
