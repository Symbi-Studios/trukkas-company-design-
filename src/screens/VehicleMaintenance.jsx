'use client';

import { useMemo, useState } from 'react';
import { useParams } from '../router.js';
import { Badge, Button, Card, DataTable, DonutChart, DropdownMenu, EmptyState, Icon, Modal, SearchField, Select, StatCard, Switch, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { createMaintenance, updateMaintenance, updateTruck } from '../mock/api.js';
import { findTruckBySlug } from '../domain/vehicles.js';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

const STATUS_TONE = { Completed: 'success', Upcoming: 'info', 'In Progress': 'warning', Overdue: 'danger' };
const STATUS_OPTIONS = ['All Status', 'Completed', 'Upcoming', 'In Progress', 'Overdue'];

function ScheduleModal({ open, onClose, plate, odometer }) {
  const [draft, setDraft] = useState({ serviceType: '', description: '', date: '', estimatedCost: '' });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!draft.serviceType) return;
    setBusy(true);
    await createMaintenance({ truckPlate: plate, ...draft, cost: Number(draft.estimatedCost) || 0, odometer });
    setBusy(false);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Schedule Maintenance" width={440}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="schedule-form" type="submit" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</Button></>}>
      <form id="schedule-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Service Type" required value={draft.serviceType} onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })} placeholder="e.g. Oil Change" />
        <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <TextField label="Scheduled Date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <TextField label="Estimated Cost (₦)" type="number" min="0" value={draft.estimatedCost} onChange={(e) => setDraft({ ...draft, estimatedCost: e.target.value })} />
      </form>
    </Modal>
  );
}

export function VehicleMaintenance() {
  const { vehicleId } = useParams();
  const trucks = useCollection('trucks') || [];
  const maintenance = useCollection('maintenance') || [];
  const truck = findTruckBySlug(trucks, vehicleId);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState(null);

  const records = useMemo(() => maintenance.filter((m) => m.truckPlate === truck?.plate), [maintenance, truck?.plate]);
  const filtered = records.filter((r) =>
    (statusFilter === 'All Status' || r.status === statusFilter)
    && (!query || [r.serviceType, r.description].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))));

  if (!truck) return <VehicleDetailFrame tab="maintenance" title="Vehicle not found"><EmptyState icon="wrench" title="Not found" /></VehicleDetailFrame>;

  const completed = records.filter((r) => r.status === 'Completed').length;
  const upcoming = records.filter((r) => r.status === 'Upcoming').length;
  const overdue = records.filter((r) => r.status === 'Overdue').length;
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const next = records.find((r) => r.status === 'Upcoming');
  const donutData = [
    { label: 'Completed', value: completed, color: 'var(--tk-success)' },
    { label: 'Upcoming', value: upcoming, color: 'var(--tk-warning)' },
    { label: 'Overdue', value: overdue, color: 'var(--tk-danger)' },
  ];

  return (
    <VehicleDetailFrame
      tab="maintenance"
      title="Truck Maintenance"
      description="View and manage maintenance records, schedule services, and track costs for this truck."
      primaryAction={<Button icon="plus" onClick={() => setScheduleOpen(true)}>Schedule Maintenance</Button>}
      rail={
        <>
          <Card style={{ display: 'grid', gap: 12 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Maintenance Status</h3>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
              <DonutChart size={130} thickness={16} data={donutData} centerValue={records.length} centerLabel="Services" />
              <div style={{ display: 'grid', gap: 6, width: '100%' }}>
                {donutData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/18px var(--tk-font-sans)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color }} /><span style={{ flex: 1, color: 'var(--tk-ink-500)' }}>{d.label}</span><strong>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          {next && (
            <Card style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 34, height: 34, borderRadius: 'var(--tk-r-sm)', background: 'var(--tk-blue-soft)', color: 'var(--tk-blue)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}><Icon name="wrench" size={16} /></span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>{next.serviceType}</strong>
                <span className="tk-meta">{next.date}</span>
              </span>
              <Icon name="chevron-right" size={16} color="var(--tk-ink-300)" />
            </Card>
          )}
          {truck.notes && (
            <Card style={{ display: 'grid', gap: 6 }}>
              <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Recent Notes</h3>
              <p style={{ margin: 0, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{truck.notes}</p>
              <span className="tk-meta">— Fleet Manager · {truck.odometerUpdated}</span>
            </Card>
          )}
          <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="bell" size={18} color="var(--tk-blue)" />
            <span style={{ flex: 1 }}>
              <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>Maintenance Reminders</strong>
              <span className="tk-meta">Get notified when maintenance is due or overdue for this truck.</span>
              <Switch style={{ marginTop: 10 }} label="Enable Reminders" checked={truck.remindersEnabled}
                onChange={(v) => updateTruck(truck.plate, { remindersEnabled: v })} />
            </span>
          </Card>
        </>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard icon="wrench" label="Total Services" value={records.length} labelPosition="bottom" />
        <StatCard icon="circle-check" tint="green" label="Completed" value={completed} caption={`${records.length ? Math.round((completed / records.length) * 100) : 0}%`} />
        <StatCard icon="clock-3" tint="amber" label="Upcoming" value={upcoming} caption={`${records.length ? Math.round((upcoming / records.length) * 100) : 0}%`} />
        <StatCard icon="triangle-alert" tint="red" label="Overdue" value={overdue} caption={`${records.length ? Math.round((overdue / records.length) * 100) : 0}%`} />
        <StatCard icon="banknote" tint="blue" label="Total Maintenance Cost" value={<span style={{ fontSize: 18, whiteSpace: 'nowrap' }}>{formatNaira(totalCost)}</span>} caption="All time" />
      </section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="tk-title" style={{ margin: 0 }}>Maintenance Records</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchField placeholder="Search maintenance records..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={statusFilter} options={STATUS_OPTIONS} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="wrench" title="No maintenance records" />
      ) : (
        <DataTable rows={filtered} rowKey={(m) => m.id} columns={[
          { key: 'date', header: 'Date', render: (m) => m.date },
          { key: 'serviceType', header: 'Service Type', render: (m) => m.serviceType },
          { key: 'description', header: 'Description', render: (m) => m.description },
          { key: 'odometer', header: 'Odometer', render: (m) => `${m.odometer.toLocaleString()} km` },
          { key: 'cost', header: 'Cost (₦)', render: (m) => formatNaira(m.cost) },
          { key: 'status', header: 'Status', render: (m) => <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge> },
          { key: 'nextDue', header: 'Next Due', render: (m) => m.nextDue || '—' },
          { key: 'actions', header: 'Actions', render: (m) => (
            <span style={{ position: 'relative' }}>
              <Button size="sm" variant="outline" icon="ellipsis" onClick={() => setRowMenu(rowMenu === m.id ? null : m.id)} />
              {rowMenu === m.id && (
                <span style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20 }}>
                  <DropdownMenu width={190} items={[
                    ...(m.status !== 'Completed' ? [{ label: 'Mark Completed', icon: 'circle-check', onClick: () => { setRowMenu(null); updateMaintenance(m.id, { status: 'Completed' }); } }] : []),
                    { label: 'Edit Record', icon: 'pencil', onClick: () => setRowMenu(null) },
                  ]} />
                </span>
              )}
            </span>
          ) },
        ]} />
      )}
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} plate={truck.plate} odometer={truck.odometer} />
    </VehicleDetailFrame>
  );
}
