'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader,
  SearchField, StatCard, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { addDriver } from '../mock/api.js';

const STATUS_TONE = { Available: 'success', 'On Trip': 'info', 'Off Duty': 'neutral' };

function AddDriverModal({ open, onClose }) {
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', licenseNumber: '' });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    await addDriver({ id: `DRV-${Date.now().toString().slice(-6)}`, ...draft });
    setBusy(false);
    setDraft({ name: '', phone: '', email: '', licenseNumber: '' });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Driver" width={460}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="add-driver-form" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add Driver'}</Button></>}>
      <form id="add-driver-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Full Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label="Phone" required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+234 800 000 0000" />
        <TextField label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="License Number" value={draft.licenseNumber} onChange={(e) => setDraft({ ...draft, licenseNumber: e.target.value })} />
      </form>
    </Modal>
  );
}

export function Drivers() {
  const navigate = useNavigate();
  const drivers = useCollection('drivers') || [];
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => drivers.filter((d) => !query
    || [d.name, d.phone, d.licenseNumber].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))), [drivers, query]);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Drivers" description="Manage your drivers, licenses, and assignments." actions={<Button icon="plus" onClick={() => setAddOpen(true)}>Add Driver</Button>} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="users-round" label="Total Drivers" value={drivers.length} />
        <StatCard icon="circle-check" tint="green" label="Available" value={drivers.filter((d) => d.status === 'Available').length} />
        <StatCard icon="route" tint="blue" label="On Trip" value={drivers.filter((d) => d.status === 'On Trip').length} />
        <StatCard icon="moon" tint="purple" label="Off Duty" value={drivers.filter((d) => d.status === 'Off Duty').length} />
      </section>
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search drivers by name, license, phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="user" title="No drivers found" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/drivers/${d.id}`)}
            columns={[
              { key: 'name', header: 'Driver', render: (d) => <Link to={`/drivers/${d.id}`} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={d.name} size={30} /><span><strong style={{ display: 'block', color: 'var(--tk-ink-900)' }}>{d.name}</strong><span className="tk-meta">{d.phone}</span></span></Link> },
              { key: 'license', header: 'License', render: (d) => <span><span style={{ display: 'block' }}>{d.licenseNumber}</span><span className="tk-meta">{d.licenseClass}</span></span> },
              { key: 'truck', header: 'Assigned Truck', render: (d) => d.truckPlate || '—' },
              { key: 'status', header: 'Status', render: (d) => <Badge tone={STATUS_TONE[d.status]} dot>{d.status}</Badge> },
              { key: 'rating', header: 'Rating', render: (d) => <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="star" size={13} color="var(--tk-warning)" />{d.rating?.toFixed(1) ?? '—'}</span> },
              { key: 'trips', header: 'Trips', render: (d) => d.tripsCompleted },
            ]}
          />
        )}
      </Card>
      <AddDriverModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
