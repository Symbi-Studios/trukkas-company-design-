import { NotificationDetail } from '../../../screens/NotificationDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('notificationId'); }
export default function NotificationDetailPage(){return <NotificationDetail/>}
