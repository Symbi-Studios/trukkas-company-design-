'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, PageHeader, SearchField, Select,
  SkeletonRow, StatCard, Tabs,
} from '../ds.js';
import { useGetFleetEligibilityQuery, useGetFleetMaintenanceQuery, useGetFleetQuery, useGetFleetRequirementsQuery } from '../store/features/fleet/fleetApi.js';
import { MAINTENANCE_STATUS_TONE } from '../store/features/fleet/fleetContracts.js';
import { MaintenanceModal } from '../components/MaintenanceModal.jsx';
import { MaintenanceActionModal, MaintenanceExportButton } from '../components/MaintenanceActions.jsx';
import { BlockedTrucks, RequirementList } from '../components/MaintenanceCompliance.jsx';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { syncTopBarSearch } from '../pageSearch.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import { formatNaira } from '../mock/format.js';

const STATUS_OPTIONS = ['All Status', 'Overdue', 'Awaiting Approval', 'Scheduled', 'In Progress', 'Awaiting Verification', 'Completed', 'Verified', 'Declined', 'Cancelled'];
const ORDER = { Overdue: 0, 'In Progress': 1, Scheduled: 2, 'Awaiting Approval': 3, 'Awaiting Verification': 4 };

export function Maintenance() {
  const navigate = useNavigate();
  const { currentData: maintenanceData, error, isLoading } = useGetFleetMaintenanceQuery(undefined, { refetchOnMountOrArgChange: true });
  const maintenance = error ? undefined : maintenanceData?.records;
  const { currentData: fleet, error: trucksError, isLoading: trucksLoading } = useGetFleetQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: eligibility, error: eligibilityError } = useGetFleetEligibilityQuery(undefined, { refetchOnMountOrArgChange: true });
  const requirementsQuery = useGetFleetRequirementsQuery(undefined, { refetchOnMountOrArgChange: true });
  const requirements = requirementsQuery.error ? undefined : requirementsQuery.currentData;
  const trucks = trucksError ? [] : fleet ?? [];
  const records = maintenance ?? [];
  const [tab, setTab] = useState('due');
  const [action, setAction] = useState(null);
  const [toast, showToast] = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const statusCount = (statuses) => !maintenance || records.some((record) => record.status === '—') ? '—' : records.filter((record) => statuses.includes(record.status)).length;
  const views = eligibilityError ? null : eligibility ? Object.values(eligibility) : null;
  const ready = views ? views.filter((view) => view.eligible === true).length : '—';
  const blocked = views ? views.filter((view) => view.eligible === false && view.reasonCode !== 'NOT_ACTIVE').length : '—';
  const dueSoon = requirements ? requirements.filter((req) => req.status === 'DUE_SOON').length : null;
  const due = requirements ? requirements.filter((req) => req.status !== 'UP_TO_DATE') : requirements;

  const filtered = useMemo(() => records
    .filter((r) => statusFilter === 'All Status' || r.status === statusFilter)
    .filter((r) => !query || [r.reference, r.truckPlate, r.serviceType, r.description].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9)), [records, query, statusFilter]);

  function scheduleFor(view) {
    setSchedule({ truckId: view.truckId });
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="Fleet Maintenance"
        description="Trukkas maintenance rules show when each truck is due. Trucks with overdue mandatory maintenance can’t take new jobs until the service is completed and cleared."
        actions={<><MaintenanceExportButton search={query} status={statusFilter} disabled={!maintenance} onToast={showToast} /><Button icon="plus" onClick={() => setSchedule({})}>Request Maintenance</Button></>}
      />
      <BlockedTrucks eligibility={eligibility} error={eligibilityError} onSchedule={scheduleFor} onOpen={(view) => navigate(fleetDetailHref(view.truckId, 'maintenance'))} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon="circle-check" tint="green" label="Ready for Jobs" value={ready} caption={views ? `of ${views.length} trucks` : undefined} />
        <StatCard icon="lock-keyhole" tint="red" label="Blocked from Jobs" value={blocked} caption="Maintenance or restriction" />
        <StatCard icon="triangle-alert" tint="amber" label="Overdue Services" value={statusCount(['Overdue'])} caption={dueSoon != null ? `${dueSoon} more due soon` : undefined} />
        <StatCard icon="hourglass" tint="blue" label="Waiting on Trukkas" value={statusCount(['Awaiting Approval', 'Awaiting Verification'])} caption="Approval or verification" />
      </section>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'due', label: 'Due List', count: due ? due.length : undefined },
          { value: 'records', label: 'Service Records', count: maintenance ? records.length : undefined },
        ]}
      />
      {tab === 'due' ? (
        <Card pad="none">
          {requirementsQuery.isLoading ? <SkeletonRow columns={4} /> : (
            <RequirementList requirements={due} error={requirementsQuery.error} onSchedule={(req) => setSchedule({ requirement: req })} />
          )}
        </Card>
      ) : (
        <Card pad="none">
          <div style={{ display: 'flex', gap: 10, padding: 14, borderBottom: '1px solid var(--tk-line)', flexWrap: 'wrap' }}>
            <SearchField style={{ flex: 1, minWidth: 220 }} placeholder="Search maintenance, trucks, service type..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
            <Select value={statusFilter} options={STATUS_OPTIONS} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 210 }} />
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
                { key: 'serviceType', header: 'Service', render: (r) => <span style={{ display: 'grid', gap: 2 }}><strong style={{ font: '600 13px/18px var(--tk-font-sans)' }}>{r.description}</strong><span className="tk-meta">{r.serviceType}{r.serviceCenter ? ` · ${r.serviceCenter}` : ''}</span></span> },
                { key: 'cost', header: 'Cost', render: (r) => r.cost !== null ? formatNaira(r.cost) : r.estimatedCost !== null ? <span className="tk-meta">est. {formatNaira(r.estimatedCost)}</span> : '—' },
                { key: 'status', header: 'Status', render: (r) => <span style={{ display: 'grid', gap: 2 }}><Badge tone={MAINTENANCE_STATUS_TONE[r.status]}>{r.status}</Badge>{r.status === 'Declined' && r.rejectionReason && <span className="tk-meta">{r.rejectionReason}</span>}{r.returnReason && r.status === 'In Progress' && <span className="tk-meta" style={{ color: 'var(--tk-danger)' }}>Sent back: {r.returnReason}</span>}</span> },
                { key: 'actions', header: 'Actions', render: (r) => r.canStart || r.canComplete || r.canCancel ? (
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation(); }}>
                    {r.canStart && <Button size="sm" variant="outline" icon="circle-play" disabled={!!action} onClick={() => setAction({ kind: 'start', record: r })}>Start</Button>}
                    {r.canComplete && <Button size="sm" icon="clipboard-check" disabled={!!action} onClick={() => setAction({ kind: 'complete', record: r })}>Record Completion</Button>}
                    {r.canCancel && <Button size="sm" variant="outline" icon="ban" disabled={!!action} onClick={() => setAction({ kind: 'cancel', record: r })}>Cancel</Button>}
                  </span>
                ) : '—' },
              ]}
            />
          )}
        </Card>
      )}
      {schedule && (
        <MaintenanceModal
          open
          onClose={() => setSchedule(null)}
          onDone={showToast}
          trucks={trucks}
          truckId={schedule.truckId}
          requirement={schedule.requirement}
          loading={trucksLoading}
          loadError={trucksError ? getApiErrorMessage(trucksError) : ''}
          formId="schedule-maintenance-form"
        />
      )}
      {action && <MaintenanceActionModal key={action.kind + '-' + action.record.id} record={action.record} action={action.kind} onClose={() => setAction(null)} onDone={(message) => { setAction(null); showToast(message); }} />}
      <Toast message={toast} />
    </div>
  );
}
