import { Suspense } from 'react';
import { PayoutDetailFromQuery } from '../../../screens/PayoutDetail.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Payout Details' };

export default function PayoutDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><PayoutDetailFromQuery /></Suspense>;
}
