import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Select, Textarea, TextField } from '../ds.js';
import { useReportCompanyTripIssueMutation, useUpdateCompanyTripLocationMutation } from '../store/features/trips/tripsApi.js';
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
  useEffect(() => { if (open && trip) { setLocation(trip.currentLocation === '—' ? '' : trip.currentLocation || ''); setError(''); } }, [open, trip]);
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
      open={open} onClose={onClose} title="Update Location" description={`${trip.number} · ${trip.truckPlate}`} width={440}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="location-form" type="submit" icon="map-pin" disabled={busy || !location.trim()}>{busy ? 'Saving…' : 'Update Location'}</Button></>}
    >
      <form id="location-form" onSubmit={submit}>
        <TextField label="Current Location" required maxLength={200} icon="map-pin" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Along Abuja – Kaduna Expressway" />
        {error && <p role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}
