'use client';

import { Card, EmptyState, StatCard } from '../ds.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { useGetFleetMaintenanceQuery, useGetFleetTripsQuery } from '../store/features/fleet/fleetApi.js';
import { total } from '../store/features/fleet/fleetContracts.js';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

export function VehicleFuelCosts() {
  const { truck } = useFleetVehicle();
  const { currentData: maintenanceData } = useGetFleetMaintenanceQuery(truck?.id, { skip: !truck });
  const maintenance = maintenanceData?.records;
  const { data: trips } = useGetFleetTripsQuery(truck?.id, { skip: !truck });
  const totalMaintenanceCost = maintenance?.every((record) => record.status !== '—') ? total(maintenance.filter((record) => record.status === 'Completed'), 'cost') : null;
  const totalEarnings = total(trips, 'budget');
  const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';

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
          <strong>{money(totalMaintenanceCost)}</strong>
        </Card>
      }
    >
      <section className="tk-money-stats" data-fit style={{ gap: 12, marginBottom: 20 }}>
        <StatCard icon="wrench" label="Total Maintenance Cost" value={money(totalMaintenanceCost)} labelPosition="bottom" />
        <StatCard icon="banknote" tint="green" label="Total Trip Earnings" value={money(totalEarnings)} labelPosition="bottom" />
        <StatCard icon="gauge" tint="purple" label="Net (Earnings − Maintenance)" value={money(totalEarnings === null || totalMaintenanceCost === null ? null : totalEarnings - totalMaintenanceCost)} labelPosition="bottom" />
      </section>
      <EmptyState icon="fuel" title="Fuel logging isn't set up yet" description="Fuel purchases will appear here once fuel-card or receipt tracking is connected." />
    </VehicleDetailFrame>
  );
}
