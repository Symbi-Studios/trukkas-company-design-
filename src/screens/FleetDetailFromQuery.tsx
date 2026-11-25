'use client';

import { useSearchParams } from 'next/navigation';
import { FleetVehicleContext } from '../store/features/fleet/useFleetVehicle';
import { VehicleDetail } from './VehicleDetail';
import { VehicleDocuments } from './VehicleDocuments';
import { VehicleMaintenance } from './VehicleMaintenance';
import { VehicleTripsHistory } from './VehicleTripsHistory';
import { VehicleFuelCosts } from './VehicleFuelCosts';
import { VehicleActivityLog } from './VehicleActivityLog';

const screens = { overview: VehicleDetail, documents: VehicleDocuments, maintenance: VehicleMaintenance, trips: VehicleTripsHistory, costs: VehicleFuelCosts, activity: VehicleActivityLog };
export function FleetDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('vehicleId'), sections = params.getAll('section');
  const id = ids.length === 1 ? ids[0].trim() : '';
  const section = sections.length === 1 && Object.hasOwn(screens, sections[0]) ? sections[0] : 'overview';
  const Screen = screens[section as keyof typeof screens];
  return <FleetVehicleContext.Provider value={id}><Screen key={`${id}:${section}`} /></FleetVehicleContext.Provider>;
}
