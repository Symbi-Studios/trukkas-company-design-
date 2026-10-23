'use client';

import { useRef, useState } from 'react';
import { useNavigate } from '../router.js';
import { Badge, BarChart, Button, Card, DataTable, EmptyState, SearchField, Select, SkeletonRow } from '../ds.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { useGetFleetTripsQuery, useLazyExportFleetTripsQuery } from '../store/features/fleet/fleetApi.js';
import { fleetEarningsSeries, total } from '../store/features/fleet/fleetContracts.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

const STATUS_OPTIONS = ['All Status', 'In Transit', 'Completed', 'Cancelled'];

export function VehicleTripsHistory() {
  const navigate = useNavigate();
  const { truck } = useFleetVehicle();
  const { currentData: loadedTrips, error, isLoading } = useGetFleetTripsQuery(truck?.id, { skip: !truck, refetchOnMountOrArgChange: true });
  const trips = error ? undefined : loadedTrips;
  const [toast, showToast] = useToast();
  const [exportTrips, { isFetching: exporting }] = useLazyExportFleetTripsQuery();
  const downloading = useRef(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  async function download() {
    if (downloading.current) return;
    downloading.current = true;
    try {
      const file = await exportTrips({ truckId: truck.id, search: query, status: statusFilter }).unwrap();
      const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'vehicle-trips.csv'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { showToast(getApiErrorMessage(err)); }
    finally { downloading.current = false; }
  }

  if (!truck) return <VehicleDetailFrame tab="trips" title="Vehicle not found"><EmptyState icon="route" title="Not found" /></VehicleDetailFrame>;

  const filtered = (trips ?? []).filter((t) =>
    (statusFilter === 'All Status' || t.status === statusFilter)
    && (!query || [t.id, t.number, t.route, t.cargoType].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))));

  const knownStatuses = trips && trips.every((trip) => trip.status !== '—');
  const completed = trips?.filter((t) => t.status === 'Completed');
  const cancelled = knownStatuses ? trips.filter((t) => t.status === 'Cancelled').length : '—';
  const ongoing = knownStatuses ? trips.filter((t) => !['Completed', 'Cancelled', 'Disputed'].includes(t.status)).length : '—';
  const totalEarnings = total(trips, 'budget');
  const series = fleetEarningsSeries(trips);
  const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
  const routeCounts = Object.values((trips ?? []).filter((trip) => trip.route !== '—').reduce((acc, t) => {
    if (!acc[t.route]) acc[t.route] = { route: t.route, count: 0 };
    acc[t.route].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <VehicleDetailFrame
      tab="trips"
      title="Trip History"
      description="View all trips completed by this truck, including routes, cargo, earnings, and status."
      rail={
        <>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Trip Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Total Trips', trips?.length ?? '—', 'blue'], ['Completed', knownStatuses ? completed.length : '—', 'green'], ['Ongoing', ongoing, 'amber'], ['Cancelled', cancelled, 'red']].map(([label, value, tint]) => (
                <div key={label} style={{ padding: 10, borderRadius: 'var(--tk-r-md)', background: 'var(--tk-surface-sunk)' }}>
                  <span style={{ display: 'block', font: '700 20px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{value}</span>
                  <span className="tk-meta">{label}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Total Earnings</h3>
            <span style={{ font: '700 26px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{money(totalEarnings)}</span>
            <BarChart height={110} labels={series?.labels ?? []} series={series ? [{ name: 'Earnings', color: 'var(--tk-blue)', points: series.points }] : []} format={series ? (value) => value : () => '—'} />
          </Card>
          <Card style={{ display: 'grid', gap: 8 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Top Routes</h3>
            {!trips || trips.some((trip) => trip.route === '—') ? <span className="tk-meta">—</span> : routeCounts.length === 0 ? <span className="tk-meta">No trips yet.</span> : routeCounts.map((r) => (
              <div key={r.route} style={{ display: 'flex', justifyContent: 'space-between', font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>
                <span>{r.route}</span><strong style={{ color: 'var(--tk-ink-900)' }}>{r.count} trip{r.count === 1 ? '' : 's'}</strong>
              </div>
            ))}
          </Card>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchField style={{ flex: 1, minWidth: 200 }} placeholder="Search trips..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={statusFilter} options={STATUS_OPTIONS} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }} />
        <Button variant="outline" icon="download" disabled={exporting} onClick={download}>Export</Button>
      </div>
      {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="route" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
        <EmptyState icon="route" title="No trips yet" description="This vehicle hasn't been assigned to a trip yet." />
      ) : (
        <DataTable rows={filtered} rowKey={(t) => t.id} onRowClick={(t) => navigate(tripDetailHref(t.id))} columns={[
          { key: 'id', header: 'Trip ID', render: (t) => t.number },
          { key: 'route', header: 'Route', render: (t) => t.route },
          { key: 'cargo', header: 'Cargo', render: (t) => t.cargoType },
          { key: 'pickup', header: 'Pickup Date', render: (t) => t.pickupDate || '—' },
          { key: 'earnings', header: 'Earnings (₦)', render: (t) => money(t.budget) },
          { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : t.status === 'Cancelled' ? 'danger' : 'info'}>{t.status}</Badge> },
        ]} />
      )}
      <Toast message={toast} />
    </VehicleDetailFrame>
  );
}
