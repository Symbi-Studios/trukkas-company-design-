import { JobDetail } from '../../../screens/JobDetail.jsx';
import { staticParamsFor } from '../../../staticParams.js';
export function generateStaticParams(){ return staticParamsFor('jobId'); }

export async function generateMetadata({ params }) {
  const { jobId } = await params;
  return {
    title: jobId,
    description: 'Job details, bidding, trip status, documents, and activity.',
    openGraph: { title: jobId, description: 'Trukkas job and trip detail.', images: [] },
    twitter: { title: jobId, description: 'Trukkas job and trip detail.', images: [] },
  };
}

export default function JobDetailPage() {
  return <JobDetail />;
}
