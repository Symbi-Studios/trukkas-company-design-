import { Suspense } from 'react';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';
import { HelpGuides } from '../../../screens/HelpGuides.jsx';

export const metadata = {
  title: 'Help Guides',
  description: 'Step-by-step guides for jobs, fleet, drivers, payments and your account.',
};

export default function HelpGuidesPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><HelpGuides /></Suspense>;
}
