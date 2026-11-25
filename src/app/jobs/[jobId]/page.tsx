import { JobDetail } from '../../../screens/JobDetail';
import { staticParamsFor } from '../../../staticParams';
export function generateStaticParams(){ return staticParamsFor('jobId'); }

export async function generateMetadata({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return {
    title: jobId,
    description: 'Job details, bidding, and truck dispatch.',
    openGraph: { title: jobId, description: 'Trukkas job detail.', images: [] },
    twitter: { title: jobId, description: 'Trukkas job detail.', images: [] },
  };
}

export default function JobDetailPage() {
  return <JobDetail />;
}
