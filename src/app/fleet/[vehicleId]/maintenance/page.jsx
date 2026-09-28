import { VehicleMaintenance } from '../../../../screens/VehicleMaintenance.jsx';
import { staticParamsFor } from '../../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleMaintenancePage() { return <VehicleMaintenance />; }
