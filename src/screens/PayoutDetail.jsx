'use client';

import { useNavigate, useParams } from '../router.js';
import { Badge, Banner, Button, Card, LabelValue, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { payoutStatusTone } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';

export function PayoutDetail() {
  const { payoutId } = useParams();
  const navigate = useNavigate();
  const payouts = useCollection('payoutRequests') || [];
  const payout = payouts.find((p) => p.id === payoutId);

  if (!payout) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Payout not found" />
        <Button variant="outline" onClick={() => navigate('/payouts')}>Back to Payouts</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Payouts', onClick: () => navigate('/payouts') }, payout.id]}
        title={payout.id}
        description={`${payout.jobId} · ${payout.tripId}`}
        meta={<Badge tone={payoutStatusTone(payout.status)} dot>{payout.status}</Badge>}
      />
      {payout.status === 'Failed' && payout.failureReason && (
        <Banner tone="danger" title="Payout failed">{payout.failureReason}</Banner>
      )}
      <Card>
        <LabelValue label="Amount" value={<strong>{formatNaira(payout.amount)}</strong>} />
        <LabelValue label="Job" value={payout.jobId} />
        <LabelValue label="Trip" value={payout.tripId} />
        <LabelValue label="Method" value={`${payout.method} •••• ${payout.bankLast4}`} />
        <LabelValue label="Requested On" value={payout.requestedOn} />
        <LabelValue label="Paid On" value={payout.paidOn || '—'} />
      </Card>
    </div>
  );
}
