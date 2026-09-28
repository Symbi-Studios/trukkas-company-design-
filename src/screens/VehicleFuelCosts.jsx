'use client';

import { useMemo } from 'react';
import { useParams } from '../router.js';
import { Card, EmptyState, StatCard } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { findTruckBySlug } from '../domain/vehicles.js';
import { jobRate } from '../domain/jobs.js';
import { withJobs } from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

export function VehicleFuelCosts() {
  const { vehicleId } = useParams();
  const trucks = useCollection('trucks') || [];
  const maintenance = useCollection('maintenance') || [];
  const jobs = useCollection('jobs') || [];
  const allTrips = useCollection('trips') || [];
  const truck = findTruckBySlug(trucks, vehicleId);

  const totalMaintenanceCost = useMemo(() => maintenance
    .filter((m) => m.truckPlate === truck?.plate)
    .reduce((sum, m) => sum + (m.cost || 0), 0), [maintenance, truck?.plate]);
  const totalEarnings = useMemo(() => withJobs(allTrips, jobs)
    .filter((trip) => trip.truckPlate === truck?.plate && trip.status === 'Completed')
    .reduce((sum, trip) => sum + jobRate(trip.job), 0), [allTrips, jobs, truck?.plate]);

  if (!truck) return <VehicleDetailFrame tab="costs" title="Vehicle not found"><EmptyState icon="fuel" title="Not found" /></VehicleDetailFrame>;

  return (
    <VehicleDetailFrame
      tab="costs"
      title="Fuel & Costs"
      description="Track running costs for this truck against the earnings it has generated."
      rail={
        <Card style={{ display: 'grid', gap: 6 }}>
          <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Cost Summary</h3>
          <span className="tk-meta">Total Maintenance Cost</span>
          <strong>{formatNaira(totalMaintenanceCost)}</strong>
        </Card>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="wrench" label="Total Maintenance Cost" value={formatNaira(totalMaintenanceCost)} labelPosition="bottom" />
        <StatCard icon="banknote" tint="green" label="Total Trip Earnings" value={formatNaira(totalEarnings)} labelPosition="bottom" />
        <StatCard icon="gauge" tint="purple" label="Net (Earnings − Maintenance)" value={formatNaira(totalEarnings - totalMaintenanceCost)} labelPosition="bottom" />
      </section>
      <EmptyState icon="fuel" title="Fuel logging isn't set up yet" description="Fuel purchases will appear here once fuel-card or receipt tracking is connected." />
    </VehicleDetailFrame>
  );
}
