import { VehicleActivityLog } from '../../../../screens/VehicleActivityLog';
import { staticParamsFor } from '../../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleActivityLogPage() { return <VehicleActivityLog />; }
