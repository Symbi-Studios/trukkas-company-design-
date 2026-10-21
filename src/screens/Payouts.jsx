'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from '../router.js';
import {
  Badge, Banner, Button, Card, DataTable, EmptyState, IconButton, PageHeader, SearchField, SkeletonRow, StatCard,
} from '../ds.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { payoutStatusTone } from '../domain/payouts.js';
import { payoutAmountLabel as formatNaira } from '../store/features/payouts/payoutContracts.js';
import { useGetPayoutRecordsQuery } from '../store/features/payouts/payoutsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { payoutDetailHref } from '../domain/payoutLinks.js';
import { PayoutReceiptModal } from '../components/PayoutReceiptModal.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import { WalletWithdrawModal, useWalletWithdrawalAttempt } from '../components/WalletWithdrawModal.jsx';
import { useGetCompanyWalletQuery } from '../store/features/wallet/walletApi.js';
import { useGetOnboardingBankQuery } from '../store/features/auth/onboardingApi.js';
import { useGetMyProfileAccessQuery } from '../store/features/profile/profileApi.js';

const EMPTY_ROWS = [];
export function Payouts() {
  const navigate = useNavigate();
  const { currentData: data, error, isLoading } = useGetPayoutRecordsQuery(undefined, { refetchOnMountOrArgChange: true });
  const payouts = data?.records ?? EMPTY_ROWS;
  const [query, setQuery] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const company = useSelector((state) => state.auth.account);
  const { currentData: access, error: accessError } = useGetMyProfileAccessQuery(undefined, { skip: !company, refetchOnMountOrArgChange: true });
  const canWithdraw = !accessError && access?.companyId === company?.id && access?.canWithdraw === true;
  const withdrawalAttempt = useWalletWithdrawalAttempt(company?.id, company?.actualUserId);
  const { currentData: wallet, error: walletError } = useGetCompanyWalletQuery(undefined, { skip: !requestOpen, refetchOnMountOrArgChange: true });
  const { currentData: bank, error: bankError } = useGetOnboardingBankQuery(undefined, { skip: !requestOpen, refetchOnMountOrArgChange: true });
  const [receiptId, setReceiptId] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const eligible = data?.eligible ?? EMPTY_ROWS;
  const eligibleNet = !error ? data?.availableToRequest ?? null : null;
  const filtered = useMemo(() => payouts
    .filter((p) => !query || [p.id, p.reference, p.description, ...p.items.flatMap((i) => [i.jobId, i.tripId, i.jobNumber])].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))), [payouts, query]);

  const summary = (!error && data?.summary) || { paid: null, processing: null, failed: null };

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="Payouts"
        description={error ? getApiErrorMessage(error) : 'Track job payments and wallet withdrawals, and download payout receipts.'}
        actions={<Button icon="banknote" disabled={!canWithdraw || !!error || (!data?.canRequest && !withdrawalAttempt.current)} onClick={() => setRequestOpen(true)}>Request Payout</Button>}
      />
      <section className="tk-money-stats">
        <StatCard icon="hand-coins" tint="teal" label="Available to Request" value={formatNaira(eligibleNet)} caption="Available wallet balance" />
        <StatCard icon="banknote" label="Total Paid Out" value={formatNaira(summary.paid)} />
        <StatCard icon="hourglass" tint="amber" label="In Progress" value={formatNaira(summary.processing)} caption="Requested or processing" />
        <StatCard icon="circle-x" tint="red" label="Failed" value={formatNaira(summary.failed)} />
      </section>
      {eligible.length > 0 && (
        <Banner tone="info" title={`${formatNaira(eligibleNet)} ready to be paid out`} action={<Button size="sm" onClick={() => setRequestOpen(true)}>Request Payout</Button>}>
          {eligible.length} completed trip(s) haven’t been included in a payout yet: {eligible.map((r) => r.trip.id).join(', ')}.
        </Banner>
      )}
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search payouts, trips, jobs, references..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
        </div>
        {isLoading ? <SkeletonRow columns={8} /> : error ? <EmptyState icon="banknote" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
          <EmptyState icon="banknote" title="No payouts yet" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(payoutDetailHref(p.id))}
            columns={[
              { key: 'id', header: 'Payout ID', render: (p) => <span style={{ display: 'grid' }}><Link to={payoutDetailHref(p.id)} onClick={(e) => e.stopPropagation()}>{p.id}</Link><span className="tk-meta">{p.reference}</span></span> },
              { key: 'trips', header: 'Trips', render: (p) => <span style={{ display: 'grid' }}><span>{p.tripCount === null ? '—' : p.items.length === 1 ? p.items[0].tripId : `${p.items.length} trips`}</span><span className="tk-meta">{[...new Set(p.items.map((i) => i.jobId))].join(', ') || '—'}</span></span> },
              { key: 'amount', header: 'Net Amount', align: 'right', render: (p) => <span style={{ display: 'grid' }}><strong>{formatNaira(p.amount)}</strong><span className="tk-meta">of {formatNaira(p.gross)}</span></span> },
              { key: 'method', header: 'Paid To', render: (p) => p.paidTo },
              { key: 'status', header: 'Status', render: (p) => <Badge tone={payoutStatusTone(p.status)} dot>{p.status}</Badge> },
              { key: 'requestedOn', header: 'Requested', render: (p) => p.requestedOn },
              { key: 'paidOn', header: 'Paid', render: (p) => p.paidOn || '—' },
              { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (p) => <IconButton icon="receipt" tone="outline" size={30} label={`Receipt for ${p.id}`} onClick={(e) => { e.stopPropagation(); setReceiptId(p.id); }} /> },
            ]}
          />
        )}
      </Card>
      {requestOpen && <WalletWithdrawModal onClose={() => setRequestOpen(false)}
        onDone={(result) => { setRequestOpen(false); showToast(`${result.reference}: withdrawal request submitted. Awaiting approval.`); }}
        available={walletError ? null : wallet?.available} bank={bankError ? undefined : bank} attempt={withdrawalAttempt} companyId={company?.id} />}
      {receiptId && <PayoutReceiptModal key={receiptId} id={receiptId} onClose={() => setReceiptId(null)} />}
      <Toast message={toast} />
    </div>
  );
}
