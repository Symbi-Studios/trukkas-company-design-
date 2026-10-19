import { Suspense } from 'react';
import { FleetDetailFromQuery } from '../../../screens/FleetDetailFromQuery.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Vehicle Details' };
export default function FleetDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={4} />}><FleetDetailFromQuery /></Suspense>;
}
