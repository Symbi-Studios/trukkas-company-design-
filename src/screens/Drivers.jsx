'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader,
  SearchField, SkeletonRow, StatCard, TextField,
} from '../ds.js';
import { useAddCompanyDriverMutation, useGetCompanyDriversQuery, useGetCompanyDriverSummaryQuery } from '../store/features/drivers/driversApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { driverDetailHref } from '../domain/driverLinks.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { InviteExistingDriverModal } from '../components/DriverInvitationModals.jsx';
import { DriverInvitations } from './DriverInvitations.jsx';
import { Toast, useToast } from '../components/Toast.jsx';

const STATUS_TONE = { Available: 'success', 'On Trip': 'info', 'Off Duty': 'neutral' };

function AddDriverModal({ open, onClose }) {
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', licenseNumber: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [addDriver] = useAddCompanyDriverMutation();
  const submitting = useRef(false);
  useEffect(() => { if (open) setError(''); }, [open]);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !draft.name.trim()) return;
    submitting.current = true; setBusy(true);
    setError('');
    try {
      await addDriver(draft).unwrap();
      setDraft({ name: '', phone: '', email: '', licenseNumber: '' });
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Driver" width={460}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="add-driver-form" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add Driver'}</Button></>}>
      <form id="add-driver-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Full Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label="Phone" required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+234 800 000 0000" />
        <TextField label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="License Number" value={draft.licenseNumber} onChange={(e) => setDraft({ ...draft, licenseNumber: e.target.value })} />
        {error && <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
      </form>
    </Modal>
  );
}

export function Drivers() {
  const navigate = useNavigate();
  const { currentData: collection, error, isLoading, refetch: refreshDrivers } = useGetCompanyDriversQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: summary, error: summaryError, refetch: refreshSummary } = useGetCompanyDriverSummaryQuery(undefined, { refetchOnMountOrArgChange: true });
  const stats = summaryError ? null : summary;
  const drivers = collection ?? [];
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => drivers.filter((d) => !query
    || [d.name, d.phone, d.licenseNumber].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))), [drivers, query]);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Drivers" description="Manage your drivers, licenses, and assignments." actions={<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><Button icon="plus" onClick={() => setAddOpen(true)}>Add Driver</Button><Button variant="outline" icon="send" onClick={() => setInviteOpen(true)}>Invite Existing Driver</Button></div>} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="users-round" label="Total Drivers" value={stats?.total ?? '—'} />
        <StatCard icon="circle-check" tint="green" label="Available" value={stats?.available ?? '—'} />
        <StatCard icon="route" tint="blue" label="On Trip" value={stats?.onTrip ?? '—'} />
        <StatCard icon="moon" tint="purple" label="Off Duty" value={stats?.offDuty ?? '—'} />
      </section>
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search drivers by name, license, phone..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
        </div>
        {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="user" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
          <EmptyState icon="user" title="No drivers found" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(driverDetailHref(d.id))}
            columns={[
              { key: 'name', header: 'Driver', render: (d) => <Link to={driverDetailHref(d.id)} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={d.name} src={d.photo || undefined} size={30} /><span><strong style={{ display: 'block', color: 'var(--tk-ink-900)' }}>{d.name}</strong><span className="tk-meta">{d.phone}</span></span></Link> },
              { key: 'license', header: 'License', render: (d) => <span><span style={{ display: 'block' }}>{d.licenseNumber}</span><span className="tk-meta">{d.licenseClass}</span></span> },
              { key: 'truck', header: 'Assigned Truck', render: (d) => d.truckPlate || '—' },
              { key: 'status', header: 'Status', render: (d) => <Badge tone={STATUS_TONE[d.status]} dot>{d.status}</Badge> },
              { key: 'rating', header: 'Rating', render: (d) => <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="star" filled size={13} color="var(--tk-warning)" />{d.rating?.toFixed(1) ?? '—'}</span> },
              { key: 'trips', header: 'Trips', render: (d) => d.tripsCompleted },
            ]}
          />
        )}
      </Card>
      <DriverInvitations onToast={showToast} onRefresh={() => { void refreshDrivers(); void refreshSummary(); }} />
      <AddDriverModal open={addOpen} onClose={() => setAddOpen(false)} />
      <InviteExistingDriverModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={(invitation) => { setInviteOpen(false); showToast(invitation.reused ? 'Existing invitation reused. Truck: ' + invitation.truckLabel + '. No new email sent. Cancel it to change the truck.' : 'Invitation sent to ' + invitation.name + '. The driver joins after entering the code.'); }} />
      <Toast message={toast} />
    </div>
  );
}
