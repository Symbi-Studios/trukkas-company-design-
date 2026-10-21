import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Select, Textarea, TextField } from '../ds.js';
import { useReportCompanyTripIssueMutation, useUpdateCompanyTripLocationMutation, useSubmitCompanyTripPodMutation, useUnlockCompanyTripOffloadingMutation } from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { TRIP_ISSUE_TYPES } from '../domain/trips.js';

export function ReportIssueModal({ trip, open, onClose, onDone }) {
  const [type, setType] = useState(TRIP_ISSUE_TYPES[0]);
  const [details, setDetails] = useState('');
  const [reportIssue, { isLoading: busy }] = useReportCompanyTripIssueMutation();
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) { setType(TRIP_ISSUE_TYPES[0]); setDetails(''); setError(''); } }, [open]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !details.trim()) return;
    submitting.current = true;
    setError('');
    try {
      await reportIssue({ tripId: trip.id, jobId: trip.jobId, type, details: details.trim() }).unwrap();
      onDone?.(`Issue reported on ${trip.number}.`);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally {
      submitting.current = false;
    }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Report Issue" description={`${trip.number} · ${trip.truckPlate}`} width={480}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="issue-form" type="submit" icon="triangle-alert" disabled={busy || !details.trim()}>{busy ? 'Reporting…' : 'Report Issue'}</Button></>}
    >
      <form id="issue-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Select label="Issue Type" value={type} options={TRIP_ISSUE_TYPES} disabled={busy} onChange={(e) => setType(e.target.value)} />
        <Textarea label="What happened?" rows={4} maxLength={500} value={details} disabled={busy} onChange={(e) => setDetails(e.target.value)} placeholder="Describe the issue, location and any support needed..." />
        {error && <p role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}

export function UpdateLocationModal({ trip, open, onClose, onDone }) {
  const [location, setLocation] = useState('');
  const [updateLocation, { isLoading: busy }] = useUpdateCompanyTripLocationMutation();
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open && trip) { setLocation(trip.currentLocation === '—' ? '' : trip.currentLocation || ''); setError(''); } }, [open, trip?.id, trip?.currentLocation]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !location.trim()) return;
    submitting.current = true;
    setError('');
    try {
      await updateLocation({ tripId: trip.id, location: location.trim() }).unwrap();
      onDone?.('Trip location updated.');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Update Location" description={`${trip.number} · ${trip.truckPlate}`} width={440}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="location-form" type="submit" icon="map-pin" disabled={busy || !location.trim()}>{busy ? 'Saving…' : 'Update Location'}</Button></>}
    >
      <form id="location-form" onSubmit={submit}>
        <TextField label="Current Location" required disabled={busy} maxLength={200} icon="map-pin" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Along Abuja – Kaduna Expressway" />
        {error && <p role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}

export function TripPodModal({ trip, open, onClose, onDone }) {
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [submitPod, { isLoading: busy }] = useSubmitCompanyTripPodMutation();
  const fileInput = useRef(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (open) {
      setReceiverName(''); setReceiverPhone(''); setPhoto(null); setError('');
      if (fileInput.current) fileInput.current.value = '';
    }
  }, [open, trip?.id]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !receiverName.trim() || !photo) return;
    submitting.current = true; setError('');
    try {
      await submitPod({ tripId: trip.id, receiverName: receiverName.trim(), receiverPhone: receiverPhone.trim(), photo }).unwrap();
      setReceiverName(''); setReceiverPhone(''); setPhoto(null);
      onDone?.('Proof of delivery submitted.');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Submit Proof of Delivery" description={`${trip.number} · ${trip.truckPlate}`} width={480}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="trip-pod-form" type="submit" icon="upload" disabled={busy || !receiverName.trim() || !photo}>{busy ? 'Submitting…' : 'Submit Proof'}</Button></>}>
      <form id="trip-pod-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Receiver Name" required autoComplete="off" disabled={busy} value={receiverName} onChange={(event) => setReceiverName(event.target.value)} />
        <TextField label="Receiver Phone (optional)" type="tel" autoComplete="off" disabled={busy} value={receiverPhone} onChange={(event) => setReceiverPhone(event.target.value)} />
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="tk-meta">Proof of Delivery Photo *</span>
          <input ref={fileInput} hidden type="file" accept="image/*" aria-label="Proof of Delivery Photo" disabled={busy}
            onChange={(event) => { setPhoto(event.target.files?.[0] ?? null); event.target.value = ''; }} />
          <Button type="button" variant="outline" icon="upload" disabled={busy} onClick={() => fileInput.current?.click()}>Choose Photo</Button>
          <span className="tk-meta" style={{ overflowWrap: 'anywhere' }}>{photo?.name ?? 'No photo selected'}</span>
        </div>
        {error && <p role="alert" style={{ margin: 0, color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}

export function TripOffloadingModal({ trip, open, onClose, onDone }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [unlock, { isLoading: busy }] = useUnlockCompanyTripOffloadingMutation();
  const submitting = useRef(false);
  const valid = /^[A-Z0-9]{6}$/.test(code);
  useEffect(() => { if (open) { setCode(''); setError(''); } }, [open, trip?.id]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !valid) return;
    submitting.current = true; setError('');
    try {
      await unlock({ tripId: trip.id, code }).unwrap();
      setCode('');
      onDone?.('Offloading started.');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Start Offloading" description={`${trip.number} · ${trip.truckPlate}`} width={440}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="trip-offloading-form" type="submit" icon="key-round" disabled={busy || !valid}>{busy ? 'Verifying…' : 'Start Offloading'}</Button></>}>
      <form id="trip-offloading-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Unlock Code" required autoComplete="off" spellCheck={false} maxLength={6} pattern="[A-Z0-9]{6}" disabled={busy} value={code}
          hint="Enter the 6-character code shared by the forwarder."
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
        {error && <p role="alert" style={{ margin: 0, color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}
