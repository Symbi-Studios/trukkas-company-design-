'use client';

import { useNavigate, useParams } from '../router.js';
import { Badge, Banner, Button, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { payoutReceipt, payoutStatusTone } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';
import { ReceiptView } from '../components/Receipt.jsx';
import { downloadReceiptPdf } from '../components/receiptPdf.js';

export function PayoutDetail() {
  const { payoutId } = useParams();
  const navigate = useNavigate();
  const payouts = useCollection('payoutRequests') || [];
  const trips = useCollection('trips') || [];
  const jobs = useCollection('jobs') || [];
  const wallet = useCollection('walletSummary')?.[0];
  const company = useCollection('companyProfile')?.[0];
  const payout = payouts.find((p) => p.id === payoutId);

  if (!payout) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Payout not found" />
        <Button variant="outline" onClick={() => navigate('/payouts')}>Back to Payouts</Button>
      </div>
    );
  }

  const receipt = payoutReceipt(payout, { trips, jobs, company, bank: wallet?.bankAccount });

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)', maxWidth: 880 }}>
      <PageHeader
        crumbs={[{ label: 'Payouts', onClick: () => navigate('/payouts') }, payout.id]}
        title={payout.id}
        description={`${formatNaira(payout.amount)} · ${payout.items.length} trip(s) · Requested ${payout.requestedOn}`}
        meta={<Badge tone={payoutStatusTone(payout.status)} dot>{payout.status}</Badge>}
        actions={
          <>
            {payout.items.length === 1 && <Button variant="outline" icon="route" onClick={() => navigate(`/trips/${payout.items[0].tripId}`)}>View Trip</Button>}
            <Button icon="download" onClick={() => downloadReceiptPdf(receipt)}>Download Receipt</Button>
          </>
        }
      />
      {payout.status === 'Failed' && payout.failureReason && (
        <Banner tone="danger" title="Payout failed">{payout.failureReason}</Banner>
      )}
      {(payout.status === 'Requested' || payout.status === 'Processing') && (
        <Banner tone="info" title="Payout in progress">Trukkas is processing this payout. The receipt updates to “Paid” once funds are sent.</Banner>
      )}
      <ReceiptView receipt={receipt} />
    </div>
  );
}
