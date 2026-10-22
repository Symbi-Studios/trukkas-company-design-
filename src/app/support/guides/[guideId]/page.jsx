import { GuideDetail } from '../../../../screens/GuideDetail.jsx';
import { staticParamsFor } from '../../../../staticParams.js';

export function generateStaticParams() { return staticParamsFor('guideId'); }
export default function GuideDetailPage() { return <GuideDetail />; }
