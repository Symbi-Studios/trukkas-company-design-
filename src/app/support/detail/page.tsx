import { Suspense } from 'react';
import { TicketDetailFromQuery } from '../../../screens/TicketDetail';
import { SkeletonRow } from '../../../ds/components/feedback/Skeleton';

export const metadata = { title: 'Support Ticket' };
export default function TicketDetailPage() {
  return <Suspense fallback={<SkeletonRow columns={3} />}><TicketDetailFromQuery /></Suspense>;
}
