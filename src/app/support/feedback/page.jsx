import { Suspense } from 'react';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';
import { Feedback } from '../../../screens/Feedback.jsx';

export const metadata = {
  title: 'Your feedback',
  description: 'Ideas, problems and praise you’ve sent the Trukkas team.',
};

export default function FeedbackPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><Feedback /></Suspense>;
}
