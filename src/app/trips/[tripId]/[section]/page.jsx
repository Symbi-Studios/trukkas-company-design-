import { TripDetail } from '../../../../screens/TripDetail.jsx';
import { tripSectionParams } from '../../../../staticParams.js';
export function generateStaticParams(){ return tripSectionParams(); }

export async function generateMetadata({ params }) {
  const { tripId, section } = await params;
  const label = section.charAt(0).toUpperCase() + section.slice(1);
  return {
    title: `${tripId} · ${label}`,
    description: `Trip ${section} for ${tripId}.`,
    openGraph: { title: `${tripId} · ${label}`, description: 'Trukkas trip detail.', images: [] },
    twitter: { title: `${tripId} · ${label}`, description: 'Trukkas trip detail.', images: [] },
  };
}

export default async function TripSectionPage({ params }) {
  const { section } = await params;
  return <TripDetail section={section} />;
}
