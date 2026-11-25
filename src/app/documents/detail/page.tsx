import { Suspense } from 'react';
import { DocumentDetailFromQuery } from '../../../screens/DocumentDetailFromQuery';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton';

export const metadata = { title: 'Document Details' };
export default function DocumentDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={4} />}><DocumentDetailFromQuery /></Suspense>;
}
