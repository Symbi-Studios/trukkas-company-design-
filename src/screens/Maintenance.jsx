'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, PageHeader, SearchField,
  SkeletonRow, StatCard,
} from '../ds.js';
import { useCompleteFleetMaintenanceMutation, useGetFleetMaintenanceQuery, useGetFleetQuery } from '../store/features/fleet/fleetApi.js';
import { MaintenanceModal } from '../components/MaintenanceModal.jsx';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { syncTopBarSearch } from '../pageSearch.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import { formatNaira } from '../mock/format.js';

const STATUS_TONE = { Completed: 'success', Upcoming: 'info', Requested: 'info', 'In Progress': 'warning', Overdue: 'danger', Cancelled: 'neutral', Rejected: 'danger' };

export function Maintenance() {
  const navigate = useNavigate();
  const { currentData: maintenanceData, error, isLoading } = useGetFleetMaintenanceQuery(undefined, { refetchOnMountOrArgChange: true });
  const maintenance = error ? undefined : maintenanceData?.records;
  const { currentData: fleet, error: trucksError, isLoading: trucksLoading } = useGetFleetQuery(undefined, { refetchOnMountOrArgChange: true });
  const trucks = trucksError ? [] : fleet ?? [];
  const records = maintenance ?? [];
  const [completeMaintenance] = useCompleteFleetMaintenanceMutation();
  const [busyRecord, setBusyRecord] = useState(null);
  const completing = useRef(false);
  const [toast, showToast] = useToast();
  const statusCount = (statuses) => !maintenance || records.some((record) => record.status === '—') ? '—' : records.filter((record) => statuses.includes(record.status)).length;
  async function complete(record) {
    if (completing.current) return;
    if (!record.canComplete) { showToast('Only scheduled or in-progress maintenance can be completed.'); return; }
    completing.current = true; setBusyRecord(record.id);
    try { await completeMaintenance({ id: record.id, truckId: record.truckId }).unwrap(); }
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
    .filter((r) => !query || [r.reference, r.truckPlate, r.serviceType, r.description].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => Number(b.status === 'Overdue') - Number(a.status === 'Overdue')), [records, query]);

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
                <Button size="sm" variant="outline" disabled={!!busyRecord || !r.canComplete} onClick={(e) => { e.stopPropagation(); complete(r); }}>Mark Completed</Button>
              ) },
            ]}
          />
        )}
      </Card>
      <MaintenanceModal key={String(scheduleOpen)} open={scheduleOpen} onClose={() => setScheduleOpen(false)} trucks={trucks} loading={trucksLoading} loadError={trucksError ? getApiErrorMessage(trucksError) : ''} width={460} formId="schedule-maintenance-form" />
      <Toast message={toast} />
    </div>
  );
}
