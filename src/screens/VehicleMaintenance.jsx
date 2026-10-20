'use client';

import { useRef, useState } from 'react';
import { Badge, Button, Card, DataTable, DonutChart, DropdownMenu, EmptyState, Icon, SearchField, Select, SkeletonRow, StatCard, Switch } from '../ds.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { useCompleteFleetMaintenanceMutation, useGetFleetMaintenanceQuery, useUpdateFleetVehicleMutation } from '../store/features/fleet/fleetApi.js';
import { MaintenanceModal } from '../components/MaintenanceModal.jsx';
import { total } from '../store/features/fleet/fleetContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

const STATUS_TONE = { Completed: 'success', Upcoming: 'info', Requested: 'info', 'In Progress': 'warning', Overdue: 'danger', Cancelled: 'neutral', Rejected: 'danger' };
const STATUS_OPTIONS = ['All Status', 'Completed', 'Upcoming', 'In Progress', 'Overdue'];

export function VehicleMaintenance() {
  const { truck } = useFleetVehicle();
  const { currentData: maintenanceData, error, isLoading } = useGetFleetMaintenanceQuery(truck?.id, { skip: !truck, refetchOnMountOrArgChange: true });
  const records = maintenanceData?.records;
  const [completeMaintenance] = useCompleteFleetMaintenanceMutation();
  const [updateVehicle, { isLoading: savingReminders }] = useUpdateFleetVehicleMutation();
  const updatingReminders = useRef(false);
  const [busyRecord, setBusyRecord] = useState(null);
  const completing = useRef(false);
  const [toast, showToast] = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);

  const filtered = (records ?? []).filter((r) =>
    (statusFilter === 'All Status' || r.status === statusFilter)
    && (!query || [r.reference, r.serviceType, r.description].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))));

  if (!truck) return <VehicleDetailFrame tab="maintenance" title="Vehicle not found"><EmptyState icon="wrench" title="Not found" /></VehicleDetailFrame>;

  const knownStatuses = records && records.every((record) => record.status !== '—');
  const completed = knownStatuses ? records.filter((r) => r.status === 'Completed').length : null;
  const upcoming = knownStatuses ? records.filter((r) => r.status === 'Upcoming').length : null;
  const overdue = knownStatuses ? records.filter((r) => r.status === 'Overdue').length : null;
  const totalCost = knownStatuses ? total(records.filter((record) => record.status === 'Completed'), 'cost') : null;
  const next = maintenanceData?.nextDue;
  const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
  const percent = (value) => value === null ? '—' : `${records.length ? Math.round(value / records.length * 100) : 0}%`;
  async function complete(record) {
    if (completing.current) return;
    if (!record.canComplete) { setRowMenu(null); showToast('Only scheduled or in-progress maintenance can be completed.'); return; }
    completing.current = true; setBusyRecord(record.id); setRowMenu(null);
    try { await completeMaintenance(record.id).unwrap(); }
    catch (err) { showToast(getApiErrorMessage(err)); }
    finally { completing.current = false; setBusyRecord(null); }
  }
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
              <DonutChart size={130} thickness={16} data={records && donutData.every((item) => item.value !== null) && donutData.reduce((sum, item) => sum + item.value, 0) === records.length ? donutData : []} centerValue={records?.length ?? '—'} centerLabel="Services" />
              <div style={{ display: 'grid', gap: 6, width: '100%' }}>
                {donutData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/18px var(--tk-font-sans)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color }} /><span style={{ flex: 1, color: 'var(--tk-ink-500)' }}>{d.label}</span><strong>{d.value ?? '—'}</strong>
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
                disabled={truck.remindersEnabled === null || savingReminders} onChange={async () => {
                  if (updatingReminders.current) return;
                  updatingReminders.current = true;
                  try { await updateVehicle({ id: truck.id, remindersEnabled: !truck.remindersEnabled }).unwrap(); }
                  catch (err) { showToast(getApiErrorMessage(err)); }
                  finally { updatingReminders.current = false; }
                }} />
            </span>
          </Card>
        </>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard icon="wrench" label="Total Services" value={records?.length ?? '—'} labelPosition="bottom" />
        <StatCard icon="circle-check" tint="green" label="Completed" value={completed ?? '—'} caption={percent(completed)} />
        <StatCard icon="clock-3" tint="amber" label="Upcoming" value={upcoming ?? '—'} caption={percent(upcoming)} />
        <StatCard icon="triangle-alert" tint="red" label="Overdue" value={overdue ?? '—'} caption={percent(overdue)} />
        <StatCard icon="banknote" tint="blue" label="Total Maintenance Cost" value={money(totalCost)} caption="All time" />
      </section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="tk-title" style={{ margin: 0 }}>Maintenance Records</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <SearchField placeholder="Search maintenance records..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={statusFilter} options={STATUS_OPTIONS} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>
      {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="wrench" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
        <EmptyState icon="wrench" title="No maintenance records" />
      ) : (
        <DataTable rows={filtered} rowKey={(m) => m.id} columns={[
          { key: 'date', header: 'Date', render: (m) => m.date },
          { key: 'serviceType', header: 'Service Type', render: (m) => m.serviceType },
          { key: 'description', header: 'Description', render: (m) => m.description },
          { key: 'odometer', header: 'Odometer', render: (m) => m.odometer === null ? '—' : `${m.odometer.toLocaleString()} km` },
          { key: 'cost', header: 'Cost (₦)', render: (m) => money(m.cost) },
          { key: 'status', header: 'Status', render: (m) => <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge> },
          { key: 'nextDue', header: 'Next Due', render: (m) => m.nextDue || '—' },
          { key: 'actions', header: 'Actions', render: (m) => (
            <span style={{ position: 'relative' }}>
              <Button size="sm" variant="outline" icon="ellipsis" disabled={!!busyRecord} onClick={() => setRowMenu(rowMenu === m.id ? null : m.id)} />
              {rowMenu === m.id && (
                <span style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20 }}>
                  <DropdownMenu width={190} items={[
                    ...(m.status !== 'Completed' ? [{ label: 'Mark Completed', icon: 'circle-check', onClick: () => complete(m) }] : []),
                    { label: 'Edit Record', icon: 'pencil', onClick: () => {
                      setRowMenu(null);
                      if (!m.canEdit) { showToast('Only requested or scheduled maintenance can be edited.'); return; }
                      setEditingRecord(m); setScheduleOpen(true);
                    } },
                  ]} />
                </span>
              )}
            </span>
          ) },
        ]} />
      )}
      <MaintenanceModal key={`${scheduleOpen}-${editingRecord?.id ?? ''}`} open={scheduleOpen} onClose={() => { setScheduleOpen(false); setEditingRecord(null); }} truckId={truck.id} record={editingRecord} />
      <Toast message={toast} />
    </VehicleDetailFrame>
  );
}
