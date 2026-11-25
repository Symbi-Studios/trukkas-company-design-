import { VehicleDocuments } from '../../../../screens/VehicleDocuments';
import { staticParamsFor } from '../../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleDocumentsPage() { return <VehicleDocuments />; }
