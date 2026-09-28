import { VehicleDocuments } from '../../../../screens/VehicleDocuments.jsx';
import { staticParamsFor } from '../../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleDocumentsPage() { return <VehicleDocuments />; }
