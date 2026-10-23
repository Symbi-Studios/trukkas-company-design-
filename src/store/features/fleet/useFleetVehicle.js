'use client';

import { createContext, useContext } from 'react';
import { useParams } from '../../../router.js';
import { useGetFleetQuery, useGetFleetVehicleQuery } from './fleetApi.js';

export const FleetVehicleContext = createContext(null);
export function useFleetVehicle() {
  const requestedId = useContext(FleetVehicleContext);
  const params = useParams();
  const id = requestedId ?? params.vehicleId;
  const legacy = useGetFleetQuery(undefined, { skip: requestedId !== null, refetchOnMountOrArgChange: true });
  const legacyError = requestedId === null ? legacy.error : undefined;
  const legacyTruck = requestedId === null && !legacyError ? legacy.currentData?.find((item) => item.id === id || item.plate.replace(/\s+/g, '-') === id) : null;
  const vehicleId = requestedId !== null ? id : legacyTruck?.id;
  const result = useGetFleetVehicleQuery(vehicleId, { skip: !vehicleId, refetchOnMountOrArgChange: true });
  return { ...result, truck: result.error || legacyError ? null : result.currentData, vehicleId: vehicleId ?? id, isLoading: requestedId === null && legacy.isLoading || result.isLoading, error: result.error ?? legacyError };
}
