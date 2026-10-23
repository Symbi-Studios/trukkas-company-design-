'use client';

import { useId, useRef, useState } from 'react';
import { Button, Modal, Textarea, TextField } from '../ds.js';
import {
  useCancelFleetMaintenanceMutation, useCompleteFleetMaintenanceMutation,
  useLazyExportFleetMaintenanceQuery, useStartFleetMaintenanceMutation,
} from '../store/features/fleet/fleetApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

const ACTIONS = {
  start: { title: 'Start Maintenance', submit: 'Start Maintenance', busy: 'Starting…', icon: 'circle-play', message: 'Maintenance started.' },
  complete: { title: 'Complete Maintenance', submit: 'Mark Completed', busy: 'Saving…', icon: 'circle-check', message: 'Maintenance completed.' },
  cancel: { title: 'Cancel Maintenance', submit: 'Cancel Maintenance', busy: 'Cancelling…', icon: 'ban', message: 'Maintenance cancelled.' },
};

export function MaintenanceActionModal({ record, action, onClose, onDone }) {
  const formId = useId();
  const [draft, setDraft] = useState({ actualCost: '', odometerKm: '', notes: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [start] = useStartFleetMaintenanceMutation();
  const [complete] = useCompleteFleetMaintenanceMutation();
  const [cancel] = useCancelFleetMaintenanceMutation();
  const config = ACTIONS[action];
  const set = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));
  const close = () => { if (!submitting.current) onClose(); };

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !config || !record) return;
    submitting.current = true; setBusy(true); setError('');
    const identity = { id: record.id, truckId: record.truckId };
    try {
      if (action === 'start') await start(identity).unwrap();
      else if (action === 'complete') await complete({ ...identity, actualCost: draft.actualCost, odometerKm: draft.odometerKm, notes: draft.notes }).unwrap();
      else await cancel({ ...identity, reason: draft.reason }).unwrap();
      onDone(config.message);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  if (!record || !config) return null;
  return (
    <Modal open title={config.title} description={record.reference + ' · ' + record.truckPlate} width={520} onClose={close}
      footer={<><Button variant="outline" disabled={busy} onClick={close}>Back</Button><Button form={formId} type="submit" variant={action === 'cancel' ? 'danger' : 'primary'} icon={config.icon} disabled={busy}>{busy ? config.busy : config.submit}</Button></>}>
      <form id={formId} onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <p className="tk-meta" style={{ margin: 0 }}>{action === 'start'
          ? 'The truck will be unavailable for new jobs until this maintenance is completed.'
          : action === 'cancel' ? 'Cancel this maintenance request or scheduled service. A reason is optional.'
            : 'Record the completed service. Leave any unknown details blank.'}</p>
        {action === 'complete' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
              <TextField label="Actual Cost (₦, optional)" type="number" min="0" step="any" value={draft.actualCost} onChange={set('actualCost')} disabled={busy} hint="Enter the final amount paid." />
              <TextField label="Odometer (km, optional)" type="number" min="0" step="any" value={draft.odometerKm} onChange={set('odometerKm')} disabled={busy} />
            </div>
            <Textarea label="Completion Notes (optional)" rows={4} maxLength={2000} value={draft.notes} onChange={set('notes')} disabled={busy} />
          </>
        )}
        {action === 'cancel' && <Textarea label="Reason (optional)" rows={4} maxLength={500} value={draft.reason} onChange={set('reason')} disabled={busy} />}
        {error && <p role="alert" className="tk-meta" style={{ margin: 0, color: 'var(--tk-danger)' }}>{error}</p>}
      </form>
    </Modal>
  );
}

export function MaintenanceExportButton({ truckId, search = '', status, disabled, onToast }) {
  const [exportRecords, { isFetching }] = useLazyExportFleetMaintenanceQuery();
  const downloading = useRef(false);
  async function download() {
    if (downloading.current || disabled) return;
    downloading.current = true;
    try {
      const file = await exportRecords({ truckId, search, status }).unwrap();
      const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
      try {
        const link = document.createElement('a');
        link.href = url; link.download = truckId ? 'vehicle-maintenance.csv' : 'fleet-maintenance.csv';
        document.body.appendChild(link); link.click(); link.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (err) { onToast(getApiErrorMessage(err)); }
    finally { downloading.current = false; }
  }
  return <Button variant="outline" icon="download" title="Export up to 5,000 records" disabled={disabled || isFetching} onClick={download}>{isFetching ? 'Exporting…' : 'Export CSV'}</Button>;
}
