import { VehicleFuelCosts } from '../../../../screens/VehicleFuelCosts';
import { staticParamsFor } from '../../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleFuelCostsPage() { return <VehicleFuelCosts />; }
