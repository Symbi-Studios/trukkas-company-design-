import { VehicleDetail } from '../../../screens/VehicleDetail';
import { staticParamsFor } from '../../../staticParams';
import { trucks } from '../../../mock/fixtures/trucks';
import { findTruckBySlug } from '../../../domain/vehicles';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }

export async function generateMetadata({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const plate = findTruckBySlug(trucks, vehicleId)?.plate || vehicleId;
  return {
    title: plate,
    description: 'Vehicle overview, documents, maintenance, trip history, and activity.',
    openGraph: { title: plate, description: 'Trukkas vehicle detail.', images: [] },
    twitter: { title: plate, description: 'Trukkas vehicle detail.', images: [] },
  };
}

export default function VehicleDetailPage() {
  return <VehicleDetail />;
}
