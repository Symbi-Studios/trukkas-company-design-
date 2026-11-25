import { TicketDetail } from '../../../screens/TicketDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('ticketId'); }
export default function TicketDetailPage(){ return <TicketDetail/>; }
