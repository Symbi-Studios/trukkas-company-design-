'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Badge, Banner, Button, Card, Checkbox, ChoiceCard, DataTable, EmptyState, IconButton, LabelValue, Modal, PageHeader, SearchField, StatCard,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { requestPayout } from '../mock/api.js';
import { eligibleTrips, payoutReceipt, payoutStatusTone, payoutTotals, summarizePayouts } from '../domain/payouts.js';
import { jobTitle } from '../domain/jobs.js';
import { formatNaira } from '../mock/format.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { Toast, useToast } from '../components/Toast.jsx';

function RequestPayoutModal({ open, onClose, eligible, bank, onDone }) {
  const [selected, setSelected] = useState([]);
  const [destination, setDestination] = useState('Bank');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setSelected(eligible.map((row) => row.trip.id)); setDestination('Bank'); setError(''); }
  }, [open, eligible]);

  const chosen = eligible.filter((row) => selected.includes(row.trip.id));
  const totals = payoutTotals(chosen);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const payout = await requestPayout(selected, destination);
      onDone(payout);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} width={620} title="Request Payout"
      description="Choose completed trips to be paid out by Trukkas. Payouts are usually processed within 1–3 business days."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon="banknote" disabled={busy || chosen.length === 0} onClick={submit}>{busy ? 'Requesting…' : `Request ${formatNaira(totals.net)}`}</Button></>}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {eligible.length === 0 ? (
          <EmptyState icon="banknote" title="Nothing to pay out yet" description="Completed trips that haven't been paid out will appear here." style={{ padding: 16 }} />
        ) : (
          <div style={{ display: 'grid', border: '1px solid var(--tk-line)', borderRadius: 'var(--tk-r-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--tk-line)' }}>
              <Checkbox label={`Select all (${eligible.length})`} checked={selected.length === eligible.length} indeterminate={selected.length > 0 && selected.length < eligible.length}
                onChange={(on) => setSelected(on ? eligible.map((r) => r.trip.id) : [])} />
              <span className="tk-meta">Gross at agreed rate per truck</span>
            </div>
            {eligible.map((row) => (
              <div key={row.trip.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--tk-line)' }}>
                <Checkbox checked={selected.includes(row.trip.id)} onChange={() => toggle(row.trip.id)} />
                <span style={{ flex: 1, display: 'grid', minWidth: 0 }}>
                  <strong style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{row.trip.id} · {jobTitle(row.job)}</strong>
                  <span className="tk-meta">{row.trip.jobId} · {row.trip.truckPlate} · Delivered {row.trip.deliveryDate}</span>
                </span>
                <strong style={{ font: '600 13px/18px var(--tk-font-sans)' }}>{formatNaira(row.gross)}</strong>
              </div>
            ))}
          </div>
        )}
        <div>
          <span style={{ display: 'block', marginBottom: 8, font: '500 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>Pay to</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ChoiceCard icon="landmark" title="Bank Account" description={`${bank?.bankName} •••• ${bank?.last4} · ${bank?.accountName}`} selected={destination === 'Bank'} onSelect={() => setDestination('Bank')} />
            <ChoiceCard icon="wallet" title="Trukkas Wallet" description="Credited to your wallet balance once approved." selected={destination === 'Wallet'} onSelect={() => setDestination('Wallet')} />
          </div>
        </div>
        <Card tone="sunk" style={{ display: 'grid' }}>
          <LabelValue label={`Gross earnings (${chosen.length} trip${chosen.length === 1 ? '' : 's'})`} value={formatNaira(totals.gross)} />
          <LabelValue label="Trukkas service fee (5%)" value={`-${formatNaira(totals.fee)}`} />
          <LabelValue label="You receive" value={formatNaira(totals.net)} valueTone="var(--tk-blue)" style={{ borderTop: '1px solid var(--tk-line)' }} />
        </Card>
        {error && <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
      </div>
    </Modal>
  );
}

export function Payouts() {
  const navigate = useNavigate();
  const payouts = useCollection('payoutRequests') || [];
  const trips = useCollection('trips') || [];
  const jobs = useCollection('jobs') || [];
  const wallet = useCollection('walletSummary')?.[0];
  const company = useCollection('companyProfile')?.[0];
  const [query, setQuery] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const eligible = useMemo(() => eligibleTrips(trips, jobs, payouts), [trips, jobs, payouts]);
  const eligibleNet = payoutTotals(eligible).net;
  const filtered = useMemo(() => payouts
    .filter((p) => !query || [p.id, p.reference, ...p.items.flatMap((i) => [i.jobId, i.tripId])].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => b.id.localeCompare(a.id)), [payouts, query]);

  const summary = summarizePayouts(payouts);
  const openReceipt = (p) => setReceipt(payoutReceipt(p, { trips, jobs, company, bank: wallet?.bankAccount }));

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="Payouts"
        description="Request payouts for completed trips and download a receipt for every payout."
        actions={<Button icon="banknote" disabled={eligible.length === 0} onClick={() => setRequestOpen(true)}>Request Payout</Button>}
      />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard icon="hand-coins" tint="teal" label="Available to Request" value={formatNaira(eligibleNet)} caption={`${eligible.length} completed trip(s)`} />
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
          <SearchField placeholder="Search payouts, trips, jobs, references..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="banknote" title="No payouts yet" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/payouts/${p.id}`)}
            columns={[
              { key: 'id', header: 'Payout ID', render: (p) => <span style={{ display: 'grid' }}><Link to={`/payouts/${p.id}`} onClick={(e) => e.stopPropagation()}>{p.id}</Link><span className="tk-meta">{p.reference}</span></span> },
              { key: 'trips', header: 'Trips', render: (p) => <span style={{ display: 'grid' }}><span>{p.items.length === 1 ? p.items[0].tripId : `${p.items.length} trips`}</span><span className="tk-meta">{[...new Set(p.items.map((i) => i.jobId))].join(', ')}</span></span> },
              { key: 'amount', header: 'Net Amount', align: 'right', render: (p) => <span style={{ display: 'grid' }}><strong>{formatNaira(p.amount)}</strong><span className="tk-meta">of {formatNaira(p.gross)}</span></span> },
              { key: 'method', header: 'Paid To', render: (p) => (p.destination === 'Wallet' ? 'Trukkas Wallet' : `${p.method} ••${p.bankLast4}`) },
              { key: 'status', header: 'Status', render: (p) => <Badge tone={payoutStatusTone(p.status)} dot>{p.status}</Badge> },
              { key: 'requestedOn', header: 'Requested', render: (p) => p.requestedOn },
              { key: 'paidOn', header: 'Paid', render: (p) => p.paidOn || '—' },
              { key: 'receipt', header: 'Receipt', align: 'center', width: 80, render: (p) => <IconButton icon="receipt" tone="outline" size={30} label={`Receipt for ${p.id}`} onClick={(e) => { e.stopPropagation(); openReceipt(p); }} /> },
            ]}
          />
        )}
      </Card>
      <RequestPayoutModal
        open={requestOpen} onClose={() => setRequestOpen(false)} eligible={eligible} bank={wallet?.bankAccount}
        onDone={(p) => { setRequestOpen(false); showToast(`${p.id} requested for ${formatNaira(p.amount)}.`); }}
      />
      <ReceiptModal receipt={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
      <Toast message={toast} />
    </div>
  );
}
