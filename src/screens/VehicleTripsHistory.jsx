'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, BarChart, Button, Card, DataTable, EmptyState, SearchField, Select } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { findTruckBySlug } from '../domain/vehicles.js';
import { jobRate } from '../domain/jobs.js';
import { withJobs } from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

const STATUS_OPTIONS = ['All Status', 'In Transit', 'Completed', 'Cancelled'];

export function VehicleTripsHistory() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const trucks = useCollection('trucks') || [];
  const jobs = useCollection('jobs') || [];
  const allTrips = useCollection('trips') || [];
  const truck = findTruckBySlug(trucks, vehicleId);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const trips = useMemo(() => withJobs(allTrips, jobs)
    .filter((trip) => trip.truckPlate === truck?.plate)
    .map((trip) => ({ ...trip, cargoType: trip.job?.cargoType, budget: jobRate(trip.job), route: `${trip.job?.origin} → ${trip.job?.destination}` }))
    .sort((a, b) => b.id.localeCompare(a.id)), [allTrips, jobs, truck?.plate]);

  if (!truck) return <VehicleDetailFrame tab="trips" title="Vehicle not found"><EmptyState icon="route" title="Not found" /></VehicleDetailFrame>;

  const filtered = trips.filter((t) =>
    (statusFilter === 'All Status' || t.status === statusFilter)
    && (!query || [t.id, t.route, t.cargoType].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))));

  const completed = trips.filter((t) => t.status === 'Completed');
  const cancelled = trips.filter((t) => t.status === 'Cancelled').length;
  const ongoing = trips.filter((t) => !['Completed', 'Cancelled'].includes(t.status)).length;
  const totalEarnings = completed.reduce((sum, t) => sum + (t.budget || 0), 0);
  const routeCounts = Object.values(trips.reduce((acc, t) => {
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
              {[['Total Trips', trips.length, 'blue'], ['Completed', completed.length, 'green'], ['Ongoing', ongoing, 'amber'], ['Cancelled', cancelled, 'red']].map(([label, value, tint]) => (
                <div key={label} style={{ padding: 10, borderRadius: 'var(--tk-r-md)', background: 'var(--tk-surface-sunk)' }}>
                  <span style={{ display: 'block', font: '700 20px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{value}</span>
                  <span className="tk-meta">{label}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Total Earnings</h3>
            <span style={{ font: '700 26px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{formatNaira(totalEarnings)}</span>
            <BarChart height={110} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']} series={[{ name: 'Earnings', color: 'var(--tk-blue)', points: [1.2, 1.6, 1.1, 1.8, 2.0, Math.max(0.4, totalEarnings / 1_000_000)] }]} />
          </Card>
          <Card style={{ display: 'grid', gap: 8 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Top Routes</h3>
            {routeCounts.length === 0 ? <span className="tk-meta">No trips yet.</span> : routeCounts.map((r) => (
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
        <Button variant="outline" icon="download">Export</Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="route" title="No trips yet" description="This vehicle hasn't been assigned to a trip yet." />
      ) : (
        <DataTable rows={filtered} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/trips/${t.id}`)} columns={[
          { key: 'id', header: 'Trip ID', render: (t) => t.id },
          { key: 'route', header: 'Route', render: (t) => t.route },
          { key: 'cargo', header: 'Cargo', render: (t) => t.cargoType },
          { key: 'pickup', header: 'Pickup Date', render: (t) => t.pickupDate || '—' },
          { key: 'earnings', header: 'Earnings (₦)', render: (t) => formatNaira(t.budget) },
          { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : t.status === 'Cancelled' ? 'danger' : 'info'}>{t.status}</Badge> },
        ]} />
      )}
    </VehicleDetailFrame>
  );
}
