import { TripDetail } from '../../../screens/TripDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('tripId'); }

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return {
    title: tripId,
    description: 'Trip overview, live location, progress, and documents.',
    openGraph: { title: tripId, description: 'Trukkas trip detail.', images: [] },
    twitter: { title: tripId, description: 'Trukkas trip detail.', images: [] },
  };
}

export default function TripDetailPage() {
  return <TripDetail section="overview" />;
}
