import { DriverDetail } from '../../../screens/DriverDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('driverId'); }

export async function generateMetadata({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  return {
    title: driverId,
    description: 'Review this driver profile, assignment, and compliance information.',
    openGraph: { title: driverId, description: 'Trukkas driver profile.', images: [] },
    twitter: { title: driverId, description: 'Trukkas driver profile.', images: [] },
  };
}

export default function DriverDetailPage() {
  return <DriverDetail />;
}
