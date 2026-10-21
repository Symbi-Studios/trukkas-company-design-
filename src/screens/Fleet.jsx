'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  ActivityFeed, Badge, Button, Card, DataTable, DonutChart, DropdownMenu, EmptyState, Icon, LegendList,
  PageHeader, SearchField, SkeletonRow, StatCard,
} from '../ds.js';
import { useGetFleetQuery, useUpdateFleetVehicleMutation } from '../store/features/fleet/fleetApi.js';
import { EMPTY_DASHBOARD, useGetCompanyDashboardQuery } from '../store/features/dashboard/dashboardApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { syncTopBarSearch } from '../pageSearch.js';
import { VEHICLE_CLASSES, vehicleStatusTone } from '../domain/vehicles.js';

const VEHICLE_TABS = ['All Vehicles', 'Trucks', 'Trailers', 'Others'];

function typeGroup(vehicleClass) {
  if (vehicleClass === 'Trailer') return 'Trailers';
  if (vehicleClass === 'Head') return 'Trucks';
  return vehicleClass === '—' ? null : 'Others';
}

export function Fleet() {
  const navigate = useNavigate();
  const { data: fleet, error, isLoading } = useGetFleetQuery(undefined, { refetchOnMountOrArgChange: true });
  const trucks = fleet ?? [];
  const { data: dashboard = EMPTY_DASHBOARD } = useGetCompanyDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  const [toast, showToast] = useToast();
  const [updateVehicle, { isLoading: updating }] = useUpdateFleetVehicleMutation();
  const mutating = useRef(false);
  async function changeStatus(truck) {
    if (mutating.current) return;
    mutating.current = true; setRowMenu(null);
    try { await updateVehicle({ id: truck.id, status: truck.status === 'Inactive' ? 'Active' : 'Inactive' }).unwrap(); }
    catch (err) { showToast(getApiErrorMessage(err)); }
    finally { mutating.current = false; }
  }
  const statusCount = (statuses) => {
    const values = statuses.map((status) => dashboard.fleetStatus.find((item) => item.label === status)?.value);
    return values.some((value) => typeof value !== 'number') ? null : values.reduce((sum, value) => sum + value, 0);
  };
  const typeCount = (group) => !fleet || trucks.some((truck) => !typeGroup(truck.vehicleClass)) ? '—' : trucks.filter((truck) => typeGroup(truck.vehicleClass) === group).length;
  const unavailableAction = () => showToast('This fleet action is currently unavailable from the API.');
  const [tab, setTab] = useState('All Vehicles');
  const [query, setQuery] = useState('');
  const [rowMenu, setRowMenu] = useState(null);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => trucks
    .filter((t) => tab === 'All Vehicles' || typeGroup(t.vehicleClass) === tab)
    .filter((t) => !query || [t.plate, t.makeModel, t.driver].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))),
  [trucks, tab, query]);

  const statusBreakdown = dashboard.fleetStatus;
  const recentActivity = useMemo(() => trucks
    .flatMap((t) => (t.activityLog || []).map((a) => ({ ...a, plate: t.plate })))
    .sort((a, b) => (b.occurredAt ?? -Infinity) - (a.occurredAt ?? -Infinity))
    .slice(0, 5)
    .map((a) => ({ text: `${a.plate} ${a.title.charAt(0).toLowerCase() + a.title.slice(1)}`, time: a.time })),
  [trucks]);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="My Fleet"
        description="Manage your trucks, trailers, and other fleet assets."
        actions={<Button icon="plus" onClick={() => navigate('/fleet/new')}>Add Vehicle</Button>}
      />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="truck" label="Total Vehicles" value={dashboard.totalTrucks ?? (fleet ? trucks.length : '—')} />
        <StatCard icon="circle-check" tint="green" label="Active" value={statusCount(['Active', 'On Trip']) ?? '—'} />
        <StatCard icon="wrench" tint="amber" label="In Maintenance" value={statusCount(['In Maintenance']) ?? '—'} />
        <StatCard icon="circle-off" tint="red" label="Inactive" value={statusCount(['Inactive']) ?? '—'} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card pad="none">
          <div style={{ display: 'flex', gap: 24, padding: '0 16px', borderBottom: '1px solid var(--tk-line)', overflowX: 'auto' }}>
            {VEHICLE_TABS.map((t) => (
              <button key={t} type="button" onClick={() => {
                if (t !== 'All Vehicles' && (!fleet || trucks.some((truck) => truck.vehicleClass === '—'))) { showToast('Vehicle class filtering is currently unavailable from the API.'); return; }
                setTab(t);
              }} style={{
                height: 46, border: 0, borderBottom: '2px solid ' + (tab === t ? 'var(--tk-blue)' : 'transparent'),
                background: 'transparent', color: tab === t ? 'var(--tk-blue)' : 'var(--tk-ink-400)',
                font: (tab === t ? 600 : 500) + ' 14px/1 var(--tk-font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{t} ({t === 'All Vehicles' ? fleet ? trucks.length : '—' : typeCount(t)})</button>
            ))}
          </div>
          <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
            <SearchField placeholder="Search vehicles..." value={query} onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }} />
          </div>
          {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="truck" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
            <EmptyState icon="truck" title="No vehicles found" description="Try a different tab or search term." />
          ) : (
            <DataTable
              rows={filtered}
              rowKey={(t) => t.id}
              onRowClick={(t) => navigate(fleetDetailHref(t.id))}
              columns={[
                {
                  key: 'vehicle', header: 'Vehicle', render: (t) => (
                    <Link to={fleetDetailHref(t.id)} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 'var(--tk-r-sm)', background: 'var(--tk-surface-sunk)', color: 'var(--tk-ink-400)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                        <Icon name={VEHICLE_CLASSES.find((c) => c.value === t.vehicleClass)?.icon || 'truck'} size={18} />
                      </span>
                      <span>
                        <strong style={{ display: 'block', color: 'var(--tk-ink-900)' }}>{t.plate}</strong>
                        <span className="tk-meta">{t.makeModel}</span>
                      </span>
                    </Link>
                  ),
                },
                { key: 'type', header: 'Type', render: (t) => t.type },
                { key: 'reg', header: 'Registration No.', render: (t) => t.plate },
                { key: 'status', header: 'Status', render: (t) => <Badge tone={vehicleStatusTone(t.status)} dot>{t.status}</Badge> },
                { key: 'driver', header: 'Driver', render: (t) => t.driver || '—' },
                { key: 'lastActive', header: 'Last Active', render: (t) => t.odometerUpdated },
                {
                  key: 'actions', header: 'Actions', width: 56, render: (t) => (
                    <span style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" icon="ellipsis" disabled={updating} onClick={() => setRowMenu(rowMenu === t.id ? null : t.id)} />
                      {rowMenu === t.id && (
                        <span style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20 }}>
                          <DropdownMenu width={200} items={[
                            { label: 'View Details', icon: 'eye', onClick: () => { setRowMenu(null); navigate(fleetDetailHref(t.id)); } },
                            { label: 'View Documents', icon: 'file-text', onClick: () => { setRowMenu(null); navigate(fleetDetailHref(t.id, 'documents')); } },
                            { label: 'Mark for Maintenance', icon: 'wrench', onClick: () => { setRowMenu(null); unavailableAction(); } },
                            { divider: true },
                            { label: t.status === 'Inactive' ? 'Activate Truck' : 'Deactivate Truck', icon: 'power', tone: 'danger', onClick: () => changeStatus(t) },
                          ]} />
                        </span>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
          <Card style={{ display: 'grid', gap: 12 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Fleet Overview</h3>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
              <DonutChart size={150} thickness={20} data={dashboard.fleetChartData} centerValue={dashboard.totalTrucks ?? (fleet ? trucks.length : '—')} centerLabel="Vehicles" />
              <LegendList style={{ width: '100%' }} items={statusBreakdown} />
            </div>
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Vehicle Types</h3>
            {VEHICLE_CLASSES.map((c) => {
              const count = !fleet || trucks.some((t) => t.vehicleClass === '—') ? '—' : trucks.filter((t) => t.vehicleClass === c.value).length;
              return (
                <div key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={c.icon} size={15} color="var(--tk-blue)" />
                  <span style={{ flex: 1, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{c.label}</span>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="tk-title" style={{ margin: 0 }}>Recent Activity</h3>
            </div>
            {recentActivity.length ? <ActivityFeed items={recentActivity} /> : <span className="tk-meta">—</span>}
          </Card>
          <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="headphones" size={18} color="var(--tk-blue)" />
            <span>
              <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>Need Help?</strong>
              <span className="tk-meta">For fleet management support, contact our team.</span>
              <Button variant="outline" size="sm" fullWidth style={{ marginTop: 10 }} onClick={() => navigate('/support/new')}>Contact Support</Button>
            </span>
          </Card>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
