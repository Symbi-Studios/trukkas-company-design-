import { Suspense } from 'react';
import { DriverDetailFromQuery } from '../../../screens/DriverDetailFromQuery';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton';

export const metadata = { title: 'Driver Details' };
export default function DriverDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={4} />}><DriverDetailFromQuery /></Suspense>;
}
