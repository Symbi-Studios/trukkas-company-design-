'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, DonutChart, EmptyState, LegendList, PageHeader,
  SearchField, StatCard,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { documentStatusTone, summarizeDocuments } from '../domain/documents.js';

export function Documents() {
  const navigate = useNavigate();
  const documents = useCollection('documents') || [];
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => documents.filter((d) => !query
    || [d.truckPlate, d.name, d.type].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))), [documents, query]);

  const summary = summarizeDocuments(documents);
  const breakdown = [
    { label: 'Valid', value: summary.valid, color: 'var(--tk-success)' },
    { label: 'Expiring Soon', value: summary.expiringSoon, color: 'var(--tk-warning)' },
    { label: 'Expired', value: summary.expired, color: 'var(--tk-danger)' },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Documents" description="Compliance documents across your fleet, required for jobs and inspections." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="file-text" label="Total Documents" value={documents.length} />
        <StatCard icon="alert-triangle" tint="amber" label="Expiring Soon" value={summary.expiringSoon} />
        <StatCard icon="circle-x" tint="red" label="Expired" value={summary.expired} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card pad="none">
          <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
            <SearchField placeholder="Search documents by vehicle, name, or type..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="file-text" title="No documents found" />
          ) : (
            <DataTable
              rows={filtered}
              rowKey={(d) => d.id}
              onRowClick={(d) => navigate(`/documents/${d.id}`)}
              columns={[
                { key: 'name', header: 'Document', render: (d) => <Link to={`/documents/${d.id}`} onClick={(e) => e.stopPropagation()}>{d.name}</Link> },
                { key: 'truck', header: 'Vehicle', render: (d) => d.truckPlate },
                { key: 'type', header: 'Type', render: (d) => d.type },
                { key: 'expiryDate', header: 'Expiry Date', render: (d) => d.expiryDate },
                { key: 'status', header: 'Status', render: (d) => <Badge tone={documentStatusTone(d.status)} dot>{d.status}</Badge> },
                { key: 'uploadedOn', header: 'Uploaded On', render: (d) => d.uploadedOn },
              ]}
            />
          )}
        </Card>
        <Card style={{ display: 'grid', gap: 12 }}>
          <h3 className="tk-title" style={{ margin: 0 }}>Compliance Overview</h3>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
            <DonutChart size={140} thickness={18} data={breakdown} centerValue={summary.total} centerLabel="Documents" />
            <LegendList style={{ width: '100%' }} items={breakdown} />
          </div>
        </Card>
      </div>
    </div>
  );
}
