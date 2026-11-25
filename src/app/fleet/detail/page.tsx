import { Suspense } from 'react';
import { FleetDetailFromQuery } from '../../../screens/FleetDetailFromQuery';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton';

export const metadata = { title: 'Vehicle Details' };
export default function FleetDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={4} />}><FleetDetailFromQuery /></Suspense>;
}
