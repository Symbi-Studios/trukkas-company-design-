import { VehicleActivityLog } from '../../../../screens/VehicleActivityLog.jsx';
import { staticParamsFor } from '../../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleActivityLogPage() { return <VehicleActivityLog />; }
