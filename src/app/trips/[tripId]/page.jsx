import { TripDetail } from '../../../screens/TripDetail.jsx';
import { staticParamsFor } from '../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('tripId'); }

export async function generateMetadata({ params }) {
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
