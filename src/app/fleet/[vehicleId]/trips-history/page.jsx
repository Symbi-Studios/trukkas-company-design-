import { VehicleTripsHistory } from '../../../../screens/VehicleTripsHistory.jsx';
import { staticParamsFor } from '../../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleTripsHistoryPage() { return <VehicleTripsHistory />; }
