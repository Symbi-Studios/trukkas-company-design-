import { VehicleTripsHistory } from '../../../../screens/VehicleTripsHistory';
import { staticParamsFor } from '../../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('vehicleId'); }
export default function VehicleTripsHistoryPage() { return <VehicleTripsHistory />; }
