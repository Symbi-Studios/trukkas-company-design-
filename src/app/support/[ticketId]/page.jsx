import { TicketDetail } from '../../../screens/TicketDetail.jsx';
import { staticParamsFor } from '../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('ticketId'); }
export default function TicketDetailPage(){ return <TicketDetail/>; }
