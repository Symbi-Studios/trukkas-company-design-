import { TripDetail } from '../../../../screens/TripDetail';
import { tripSectionParams } from '../../../../staticParams';
export function generateStaticParams(){ return tripSectionParams(); }

export async function generateMetadata({ params }: { params: Promise<{ tripId: string; section: string }> }) {
  const { tripId, section } = await params;
  const label = section.charAt(0).toUpperCase() + section.slice(1);
  return {
    title: `${tripId} · ${label}`,
    description: `Trip ${section} for ${tripId}.`,
    openGraph: { title: `${tripId} · ${label}`, description: 'Trukkas trip detail.', images: [] },
    twitter: { title: `${tripId} · ${label}`, description: 'Trukkas trip detail.', images: [] },
  };
}

export default async function TripSectionPage({ params }: { params: Promise<{ tripId: string; section: string }> }) {
  const { section } = await params;
  return <TripDetail section={section} />;
}
