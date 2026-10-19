'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, Modal, PageHeader, SearchField,
  Select, SkeletonRow, StatCard, TextField,
} from '../ds.js';
import { useCompleteFleetMaintenanceMutation, useGetFleetMaintenanceQuery, useGetFleetQuery, useRequestFleetMaintenanceMutation } from '../store/features/fleet/fleetApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { syncTopBarSearch } from '../pageSearch.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import { formatNaira } from '../mock/format.js';

const STATUS_TONE = { Completed: 'success', Upcoming: 'info', 'In Progress': 'warning', Overdue: 'danger' };

function ScheduleModal({ open, onClose, trucks }) {
  const [draft, setDraft] = useState({ truckPlate: trucks[0]?.plate || '', serviceType: '', description: '', date: '', estimatedCost: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestMaintenance] = useRequestFleetMaintenanceMutation();
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await requestMaintenance({ ...draft, truckId: trucks.find((truck) => truck.plate === draft.truckPlate)?.id }).unwrap(); onClose(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Schedule Maintenance" width={460}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="schedule-maintenance-form" type="submit" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</Button></>}>
      <form id="schedule-maintenance-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Select label="Vehicle" value={draft.truckPlate} options={trucks.map((t) => t.plate)} onChange={(e) => setDraft({ ...draft, truckPlate: e.target.value })} />
        <TextField label="Service Type" required value={draft.serviceType} onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })} placeholder="e.g. Oil Change" />
        <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <TextField label="Scheduled Date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <TextField label="Estimated Cost (₦)" type="number" min="0" value={draft.estimatedCost} onChange={(e) => setDraft({ ...draft, estimatedCost: e.target.value })} />
        {error && <span role="alert" className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{error}</span>}
      </form>
    </Modal>
  );
}

export function Maintenance() {
  const navigate = useNavigate();
  const { data: maintenance, error, isLoading } = useGetFleetMaintenanceQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: trucks = [] } = useGetFleetQuery();
  const records = maintenance ?? [];
  const [completeMaintenance] = useCompleteFleetMaintenanceMutation();
  const [busyRecord, setBusyRecord] = useState(null);
  const completing = useRef(false);
  const [toast, showToast] = useToast();
  const statusCount = (statuses) => !maintenance || records.some((record) => record.status === '—') ? '—' : records.filter((record) => statuses.includes(record.status)).length;
  async function complete(record) {
    if (completing.current) return;
    completing.current = true; setBusyRecord(record.id);
    try { await completeMaintenance(record.id).unwrap(); }
    catch (err) { showToast(getApiErrorMessage(err)); }
    finally { completing.current = false; setBusyRecord(null); }
  }
  const [query, setQuery] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => records
    .filter((r) => !query || [r.truckPlate, r.serviceType, r.description].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => (a.status === 'Overdue' ? -1 : 1)), [records, query]);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Fleet Maintenance" description="Track scheduled, upcoming, and overdue maintenance across your fleet." actions={<Button icon="plus" onClick={() => setScheduleOpen(true)}>Schedule Maintenance</Button>} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="wrench" label="Total Records" value={maintenance ? records.length : '—'} />
        <StatCard icon="circle-check" tint="green" label="Completed" value={statusCount(['Completed'])} />
        <StatCard icon="clock-3" tint="amber" label="Upcoming" value={statusCount(['Upcoming', 'In Progress'])} />
        <StatCard icon="triangle-alert" tint="red" label="Overdue" value={statusCount(['Overdue'])} />
      </section>
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search maintenance, trucks, service type..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
        </div>
        {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="wrench" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
          <EmptyState icon="wrench" title="No maintenance records" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(r) => r.id}
            onRowClick={(r) => { if (r.truckId) navigate(fleetDetailHref(r.truckId, 'maintenance')); }}
            columns={[
              { key: 'truck', header: 'Vehicle', render: (r) => r.truckPlate },
              { key: 'date', header: 'Date', render: (r) => r.date },
              { key: 'serviceType', header: 'Service Type', render: (r) => r.serviceType },
              { key: 'description', header: 'Description', render: (r) => r.description },
              { key: 'cost', header: 'Cost', render: (r) => r.cost === null ? '—' : formatNaira(r.cost) },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
              { key: 'actions', header: 'Actions', render: (r) => r.status !== 'Completed' && (
                <Button size="sm" variant="outline" disabled={!!busyRecord} onClick={(e) => { e.stopPropagation(); complete(r); }}>Mark Completed</Button>
              ) },
            ]}
          />
        )}
      </Card>
      <ScheduleModal key={String(scheduleOpen)} open={scheduleOpen} onClose={() => setScheduleOpen(false)} trucks={trucks} />
      <Toast message={toast} />
    </div>
  );
}
