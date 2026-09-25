'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import { Badge, Card, DataTable, EmptyState, PageHeader, SearchField, StatCard } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { payoutStatusTone, summarizePayouts } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';

export function Payouts() {
  const navigate = useNavigate();
  const payouts = useCollection('payoutRequests') || [];
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => payouts
    .filter((p) => !query || [p.id, p.jobId, p.tripId].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => b.id.localeCompare(a.id)), [payouts, query]);

  const summary = summarizePayouts(payouts);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Payouts" description="Track payouts for your completed trips." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="banknote" label="Total Earned" value={formatNaira(summary.totalEarned)} />
        <StatCard icon="circle-check" tint="green" label="Paid" value={formatNaira(summary.paid)} />
        <StatCard icon="hourglass" tint="amber" label="Processing" value={formatNaira(summary.processing)} />
        <StatCard icon="circle-x" tint="red" label="Failed" value={formatNaira(summary.failed)} />
      </section>
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search payouts, trips, references..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="banknote" title="No payouts yet" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/payouts/${p.id}`)}
            columns={[
              { key: 'id', header: 'Payout ID', render: (p) => <Link to={`/payouts/${p.id}`} onClick={(e) => e.stopPropagation()}>{p.id}</Link> },
              { key: 'job', header: 'Job / Trip', render: (p) => <span><span style={{ display: 'block' }}>{p.jobId}</span><span className="tk-meta">{p.tripId}</span></span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (p) => <strong>{formatNaira(p.amount)}</strong> },
              { key: 'method', header: 'Method', render: (p) => `${p.method} ••${p.bankLast4}` },
              { key: 'status', header: 'Status', render: (p) => <Badge tone={payoutStatusTone(p.status)}>{p.status}</Badge> },
              { key: 'requestedOn', header: 'Requested On', render: (p) => p.requestedOn },
              { key: 'paidOn', header: 'Paid On', render: (p) => p.paidOn || '—' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
