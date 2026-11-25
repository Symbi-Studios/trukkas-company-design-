import { PayoutDetail } from '../../../screens/PayoutDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('payoutId'); }

export async function generateMetadata({ params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = await params;
  return {
    title: payoutId,
    description: 'Detailed view of this payout.',
    openGraph: { title: payoutId, description: 'Trukkas payout detail.', images: [] },
    twitter: { title: payoutId, description: 'Trukkas payout detail.', images: [] },
  };
}

export default function PayoutDetailPage() {
  return <PayoutDetail />;
}
