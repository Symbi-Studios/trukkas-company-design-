import { Suspense } from 'react';
import { TripDetailFromQuery } from '../../../screens/TripDetail.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Trip Details' };

export default function TripDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><TripDetailFromQuery /></Suspense>;
}
