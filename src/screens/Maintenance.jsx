'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, PageHeader, SearchField,
  SkeletonRow, StatCard,
} from '../ds.js';
import { useGetFleetMaintenanceQuery, useGetFleetQuery } from '../store/features/fleet/fleetApi.js';
import { MaintenanceModal } from '../components/MaintenanceModal.jsx';
import { MaintenanceActionModal, MaintenanceExportButton } from '../components/MaintenanceActions.jsx';
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
  const [action, setAction] = useState(null);
  const [toast, showToast] = useToast();
  const statusCount = (statuses) => !maintenance || records.some((record) => record.status === '—') ? '—' : records.filter((record) => statuses.includes(record.status)).length;
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
      <PageHeader title="Fleet Maintenance" description="Track scheduled, upcoming, and overdue maintenance across your fleet." actions={<><MaintenanceExportButton search={query} disabled={!maintenance} onToast={showToast} /><Button icon="plus" onClick={() => setScheduleOpen(true)}>Schedule Maintenance</Button></>} />
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
              { key: 'actions', header: 'Actions', render: (r) => r.canStart || r.canComplete || r.canCancel ? (
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}>
                  {r.canStart && <Button size="sm" variant="outline" icon="circle-play" disabled={!!action} onClick={() => setAction({ kind: 'start', record: r })}>Start</Button>}
                  {r.canComplete && <Button size="sm" variant="outline" disabled={!!action} onClick={() => setAction({ kind: 'complete', record: r })}>Mark Completed</Button>}
                  {r.canCancel && <Button size="sm" variant="outline" icon="ban" disabled={!!action} onClick={() => setAction({ kind: 'cancel', record: r })}>Cancel</Button>}
                </span>
              ) : '—' },
            ]}
          />
        )}
      </Card>
      <MaintenanceModal key={String(scheduleOpen)} open={scheduleOpen} onClose={() => setScheduleOpen(false)} trucks={trucks} loading={trucksLoading} loadError={trucksError ? getApiErrorMessage(trucksError) : ''} width={460} formId="schedule-maintenance-form" />
      {action && <MaintenanceActionModal key={action.kind + '-' + action.record.id} record={action.record} action={action.kind} onClose={() => setAction(null)} onDone={(message) => { setAction(null); showToast(message); }} />}
      <Toast message={toast} />
    </div>
  );
}
