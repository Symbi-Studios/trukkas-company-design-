import { Suspense } from 'react';
import { TicketDetailFromQuery } from '../../../screens/TicketDetail.jsx';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton.jsx';

export const metadata = { title: 'Support Ticket' };
export default function TicketDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><TicketDetailFromQuery /></Suspense>;
}
