'use client';

import { useId, useRef, useState } from 'react';
import { Banner, Button, Modal, Textarea, TextField } from '../ds.js';
import { FileDrop } from './FileDrop.jsx';
import styles from './MaintenanceModal.module.css';
import {
  useCancelFleetMaintenanceMutation, useSubmitFleetMaintenanceCompletionMutation,
  useLazyExportFleetMaintenanceQuery, useStartFleetMaintenanceMutation,
} from '../store/features/fleet/fleetApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

const ACTIONS = {
  start: { title: 'Start Maintenance', submit: 'Start Maintenance', busy: 'Starting…', icon: 'circle-play', message: 'Maintenance started.' },
  complete: { title: 'Record Completed Service', submit: 'Submit for Verification', busy: 'Submitting…', icon: 'send', message: 'Service submitted. Trukkas will verify it and clear any restriction.' },
  cancel: { title: 'Cancel Maintenance', submit: 'Cancel Maintenance', busy: 'Cancelling…', icon: 'ban', message: 'Maintenance cancelled.' },
};

export function MaintenanceActionModal({ record, action, onClose, onDone }) {
  const formId = useId();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({ completedAt: today, actualCost: '', odometerKm: '', workshop: record?.serviceCenter ?? '', workPerformed: '', nextDueKm: '', nextDueDate: '', invoice: [], reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [start] = useStartFleetMaintenanceMutation();
  const [complete] = useSubmitFleetMaintenanceCompletionMutation();
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
      else if (action === 'complete') {
        const result = await complete({ ...identity, ...draft, invoice: draft.invoice[0]?.file }).unwrap();
        onDone(result.invoiceSkipped ? 'Service recorded. Invoice upload and Trukkas verification switch on soon; keep the invoice on file.' : config.message);
        return;
      }
      else await cancel({ ...identity, reason: draft.reason }).unwrap();
      onDone(config.message);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  if (!record || !config) return null;
  return (
    <Modal open title={config.title} description={record.reference + ' · ' + record.truckPlate} width={action === 'complete' ? 620 : 520} onClose={close}
      footer={<><Button variant="outline" disabled={busy} onClick={close}>Back</Button><Button form={formId} type="submit" variant={action === 'cancel' ? 'danger' : 'primary'} icon={config.icon} disabled={busy || (action === 'complete' && (!draft.completedAt || !draft.odometerKm || !draft.actualCost || !draft.workshop.trim() || !draft.workPerformed.trim() || !draft.invoice.length))}>{busy ? config.busy : config.submit}</Button></>}>
      <form id={formId} onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <p className="tk-meta" style={{ margin: 0 }}>{action === 'start'
          ? 'The truck is unavailable for new jobs while it is in the workshop, until the completed service is recorded.'
          : action === 'cancel' ? 'Cancel this maintenance request or scheduled service. A reason is optional.'
            : 'Record exactly what was done. The full history stays on the truck’s record.'}</p>
        {action === 'complete' && (
          <>
            <div className={styles.twoCol}>
              <TextField label="Date completed" required type="date" max={today} value={draft.completedAt} onChange={set('completedAt')} disabled={busy} />
              <TextField label="Odometer at service (km)" required type="number" min="0" step="any" value={draft.odometerKm} onChange={set('odometerKm')} disabled={busy} />
              <TextField label="Workshop / service provider" required maxLength={120} value={draft.workshop} onChange={set('workshop')} disabled={busy} />
              <TextField label="Service cost (₦)" required type="number" min="0" step="0.01" value={draft.actualCost} onChange={set('actualCost')} disabled={busy} hint="The final amount on the invoice." />
            </div>
            <Textarea label="Work performed" required rows={3} maxLength={2000} placeholder="Parts replaced, checks done, anything the next mechanic should know" value={draft.workPerformed} onChange={set('workPerformed')} disabled={busy} />
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Next service due</span>
              <div className={styles.twoCol}>
                <TextField label="At odometer (km)" type="number" min="0" step="any" value={draft.nextDueKm} onChange={set('nextDueKm')} disabled={busy} hint="Leave blank to use the Trukkas rule." />
                <TextField label="Or by date" type="date" min={draft.completedAt || today} value={draft.nextDueDate} onChange={set('nextDueDate')} disabled={busy} />
              </div>
            </div>
            <FileDrop label="Invoice or service document" hint="PDF, JPG or PNG up to 10 MB" accept="application/pdf,image/jpeg,image/png,image/webp" files={draft.invoice} onChange={(files) => setDraft((value) => ({ ...value, invoice: files }))} />
            <Banner tone="info" title="Trukkas verifies every completed service">If this truck is blocked for maintenance, it becomes eligible for jobs again once the record is verified.</Banner>
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
