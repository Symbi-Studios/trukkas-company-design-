import { Suspense } from 'react';
import { GuideDetailFromQuery } from '../../../../screens/GuideDetail.jsx';
import { SkeletonRow } from '../../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Help Guide' };
export default function GuideDetailPage() {
  return <Suspense fallback={<SkeletonRow variant="detail" />}><GuideDetailFromQuery /></Suspense>;
}
