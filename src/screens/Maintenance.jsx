'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, Modal, PageHeader, SearchField,
  Select, StatCard, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { createMaintenance, updateMaintenance } from '../mock/api.js';
import { plateSlug } from '../domain/vehicles.js';
import { formatNaira } from '../mock/format.js';

const STATUS_TONE = { Completed: 'success', Upcoming: 'info', 'In Progress': 'warning', Overdue: 'danger' };

function ScheduleModal({ open, onClose, trucks }) {
  const [draft, setDraft] = useState({ truckPlate: trucks[0]?.plate || '', serviceType: '', description: '', date: '', estimatedCost: '' });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!draft.truckPlate || !draft.serviceType) return;
    setBusy(true);
    await createMaintenance({ ...draft, cost: Number(draft.estimatedCost) || 0, odometer: trucks.find((t) => t.plate === draft.truckPlate)?.odometer || 0 });
    setBusy(false);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Schedule Maintenance" width={460}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="schedule-maintenance-form" type="submit" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</Button></>}>
      <form id="schedule-maintenance-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Select label="Vehicle" value={draft.truckPlate} options={trucks.map((t) => t.plate)} onChange={(e) => setDraft({ ...draft, truckPlate: e.target.value })} />
        <TextField label="Service Type" required value={draft.serviceType} onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })} placeholder="e.g. Oil Change" />
        <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <TextField label="Scheduled Date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <TextField label="Estimated Cost (₦)" type="number" min="0" value={draft.estimatedCost} onChange={(e) => setDraft({ ...draft, estimatedCost: e.target.value })} />
      </form>
    </Modal>
  );
}

export function Maintenance() {
  const navigate = useNavigate();
  const records = useCollection('maintenance') || [];
  const trucks = useCollection('trucks') || [];
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
        <StatCard icon="wrench" label="Total Records" value={records.length} />
        <StatCard icon="circle-check" tint="green" label="Completed" value={records.filter((r) => r.status === 'Completed').length} />
        <StatCard icon="clock-3" tint="amber" label="Upcoming" value={records.filter((r) => r.status === 'Upcoming' || r.status === 'In Progress').length} />
        <StatCard icon="triangle-alert" tint="red" label="Overdue" value={records.filter((r) => r.status === 'Overdue').length} />
      </section>
      <Card pad="none">
        <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search maintenance, trucks, service type..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="wrench" title="No maintenance records" />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/fleet/${plateSlug(r.truckPlate)}`)}
            columns={[
              { key: 'truck', header: 'Vehicle', render: (r) => r.truckPlate },
              { key: 'date', header: 'Date', render: (r) => r.date },
              { key: 'serviceType', header: 'Service Type', render: (r) => r.serviceType },
              { key: 'description', header: 'Description', render: (r) => r.description },
              { key: 'cost', header: 'Cost', render: (r) => formatNaira(r.cost) },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
              { key: 'actions', header: 'Actions', render: (r) => r.status !== 'Completed' && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateMaintenance(r.id, { status: 'Completed' }); }}>Mark Completed</Button>
              ) },
            ]}
          />
        )}
      </Card>
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} trucks={trucks} />
    </div>
  );
}
