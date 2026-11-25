'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, DataTable, EmptyState, Modal, SectionCard, Select } from '../ds.js';
import { useAssignJobLoadMutation, useGetJobDispatchOptionsQuery } from '../store/features/jobs/jobsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

const tonnes = (t) => (typeof t === 'number' && Number.isFinite(t) ? `${t.toLocaleString('en-NG', { maximumFractionDigits: 1 })} t` : '—');
const DOC_TONE = { Approved: 'success', Uploaded: 'info', 'In review': 'info', Rejected: 'danger', 'Not uploaded': 'neutral' };

function AssignLoadModal({ job, item, onClose, onDone }) {
  const { data: drivers = [], error: loadError, isLoading } = useGetJobDispatchOptionsQuery(undefined, { skip: !item, refetchOnMountOrArgChange: true });
  const [assign] = useAssignJobLoadMutation();
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { setDriverId(item?.assignment?.driverId ?? ''); setError(''); }, [item]);
  if (!item) return null;
  async function save(nextDriverId) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const driver = drivers.find((d) => d.id === nextDriverId);
      await assign({ jobId: job.id, kind: item.kind, itemId: item.id, driverId: nextDriverId, truckId: driver?.truckId }).unwrap();
      onDone(nextDriverId ? `${item.label} given to ${driver?.name ?? 'the driver'} · ${driver?.plate ?? ''}.` : `${item.label} unassigned.`);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return (
    <Modal open onClose={() => { if (!submitting.current) onClose(); }} title={`Assign ${item.label}`} width={460}
      description={`${item.spec} · ${tonnes(item.tonnes)}. The driver sees only this ${item.kind === 'rack' ? 'rack' : 'container'} and its documents.`}
      footer={<>
        {item.assignment && <Button variant="outline" disabled={busy} onClick={() => save(null)} style={{ marginRight: 'auto' }}>Unassign</Button>}
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button disabled={busy || isLoading || !driverId || driverId === item.assignment?.driverId} onClick={() => save(driverId)}>{busy ? 'Saving…' : 'Assign'}</Button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Select label="Driver (on their own truck)" value={driverId} placeholder={drivers.length ? 'Select a driver' : 'No drivers with a truck'} disabled={busy}
          options={drivers.map((d) => ({ value: d.id, label: `${d.name} · ${d.plate}` }))} onChange={(e) => setDriverId(e.target.value)} />
        {(error || loadError) && <span role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error || getApiErrorMessage(loadError)}</span>}
      </div>
    </Modal>
  );
}

/**
 * Every container (or bulk rack) on an awarded job, who's carrying it and its
 * release documents. One bid covers the whole job; the company then spreads the
 * load across its drivers and trucks here.
 */
export function JobLoadAssignments({ job, canAssign, onToast }) {
  const [editing, setEditing] = useState(null);
  const items = job.load;
  const noun = job.category === 'Break-bulk' ? 'Racks' : 'Containers';
  const assigned = job.loadAssigned ?? items?.filter((i) => i.assignment).length;
  const total = job.loadTotal ?? items?.length;
  return (
    <SectionCard title={`${noun} & Drivers`} description={items ? `${assigned ?? '—'} of ${total ?? '—'} assigned to a driver` : undefined} pad="none">
      {!Array.isArray(items) ? <div style={{ padding: 16 }}><span className="tk-meta">—</span></div> : items.length === 0 ? (
        <div style={{ padding: 24 }}><EmptyState icon="container" title={`No ${noun.toLowerCase()} listed on this job`} /></div>
      ) : (
        <DataTable rows={items} rowKey={(i) => i.id ?? i.label} columns={[
          { key: 'item', header: noun.slice(0, -1), render: (i) => <span style={{ display: 'grid' }}><strong>{i.label}</strong><span className="tk-meta">{i.spec} · {tonnes(i.tonnes)}</span></span> },
          { key: 'docs', header: 'Documents', render: (i) => i.docs.length ? <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{i.docs.map(([name, state]) => <Badge key={name} tone={DOC_TONE[state] ?? 'neutral'}>{name}: {state}</Badge>)}</span> : '—' },
          { key: 'driver', header: 'Driver · Truck', render: (i) => i.assignment ? <span style={{ display: 'grid' }}><span>{i.assignment.driverName}</span><span className="tk-meta">{i.assignment.plate}</span></span> : <Badge tone="warning">Not assigned</Badge> },
          { key: 'actions', header: '', align: 'right', render: (i) => canAssign && i.id && (
            <Button size="sm" variant="outline" onClick={() => setEditing(i)}>{i.assignment ? 'Change' : 'Assign'}</Button>
          ) },
        ]} />
      )}
      <AssignLoadModal job={job} item={editing} onClose={() => setEditing(null)} onDone={(message) => { setEditing(null); onToast(message); }} />
    </SectionCard>
  );
}
