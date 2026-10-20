'use client';

import { useSearchParams } from 'next/navigation';
import { useNavigate, useParams } from '../router.js';
import { Badge, Banner, Button, PageHeader, SkeletonRow } from '../ds.js';
import { payoutStatusTone } from '../domain/payouts.js';
import { payoutAmountLabel as formatNaira } from '../store/features/payouts/payoutContracts.js';
import { useGetPayoutRecordQuery } from '../store/features/payouts/payoutsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { ReceiptView } from '../components/Receipt.jsx';
import { downloadReceiptPdf } from '../components/receiptPdf.js';

export function PayoutDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('payoutId');
  const id = ids.length === 1 ? ids[0].trim() : '';
  return <PayoutDetail key={id} payoutId={id} />;
}

export function PayoutDetail({ payoutId: explicitId }) {
  const { payoutId: routeId } = useParams();
  const payoutId = explicitId ?? routeId;
  const navigate = useNavigate();
  const { currentData: data, error, isFetching } = useGetPayoutRecordQuery(payoutId, { refetchOnMountOrArgChange: true });
  const payout = data?.payout;

  if (isFetching && !data) return <SkeletonRow variant="detail" />;

  if (!payout || error) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Payout not found" description={error ? getApiErrorMessage(error) : undefined} />
        <Button variant="outline" onClick={() => navigate('/payouts')}>Back to Payouts</Button>
      </div>
    );
  }

  const receipt = data.receipt;

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)', maxWidth: 880 }}>
      <PageHeader
        crumbs={[{ label: 'Payouts', onClick: () => navigate('/payouts') }, payout.id]}
        title={payout.id}
        description={`${formatNaira(payout.amount)} · ${payout.tripCount ?? '—'} trip(s) · Requested ${payout.requestedOn}`}
        meta={<Badge tone={payoutStatusTone(payout.status)} dot>{payout.status}</Badge>}
        actions={
          <>
            {payout.items.length === 1 && <Button variant="outline" icon="route" onClick={() => navigate(tripDetailHref(payout.items[0].tripId))}>View Trip</Button>}
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
