import { VehicleMaintenance } from '../../../../screens/VehicleMaintenance';
import { staticParamsFor } from '../../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleMaintenancePage() { return <VehicleMaintenance />; }
