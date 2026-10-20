import { Suspense } from 'react';
import { DocumentDetailFromQuery } from '../../../screens/DocumentDetailFromQuery.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Document Details' };
export default function DocumentDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={4} />}><DocumentDetailFromQuery /></Suspense>;
}
