'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Select, TextField } from '../ds.js';
import { useRequestFleetMaintenanceMutation, useUpdateFleetMaintenanceMutation } from '../store/features/fleet/fleetApi.js';
import { MAINTENANCE_SERVICE_TYPES } from '../store/features/fleet/fleetContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

export function MaintenanceModal({ open, onClose, trucks, truckId, record = null, loading = false, loadError = '', width = 440, formId = 'schedule-form' }) {
  const [draft, setDraft] = useState(() => ({
    truckId: truckId ?? trucks?.[0]?.id ?? '',
    serviceType: record?.serviceCategory ?? '', description: record?.description === '—' ? '' : record?.description ?? '',
    date: record?.dateInput ?? '', estimatedCost: record?.estimatedCost == null ? '' : String(record.estimatedCost),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestMaintenance] = useRequestFleetMaintenanceMutation();
  const [updateMaintenance] = useUpdateFleetMaintenanceMutation();
  const submitting = useRef(false);
  const selectedVehicleAvailable = trucks ? trucks.some((truck) => truck.id === draft.truckId) : !!truckId && truckId === draft.truckId;

  useEffect(() => {
    if (!open || record || truckId || !trucks?.[0]?.id) return;
    setDraft((previous) => previous.truckId ? previous : { ...previous, truckId: trucks[0].id });
  }, [open, record, truckId, trucks]);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || loading || loadError) return;
    if (!selectedVehicleAvailable) { setError('Select a vehicle from your current fleet.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      if (record) await updateMaintenance({ id: record.id, ...draft }).unwrap();
      else await requestMaintenance(draft).unwrap();
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title={record ? 'Edit Maintenance' : 'Schedule Maintenance'} width={width}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form={formId} type="submit" disabled={busy || loading || !!loadError || !selectedVehicleAvailable || !draft.truckId || !draft.serviceType || !draft.description.trim() || !draft.date}>{busy ? (record ? 'Saving…' : 'Scheduling…') : record ? 'Save Changes' : 'Schedule'}</Button></>}>
      <form id={formId} onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        {trucks && <Select label="Vehicle" disabled={busy || loading || !!record} value={draft.truckId} options={trucks.map((truck) => ({ value: truck.id, label: truck.plate }))} onChange={(e) => setDraft({ ...draft, truckId: e.target.value })} />}
        <Select label="Service Type" required disabled={busy} value={draft.serviceType} options={MAINTENANCE_SERVICE_TYPES} onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })} />
        <TextField label="Description" disabled={busy} maxLength={1000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <TextField label="Scheduled Date" disabled={busy} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <TextField label="Estimated Cost (₦)" disabled={busy} type="number" min="0" step="any" value={draft.estimatedCost} onChange={(e) => setDraft({ ...draft, estimatedCost: e.target.value })} />
        {(error || loadError) && <span role="alert" className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{error || loadError}</span>}
      </form>
    </Modal>
  );
}
