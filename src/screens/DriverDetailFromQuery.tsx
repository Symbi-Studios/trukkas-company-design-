'use client';

import { useSearchParams } from 'next/navigation';
import { DriverDetail } from './DriverDetail';

export function DriverDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('driverId');
  const id = ids.length === 1 ? ids[0].trim() : '';
  return <DriverDetail key={id} driverId={id} />;
}
