import { useEffect, useState } from 'react';
import { Button, Modal, Select, Textarea, TextField } from '../ds.js';
import { reportTripIssue, updateTripLocation } from '../mock/api.js';
import { TRIP_ISSUE_TYPES } from '../domain/trips.js';

export function ReportIssueModal({ trip, open, onClose, onDone }) {
  const [type, setType] = useState(TRIP_ISSUE_TYPES[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setType(TRIP_ISSUE_TYPES[0]); setDetails(''); } }, [open]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await reportTripIssue(trip.id, { type, details: details.trim() });
      onDone?.(`Issue reported on ${trip.id}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Report Issue" description={`${trip.id} · ${trip.truckPlate}`} width={480}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="issue-form" type="submit" icon="triangle-alert" disabled={busy || !details.trim()}>{busy ? 'Reporting…' : 'Report Issue'}</Button></>}
    >
      <form id="issue-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Select label="Issue Type" value={type} options={TRIP_ISSUE_TYPES} onChange={(e) => setType(e.target.value)} />
        <Textarea label="What happened?" rows={4} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe the issue, location and any support needed..." />
      </form>
    </Modal>
  );
}

export function UpdateLocationModal({ trip, open, onClose, onDone }) {
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open && trip) setLocation(trip.currentLocation || ''); }, [open, trip]);
  if (!trip) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateTripLocation(trip.id, location.trim());
      onDone?.(`Location updated for ${trip.id}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Update Location" description={`${trip.id} · ${trip.truckPlate}`} width={440}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="location-form" type="submit" icon="map-pin" disabled={busy || !location.trim()}>{busy ? 'Saving…' : 'Update Location'}</Button></>}
    >
      <form id="location-form" onSubmit={submit}>
        <TextField label="Current Location" required icon="map-pin" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Along Abuja – Kaduna Expressway" />
      </form>
    </Modal>
  );
}
