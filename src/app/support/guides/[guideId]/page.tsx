import { GuideDetail } from '../../../../screens/GuideDetail';
import { staticParamsFor } from '../../../../staticParams';

export function generateStaticParams() { return staticParamsFor('guideId'); }
export default function GuideDetailPage() { return <GuideDetail />; }
