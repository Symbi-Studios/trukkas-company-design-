'use client';

import { useEffect, useRef, useState } from 'react';
import { Banner, Button, Modal, Select, TextField, Textarea } from '../ds.js';
import { useRequestFleetMaintenanceMutation, useUpdateFleetMaintenanceMutation } from '../store/features/fleet/fleetApi.js';
import { MAINTENANCE_SERVICE_TYPES } from '../store/features/fleet/fleetContracts.js';
import { MAINTENANCE_CATEGORIES, categoryLabel } from '../domain/maintenanceRules.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import styles from './MaintenanceModal.module.css';

/**
 * Schedule (or edit) servicing for a truck. Trukkas approves new requests before
 * they are scheduled. `requirement` pre-fills the form from the Due List.
 */
export function MaintenanceModal({ open, onClose, trucks, truckId, record = null, requirement = null, loading = false, loadError = '', width = 560, formId = 'schedule-form', onDone }) {
  const [draft, setDraft] = useState(() => ({
    truckId: requirement?.truckId ?? truckId ?? trucks?.[0]?.id ?? '',
    serviceType: record?.serviceCategory ?? (requirement ? 'Preventive' : ''),
    description: record?.description === '—' ? '' : record?.description ?? (requirement ? requirement.ruleName : ''),
    date: record?.dateInput ?? '', estimatedCost: record?.estimatedCost == null ? '' : String(record.estimatedCost),
    workshop: record?.serviceCenter ?? '', workshopLocation: record?.serviceCenterLocation ?? '', reason: record?.notes ?? '',
    categories: record?.categories?.length ? record.categories : requirement?.category ? [categoryLabel(requirement.category)] : [],
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestMaintenance] = useRequestFleetMaintenanceMutation();
  const [updateMaintenance] = useUpdateFleetMaintenanceMutation();
  const submitting = useRef(false);
  const selectedVehicleAvailable = trucks ? trucks.some((truck) => truck.id === draft.truckId) : !!truckId && truckId === draft.truckId;
  const set = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));

  useEffect(() => {
    if (!open || record || truckId || requirement || !trucks?.[0]?.id) return;
    setDraft((previous) => previous.truckId ? previous : { ...previous, truckId: trucks[0].id });
  }, [open, record, truckId, requirement, trucks]);

  function toggleCategory(label) {
    setDraft((value) => ({ ...value, categories: value.categories.includes(label) ? value.categories.filter((item) => item !== label) : [...value.categories, label] }));
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || loading || loadError) return;
    if (!selectedVehicleAvailable) { setError('Select a vehicle from your current fleet.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      if (record) await updateMaintenance({ id: record.id, ...draft }).unwrap();
      else await requestMaintenance(draft).unwrap();
      onDone?.(record ? 'Maintenance updated.' : 'Request sent. Trukkas will confirm the schedule.');
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  const ready = !busy && !loading && !loadError && selectedVehicleAvailable && draft.truckId && draft.serviceType && draft.description.trim() && draft.date;
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title={record ? 'Edit Maintenance' : 'Request Maintenance'}
      description={record ? `${record.reference} · ${record.truckPlate}` : 'Trukkas reviews each request and confirms the schedule.'} width={width}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form={formId} type="submit" disabled={!ready}>{busy ? (record ? 'Saving…' : 'Sending…') : record ? 'Save Changes' : 'Send Request'}</Button></>}>
      <form id={formId} onSubmit={submit} className={styles.form}>
        {requirement && <Banner tone={requirement.mandatory ? 'warning' : 'info'} title={`${requirement.ruleName} · ${requirement.truckPlate}`}>{requirement.mandatory ? 'Mandatory. The truck is blocked from new jobs if this becomes overdue.' : 'Recommended by Trukkas.'}</Banner>}
        <div className={styles.grid}>
          {trucks && <Select label="Vehicle" disabled={busy || loading || !!record || !!requirement} value={draft.truckId} options={trucks.map((truck) => ({ value: truck.id, label: truck.plate }))} onChange={set('truckId')} />}
          <Select label="Service Type" required disabled={busy} value={draft.serviceType} options={MAINTENANCE_SERVICE_TYPES} onChange={set('serviceType')} />
        </div>
        {!record && (
          <fieldset className={styles.fieldset}>
            <legend>What needs doing</legend>
            <div className={styles.chips}>
              {MAINTENANCE_CATEGORIES.map((item) => {
                const on = draft.categories.includes(item.label);
                return <button key={item.value} type="button" aria-pressed={on} className={`${styles.chip} ${on ? styles.on : ''}`} disabled={busy} onClick={() => toggleCategory(item.label)}>{item.label}</button>;
              })}
            </div>
          </fieldset>
        )}
        <TextField label="Description" required disabled={busy} maxLength={1000} placeholder="e.g. 100,000 km engine service" value={draft.description} onChange={set('description')} />
        <div className={styles.grid}>
          <TextField label="Workshop / service provider" disabled={busy} maxLength={120} value={draft.workshop} onChange={set('workshop')} />
          <TextField label="Workshop location" disabled={busy} maxLength={200} value={draft.workshopLocation} onChange={set('workshopLocation')} />
        </div>
        <div className={styles.grid}>
          <TextField label="Scheduled Date" required disabled={busy} type="date" value={draft.date} onChange={set('date')} />
          <TextField label="Estimated Cost (₦)" disabled={busy} type="number" min="0" step="0.01" value={draft.estimatedCost} onChange={set('estimatedCost')} />
        </div>
        <Textarea label="Reason / notes" rows={2} maxLength={2000} disabled={busy} placeholder="Why this service is needed, symptoms, anything the workshop should know" value={draft.reason} onChange={set('reason')} />
        {(error || loadError) && <span role="alert" className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{error || loadError}</span>}
      </form>
    </Modal>
  );
}
