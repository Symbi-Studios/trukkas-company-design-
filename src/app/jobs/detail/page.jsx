import { Suspense } from 'react';
import { JobDetailFromQuery } from '../../../screens/JobDetail.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Job Details' };

export default function JobDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><JobDetailFromQuery /></Suspense>;
}
