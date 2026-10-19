'use client';

import { createContext, useContext } from 'react';
import { useParams } from '../../../router.js';
import { useGetFleetQuery } from './fleetApi.js';

export const FleetVehicleContext = createContext(null);
export function useFleetVehicle() {
  const requestedId = useContext(FleetVehicleContext);
  const params = useParams();
  const id = requestedId ?? params.vehicleId;
  const result = useGetFleetQuery(undefined, { refetchOnMountOrArgChange: true });
  const truck = result.data?.find((item) => item.id === id || (requestedId === null && item.plate.replace(/\s+/g, '-') === id));
  return { ...result, truck, vehicleId: truck?.id ?? id };
}
