// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Icon, Modal, Select } from '../ds';
import { useGetJobDispatchOptionsQuery, useReassignJobDriverMutation } from '../store/features/jobs/jobsApi';
import { TRIP_PHASES } from '../store/features/trips/tripContracts';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage';
import { formatNaira } from '../mock/format';

const money = (value) => (typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—');

export function ReassignDriverModal({ trip, open, onClose, onDone }) {
  const { data: drivers = [], error: loadError, isLoading } = useGetJobDispatchOptionsQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [reassign] = useReassignJobDriverMutation();
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) { setDriverId(''); setError(''); } }, [open]);
  const options = drivers.filter((d) => d.id !== trip?.driverId);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !driverId) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await reassign({ jobId: trip.jobId, driverId }).unwrap();
      onDone(drivers.find((d) => d.id === driverId)?.name ?? 'the new driver');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title={trip?.driverAssigned ? 'Change Driver' : 'Assign a Driver'} width={480}
      description="The trip runs on the new driver’s own truck. They confirm it in the driver app before pickup."
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="reassign-form" type="submit" icon="user-round" disabled={busy || isLoading || !driverId}>{busy ? 'Assigning…' : 'Assign Driver'}</Button></>}>
      <form id="reassign-form" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <Select label="Driver" value={driverId} placeholder={options.length ? 'Select a driver with a truck' : 'No other drivers with a truck'} disabled={busy}
          options={options.map((d) => ({ value: d.id, label: `${d.name} · ${d.plate}` }))} onChange={(e) => setDriverId(e.target.value)} />
        {(error || loadError) && <span role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error || getApiErrorMessage(loadError)}</span>}
      </form>
    </Modal>
  );
}

/**
 * Where the trip really is, who acts next and what's held in escrow, so a
 * dispatcher can answer "why haven't we been paid?" without calling support.
 */
export function TripStageCard({ trip, onDispatch, onReassign }) {
  const stage = trip?.stage;
  if (!stage) return null;
  const done = stage.phase === 'Done';
  return (
    <Card style={{ display: 'grid', gap: 14 }}>
      <ol aria-label="Trip phases" style={{ display: 'grid', gridTemplateColumns: `repeat(${TRIP_PHASES.length}, 1fr)`, gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
        {TRIP_PHASES.map((phase, index) => {
          const state = index < stage.phaseIndex || (done && stage.key === 'COMPLETED') ? 'done' : index === stage.phaseIndex ? 'current' : 'todo';
          return (
            <li key={phase} style={{ display: 'grid', gap: 6 }}>
              <span style={{ height: 6, borderRadius: 999, background: state === 'done' ? 'var(--tk-success)' : state === 'current' ? 'var(--tk-blue)' : 'var(--tk-line)' }} />
              <small style={{ font: `${state === 'current' ? 600 : 500} 12px/16px var(--tk-font-sans)`, color: state === 'todo' ? 'var(--tk-ink-400)' : 'var(--tk-ink-900)' }}>{phase}</small>
            </li>
          );
        })}
      </ol>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', display: 'grid', gap: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ font: '600 16px/22px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{stage.label}</strong>
            {stage.actor && <Badge tone={stage.actor === 'You' ? 'warning' : 'neutral'}>{stage.actor === 'You' ? 'Your move' : `Waiting on ${stage.actor.toLowerCase()}`}</Badge>}
            {trip.cancellationRequested && <Badge tone="danger">Cancellation requested · with support</Badge>}
          </span>
          {stage.next && <span className="tk-meta">{stage.next}</span>}
          {(stage.key === 'AWAITING_DISPATCH' || stage.key === 'AWAITING_DRIVER') && (
            <span style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {stage.key === 'AWAITING_DISPATCH'
                ? <Button size="sm" icon="truck" onClick={onDispatch}>Dispatch a Driver</Button>
                : <Button size="sm" variant="outline" icon="repeat" onClick={onReassign}>Change Driver</Button>}
            </span>
          )}
        </div>
        <div style={{ flex: '1 1 240px', display: 'grid', gap: 6, padding: 12, borderRadius: 'var(--tk-r-lg)', background: 'var(--tk-surface-sunk)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 13px/18px var(--tk-font-sans)' }}><Icon name="lock-keyhole" size={15} /> Escrow for this trip</span>
          {stage.money ? (
            <>
              <EscrowLine label="30% at pickup" amount={stage.money.mobilization} paid={stage.money.mobilizationPaid} on={stage.money.mobilizationPaidOn} />
              <EscrowLine label="70% after proof of delivery" amount={stage.money.final} paid={stage.money.finalPaid} on={stage.money.finalPaidOn} />
              <span className="tk-meta" style={{ borderTop: '1px solid var(--tk-line)', paddingTop: 6 }}>
                {money(stage.money.released)} released · {money(stage.money.held)} {stage.key === 'DISPUTED' ? 'frozen' : 'held'}
              </span>
            </>
          ) : <span className="tk-meta">—</span>}
        </div>
      </div>
    </Card>
  );
}

function EscrowLine({ label, amount, paid, on }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, font: '400 13px/18px var(--tk-font-sans)' }}>
      <span style={{ color: 'var(--tk-ink-500)' }}>{label}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <strong>{money(amount)}</strong>
        <Badge tone={paid ? 'success' : 'neutral'}>{paid ? `Released ${on}` : 'Held'}</Badge>
      </span>
    </span>
  );
}
