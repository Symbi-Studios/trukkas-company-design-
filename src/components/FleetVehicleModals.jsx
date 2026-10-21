'use client';

import { useRef, useState } from 'react';
import { Button, Modal, Select, Textarea, TextField } from '../ds.js';
import { VEHICLE_CLASSES } from '../domain/vehicles.js';
import { useAddFleetFuelLogMutation, useEditFleetVehicleMutation } from '../store/features/fleet/fleetApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

const SPEC_FIELDS = [
  ['engineType', 'Engine Type'], ['engineCapacity', 'Engine Capacity'], ['transmission', 'Transmission'], ['fuelType', 'Fuel Type'],
  ['axleConfig', 'Axle Configuration'], ['gvw', 'Gross Vehicle Weight'], ['loadCapacity', 'Load Capacity'], ['axles', 'Number of Axles'],
  ['fuelTankCapacity', 'Fuel Tank Capacity'], ['emissionStandard', 'Emission Standard'], ['trailerCompatibility', 'Trailer Compatibility'],
];
const fieldGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 };

export function EditFleetVehicleModal({ truck, onClose }) {
  const original = useRef(truck.editDraft);
  const [draft, setDraft] = useState(() => ({ ...original.current, specs: { ...original.current.specs } }));
  const [error, setError] = useState('');
  const [save, { isLoading: busy }] = useEditFleetVehicleMutation();
  const submitting = useRef(false);
  const set = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setError('');
    try { await save({ id: truck.id, draft, original: original.current }).unwrap(); onClose(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }
  return (
    <Modal open title="Edit Truck" width={720} onClose={() => { if (!submitting.current) onClose(); }}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" form="edit-fleet-vehicle" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button></>}>
      <form id="edit-fleet-vehicle" onSubmit={submit} style={{ display: 'grid', gap: 20 }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div style={fieldGrid}>
            <Select disabled={busy} label="Vehicle Class" value={draft.vehicleClass} options={VEHICLE_CLASSES} onChange={set('vehicleClass')} />
            <TextField disabled={busy} label="Registration Number" required value={draft.plate} maxLength={100} onChange={set('plate')} />
            <TextField disabled={busy} label="Make" value={draft.make} maxLength={60} onChange={set('make')} />
            <TextField disabled={busy} label="Model" value={draft.model} maxLength={60} onChange={set('model')} />
            <TextField disabled={busy} label="Year of Manufacture" required value={draft.year} inputMode="numeric" maxLength={4} onChange={set('year')} />
            <TextField disabled={busy} label="Color" value={draft.color} maxLength={30} onChange={set('color')} />
            <TextField disabled={busy} label="Chassis / VIN" value={draft.vin} maxLength={30} onChange={set('vin')} />
            <TextField disabled={busy} label="Engine Number" value={draft.engineNumber} maxLength={40} onChange={set('engineNumber')} />
            <Select disabled={busy} label="Ownership" value={draft.ownership} options={['Company Owned', 'Leased', 'Hire Purchase / Financed']} onChange={set('ownership')} />
            <TextField disabled={busy} label="Purchase Date" type="date" value={draft.purchaseDate} onChange={set('purchaseDate')} />
            <TextField disabled={busy} label="Current Location" value={draft.location} maxLength={200} onChange={set('location')} />
            <TextField disabled={busy} label="Odometer Reading (km)" type="number" min="0" step="any" value={draft.odometer} onChange={set('odometer')} />
          </div>
          <h3 className="tk-title" style={{ fontSize: 15, margin: '20px 0 12px' }}>Specifications</h3>
          <div style={fieldGrid}>
            {SPEC_FIELDS.filter(([key]) => draft.vehicleClass !== 'Trailer' || ['axleConfig', 'gvw', 'loadCapacity', 'axles'].includes(key)).map(([key, label]) => (
              <TextField disabled={busy} key={key} label={label} value={draft.specs[key]} onChange={(event) => setDraft((value) => ({ ...value, specs: { ...value.specs, [key]: event.target.value } }))} />
            ))}
          </div>
          <Textarea disabled={busy} label="Additional Notes" maxLength={2000} value={draft.notes} onChange={set('notes')} style={{ marginTop: 16 }} />
        </fieldset>
        {error && <span role="alert" className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{error}</span>}
      </form>
    </Modal>
  );
}

export function FleetFuelLogModal({ truckId, onClose }) {
  const [draft, setDraft] = useState({ date: '', litres: '', amount: '', odometer: '', station: '', fuelType: '' });
  const [error, setError] = useState('');
  const [save, { isLoading: busy }] = useAddFleetFuelLogMutation();
  const submitting = useRef(false);
  const set = (key) => (event) => setDraft((value) => ({ ...value, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setError('');
    try { await save({ truckId, draft }).unwrap(); onClose(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }
  return (
    <Modal open title="Log Fuel Purchase" width={540} onClose={() => { if (!submitting.current) onClose(); }}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" form="fleet-fuel-log" disabled={busy || !draft.litres || !draft.amount}>{busy ? 'Saving…' : 'Save Purchase'}</Button></>}>
      <form id="fleet-fuel-log" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <fieldset disabled={busy} style={{ ...fieldGrid, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <TextField disabled={busy} label="Purchase Date" type="date" value={draft.date} onChange={set('date')} />
          <TextField disabled={busy} label="Litres" required type="number" min="0.01" step="any" value={draft.litres} onChange={set('litres')} />
          <TextField disabled={busy} label="Total Cost (₦)" required type="number" min="0" step="any" value={draft.amount} onChange={set('amount')} />
          <TextField disabled={busy} label="Odometer Reading (km)" type="number" min="0" step="any" value={draft.odometer} onChange={set('odometer')} />
          <TextField disabled={busy} label="Fuel Station" value={draft.station} onChange={set('station')} />
          <Select disabled={busy} label="Fuel Type" value={draft.fuelType} options={['Diesel', 'Petrol', 'CNG', 'LNG', 'Electric']} onChange={set('fuelType')} />
        </fieldset>
        {error && <span role="alert" className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{error}</span>}
      </form>
    </Modal>
  );
}
