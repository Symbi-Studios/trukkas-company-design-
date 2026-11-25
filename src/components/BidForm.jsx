'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, LabelValue, TextField } from '../ds.js';
import { useSubmitJobBidMutation } from '../store/features/jobs/jobsApi.js';
import { useGetFleetEligibilityQuery } from '../store/features/fleet/fleetApi.js';
import { Link } from '../router.js';
import { MIN_BID_AMOUNT, getBidValidationError } from '../domain/jobs.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { formatNaira } from '../mock/format.js';

const money = (value) => (typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—');

/** The pricing a trucker needs before bidding: the forwarder's offer, Trukkas's recommended fare and the allowed range. */
export function BidPricing({ job }) {
  const [low, high] = job.bidBounds ?? [null, null];
  const trucks = job.trucksRequired ?? 1;
  return (
    <div style={{ display: 'grid', gap: 2, padding: 12, borderRadius: 'var(--tk-r-lg)', background: 'var(--tk-surface-sunk)' }}>
      <LabelValue label="Forwarder’s offer" value={money(job.budget)} />
      {job.recommendedFare != null && <LabelValue label="Trukkas recommended fare" value={money(job.recommendedFare)} />}
      <LabelValue label="Allowed bid range" value={low == null && high == null ? '—' : `${money(low)} – ${money(high)}`} />
      <span className="tk-meta" style={{ marginTop: 6 }}>
        {trucks > 1 ? `One bid covers the whole job: all ${trucks} trucks. ` : 'Your bid is for the whole job. '}
        Payment is held in escrow: 30% at pickup, 70% on completion. No fee is taken from it.
      </span>
    </div>
  );
}

// No free-text message: forwarders and trucking companies don't contact each other on Trukkas.
// `matched`: whether the job is in this company's capability-matched Find Jobs list (null = unknown).
export function BidForm({ job, onDone, onBusyChange, matched = null }) {
  // The API rejects a bid unless an ACTIVE, job-eligible truck fits the job, so say so before they try.
  const { data: eligibility } = useGetFleetEligibilityQuery(undefined, { refetchOnMountOrArgChange: true });
  const eligibleTrucks = eligibility ? Object.values(eligibility).filter((truck) => truck.eligible === true).length : null;
  const [submitBid] = useSubmitJobBidMutation();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const bounds = job.bidBounds ?? [null, null];
  const slots = job.bidSlots;

  useEffect(() => { setAmount(job.budget == null ? '' : String(job.budget)); setError(''); }, [job.id, job.budget]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  async function send(acceptOffer) {
    if (submitting.current) return;
    const validationError = acceptOffer ? null : getBidValidationError(amount, '', bounds);
    if (validationError) { setError(validationError); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      await submitBid({ jobId: job.id, amount: Number(amount), bounds, acceptOffer }).unwrap();
      onDone(acceptOffer ? `You accepted the forwarder’s offer on ${job.number}.` : `Bid sent on ${job.number}.`);
    } catch (err) { setError(err instanceof Error ? err.message : getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  const noSlots = slots?.remaining === 0;
  const truckReason = eligibleTrucks === 0 ? 'None of your trucks can take jobs right now: they’re inactive, under or overdue for maintenance, or restricted.'
    : matched === false ? 'None of your trucks fit this job’s equipment (container size and type, or bulk truck type).' : null;
  const blockedReason = noSlots ? `You’ve used all ${slots.max ?? 3} bids on this job.` : truckReason ?? (job.canBid === false ? 'You can’t bid on this job right now.' : null);
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(false); }} style={{ display: 'grid', gap: 12 }}>
      <BidPricing job={job} />
      <TextField
        label="Your bid for the whole job (₦)" type="number" min={bounds[0] ?? MIN_BID_AMOUNT} max={bounds[1] ?? undefined} required disabled={busy || !!blockedReason}
        value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined}
        hint={slots?.remaining != null ? `${slots.remaining} of ${slots.max ?? 3} bids left on this job. Withdrawing a bid still uses one. Each bid expires 30 minutes after you send it.` : 'Each bid expires 30 minutes after you send it.'}
      />
      {blockedReason && (
        <span className="tk-meta" style={{ color: 'var(--tk-danger)' }}>
          {blockedReason}{truckReason && <> <Link to="/fleet" style={{ color: 'var(--tk-blue)', fontWeight: 600 }}>Check your fleet</Link></>}
        </span>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
          <Button type="submit" size="lg" icon="send" fullWidth disabled={busy || !!blockedReason || !!getBidValidationError(amount, '', bounds)}>{busy ? 'Sending…' : 'Place Bid'}</Button>
          {job.budget != null && <Button type="button" variant="secondary" fullWidth disabled={busy || !!blockedReason} onClick={() => send(true)}>Accept Offer · {money(job.budget)}</Button>}
      </div>
    </form>
  );
}
