import { Suspense } from 'react';
import { GuideDetailFromQuery } from '../../../../screens/GuideDetail';
import { SkeletonRow } from '../../../../ds/components/feedback/Skeleton';

export const metadata = { title: 'Help Guide' };
export default function GuideDetailPage() {
  return <Suspense fallback={<SkeletonRow variant="detail" />}><GuideDetailFromQuery /></Suspense>;
}
