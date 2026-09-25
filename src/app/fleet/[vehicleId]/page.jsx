import { VehicleDetail } from '../../../screens/VehicleDetail.jsx';
import { staticParamsFor } from '../../../staticParams.js';
import { trucks } from '../../../mock/fixtures/trucks.js';
import { findTruckBySlug } from '../../../domain/vehicles.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }

export async function generateMetadata({ params }) {
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
