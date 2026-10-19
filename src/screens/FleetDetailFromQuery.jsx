'use client';

import { useSearchParams } from 'next/navigation';
import { FleetVehicleContext } from '../store/features/fleet/useFleetVehicle.js';
import { VehicleDetail } from './VehicleDetail.jsx';
import { VehicleDocuments } from './VehicleDocuments.jsx';
import { VehicleMaintenance } from './VehicleMaintenance.jsx';
import { VehicleTripsHistory } from './VehicleTripsHistory.jsx';
import { VehicleFuelCosts } from './VehicleFuelCosts.jsx';
import { VehicleActivityLog } from './VehicleActivityLog.jsx';

const screens = { overview: VehicleDetail, documents: VehicleDocuments, maintenance: VehicleMaintenance, trips: VehicleTripsHistory, costs: VehicleFuelCosts, activity: VehicleActivityLog };
export function FleetDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('vehicleId'), sections = params.getAll('section');
  const id = ids.length === 1 ? ids[0].trim() : '';
  const section = sections.length === 1 && Object.hasOwn(screens, sections[0]) ? sections[0] : 'overview';
  const Screen = screens[section];
  return <FleetVehicleContext.Provider value={id}><Screen key={`${id}:${section}`} /></FleetVehicleContext.Provider>;
}
