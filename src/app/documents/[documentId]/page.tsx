import { DocumentDetail } from '../../../screens/DocumentDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('documentId'); }
export default function DocumentDetailPage(){ return <DocumentDetail/>; }
