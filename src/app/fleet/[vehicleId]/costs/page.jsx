import { VehicleFuelCosts } from '../../../../screens/VehicleFuelCosts.jsx';
import { staticParamsFor } from '../../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleFuelCostsPage() { return <VehicleFuelCosts />; }
