// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
'use client';

import { useState } from 'react';
import { Button, Card, DataTable, EmptyState, SkeletonRow, StatCard } from '../ds';
import { FleetFuelLogModal } from '../components/FleetVehicleModals';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle';
import { useGetFleetFuelLogsQuery } from '../store/features/fleet/fleetApi';
import { formatNaira } from '../mock/format';
import { VehicleDetailFrame } from './VehicleDetailFrame';

export function VehicleFuelCosts() {
  const { truck } = useFleetVehicle();
  const [fuelOpen, setFuelOpen] = useState(false);
  const { currentData: fuelData, error: fuelError, isLoading: fuelLoading } = useGetFleetFuelLogsQuery(truck?.id, { skip: !truck, refetchOnMountOrArgChange: true });
  const fuel = fuelError ? undefined : fuelData;
  const litres = (value) => typeof value === 'number' ? value.toLocaleString() + ' L' : '—';
  const totalMaintenanceCost = truck?.maintenanceCost ?? null;
  const totalEarnings = truck?.netEarned ?? null;
  const incomplete = truck?.maintenanceWithoutCost;
  const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';

  if (!truck) return <VehicleDetailFrame tab="costs" title="Vehicle not found"><EmptyState icon="fuel" title="Not found" /></VehicleDetailFrame>;

  return (
    <VehicleDetailFrame
      tab="costs"
      title="Fuel & Costs"
      primaryAction={<Button icon="plus" onClick={() => setFuelOpen(true)}>Log Fuel Purchase</Button>}
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
        <StatCard icon="gauge" tint="purple" label="Net (Earnings − Maintenance)" value={money(truck?.netAfterMaintenance)} caption={incomplete === null || incomplete === undefined ? '—' : incomplete > 0 ? 'Incomplete: some maintenance costs are missing' : undefined} labelPosition="bottom" />
      </section>
      <section className="tk-money-stats" data-fit style={{ gap: 12, marginBottom: 20 }}>
        <StatCard icon="fuel" label="Fuel Purchased" value={litres(fuel?.totalLitres)} labelPosition="bottom" />
        <StatCard icon="banknote" label="Fuel Spend" value={money(fuel?.totalAmount)} labelPosition="bottom" />
        <StatCard icon="fuel" label="This Month's Fuel Spend" value={money(fuel?.monthAmount)} labelPosition="bottom" />
        <StatCard icon="gauge" label="Average Price per Litre" value={money(fuel?.averagePricePerLitre)} labelPosition="bottom" />
      </section>
      <h3 className="tk-title" style={{ marginBottom: 12 }}>Fuel Purchases</h3>
      {fuelLoading ? <SkeletonRow columns={7} /> : fuelError ? <EmptyState icon="fuel" title={getApiErrorMessage(fuelError)} /> : !fuel?.logs.length ? (
        <EmptyState icon="fuel" title="No fuel purchases" />
      ) : <DataTable rows={fuel.logs} rowKey={(entry) => entry.id} columns={[
        { key: 'date', header: 'Date', render: (entry) => entry.date },
        { key: 'litres', header: 'Litres', render: (entry) => litres(entry.litres) },
        { key: 'amount', header: 'Cost (₦)', render: (entry) => money(entry.amount) },
        { key: 'price', header: 'Price / Litre', render: (entry) => money(entry.pricePerLitre) },
        { key: 'odometer', header: 'Odometer', render: (entry) => entry.odometer === null ? '—' : entry.odometer.toLocaleString() + ' km' },
        { key: 'station', header: 'Station', render: (entry) => entry.station },
        { key: 'fuelType', header: 'Fuel Type', render: (entry) => entry.fuelType },
      ]} />}
      {fuelOpen && <FleetFuelLogModal key={truck.id} truckId={truck.id} onClose={() => setFuelOpen(false)} />}
    </VehicleDetailFrame>
  );
}
