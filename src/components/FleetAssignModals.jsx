import { useEffect, useRef, useState } from 'react';
import { Avatar, Badge, Button, Modal, SearchField } from '../ds.js';
import { useAssignFleetDriverMutation, useGetFleetDriversQuery } from '../store/features/fleet/fleetApi.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { PickList } from './AssignModals.jsx';
import styles from './AssignModals.module.css';

export function FleetAssignDriverModal({ truck, open, onClose, onDone }) {
  const { data: drivers, error: driversError } = useGetFleetDriversQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const { data: trips, error: tripsError } = useGetCompanyTripsQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [assign] = useAssignFleetDriverMutation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) { setSelected(null); setQuery(''); setError(''); } }, [open]);
  const items = (drivers ?? []).filter((driver) => driver.active && driver.id !== truck?.driverId)
    .filter((driver) => !query || [driver.name, driver.phone, driver.licenseNumber].some((value) => value.toLowerCase().includes(query.toLowerCase())))
    .map((driver) => {
      const onTrip = driver.truckPlate && trips?.some((trip) => trip.truckPlate === driver.truckPlate && trip.open);
      return {
        id: driver.id, title: driver.name,
        subtitle: `${driver.licenseClass} · ★ ${driver.rating?.toFixed(1) ?? '—'} · ${driver.tripsCompleted} trips · ${driver.phone}`,
        media: <Avatar name={driver.name} src={driver.photo || undefined} size={36} />,
        badge: <Badge tone={driver.kyc === 'Verified' ? 'success' : driver.kyc === '—' ? 'neutral' : 'warning'}>{driver.kyc}</Badge>,
        blocked: onTrip ? 'On an active trip — can’t be reassigned right now.' : null,
        warning: !onTrip && driver.truckPlate ? `Currently assigned to ${driver.truckPlate}; that truck will be left without a driver.` : null,
      };
    }).sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || Number(!!a.warning) - Number(!!b.warning));
  async function submit() {
    if (submitting.current || !selected) return;
    submitting.current = true; setBusy(true); setError('');
    try { await assign({ truckId: truck.id, driverId: selected }).unwrap(); onDone?.(drivers.find((driver) => driver.id === selected)); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (!truck) return null;
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} width={560}
      title={truck.driverId ? 'Replace Driver' : 'Assign Driver'}
      description={`${truck.plate} · ${truck.makeModel}${truck.driver ? ` · currently ${truck.driver}` : ''}`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button icon="user-check" disabled={!selected || busy || !drivers || !trips || !!driversError || !!tripsError} onClick={submit}>{busy ? 'Saving…' : 'Assign Driver'}</Button></>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <SearchField placeholder="Search drivers by name, phone, licence..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <PickList items={items} selected={selected} onSelect={setSelected} empty="No other drivers match. Onboard a driver from the Drivers page first." />
        {(error || driversError || tripsError) && <span className={styles.error}>{error || getApiErrorMessage(driversError || tripsError)}</span>}
      </div>
    </Modal>
  );
}

export function FleetRemoveDriverModal({ truck, open, onClose, onDone }) {
  const [assign] = useAssignFleetDriverMutation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) setError(''); }, [open]);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await assign({ truckId: truck.id, driverId: null }).unwrap(); onDone?.(); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (!truck) return null;
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} width={440} title="Remove Driver"
      description={`${truck.driver} will be unassigned from ${truck.plate}.`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="danger" icon="user-minus" disabled={busy} onClick={submit}>{busy ? 'Removing…' : 'Remove Driver'}</Button></>}>
      <p className="tk-meta" style={{ margin: 0 }}>The driver stays on your team and can be assigned to another truck. This truck can’t be dispatched on new trips until a driver is assigned.</p>
      {error && <p className={styles.error}>{error}</p>}
    </Modal>
  );
}
