import { useEffect, useMemo, useState } from 'react';
import { Avatar, Badge, Button, Icon, Modal, SearchField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { assignDriverToTruck } from '../mock/api.js';
import { isOpenTrip } from '../domain/trips.js';
import styles from './AssignModals.module.css';

export function PickList({ items, selected, onSelect, empty }) {
  if (items.length === 0) return <p className="tk-meta" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className={styles.list} role="listbox">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button" role="option" aria-selected={selected === it.id} disabled={!!it.blocked}
            className={`${styles.option} ${selected === it.id ? styles.selected : ''}`}
            onClick={() => onSelect(it.id)}
          >
            <span className={styles.radio}>{selected === it.id && <span />}</span>
            {it.media}
            <span className={styles.main}>
              <strong>{it.title}</strong>
              <small>{it.subtitle}</small>
              {(it.blocked || it.warning) && <em className={it.blocked ? styles.blocked : styles.warning}>{it.blocked || it.warning}</em>}
            </span>
            {it.badge}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Selectable rows for onboarded drivers; drivers on an open trip are blocked. */
export function driverOptions(drivers, trips, { excludeId, query = '' } = {}) {
  return drivers
    .filter((d) => d.id !== excludeId)
    .filter((d) => !query || [d.name, d.phone, d.licenseNumber].some((v) => String(v).toLowerCase().includes(query.toLowerCase())))
    .map((d) => {
      const onTrip = trips.some((t) => t.driverId === d.id && isOpenTrip(t));
      return {
        id: d.id,
        title: d.name,
        subtitle: `${d.licenseClass} · ★ ${d.rating?.toFixed(1) ?? '—'} · ${d.tripsCompleted} trips · ${d.phone}`,
        media: <Avatar name={d.name} src={d.photo || undefined} size={36} />,
        badge: <Badge tone={d.kyc === 'Verified' ? 'success' : 'warning'}>{d.kyc === 'Verified' ? 'Verified' : 'KYC Pending'}</Badge>,
        blocked: onTrip ? 'On an active trip — can’t be reassigned right now.' : null,
        warning: !onTrip && d.truckPlate ? `Currently assigned to ${d.truckPlate}; that truck will be left without a driver.` : null,
      };
    })
    .sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || Number(!!a.warning) - Number(!!b.warning));
}

/** Pick an onboarded driver for a truck (assign or replace). */
export function AssignDriverModal({ truck, open, onClose, onDone }) {
  const drivers = useCollection('drivers') || [];
  const trips = useCollection('trips') || [];
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setSelected(null); setQuery(''); setError(''); } }, [open]);

  const items = useMemo(() => driverOptions(drivers, trips, { excludeId: truck?.driverId, query }), [drivers, trips, truck?.driverId, query]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await assignDriverToTruck(truck.plate, selected);
      onDone?.(drivers.find((d) => d.id === selected));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!truck) return null;
  return (
    <Modal
      open={open} onClose={onClose} width={560}
      title={truck.driverId ? 'Replace Driver' : 'Assign Driver'}
      description={`${truck.plate} · ${truck.makeModel}${truck.driver ? ` · currently ${truck.driver}` : ''}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon="user-check" disabled={!selected || busy} onClick={submit}>{busy ? 'Saving…' : 'Assign Driver'}</Button></>}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <SearchField placeholder="Search drivers by name, phone, licence..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <PickList items={items} selected={selected} onSelect={setSelected} empty="No other drivers match. Onboard a driver from the Drivers page first." />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </Modal>
  );
}

/** Pick a truck for a driver (assign or reassign). */
export function AssignTruckModal({ driver, open, onClose, onDone }) {
  const trucks = useCollection('trucks') || [];
  const trips = useCollection('trips') || [];
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setSelected(null); setQuery(''); setError(''); } }, [open]);

  const items = useMemo(() => trucks
    .filter((t) => t.vehicleClass !== 'Trailer' && t.plate !== driver?.truckPlate)
    .filter((t) => !query || [t.plate, t.makeModel, t.driver].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase())))
    .map((t) => {
      const onTrip = trips.some((trip) => trip.truckPlate === t.plate && isOpenTrip(trip));
      return {
        id: t.plate,
        title: t.plate,
        subtitle: `${t.makeModel} · ${t.location}`,
        media: <span className={styles.truckIcon}><Icon name="truck" size={18} /></span>,
        badge: <Badge tone={t.status === 'Active' ? 'success' : t.status === 'On Trip' ? 'info' : t.status === 'In Maintenance' ? 'warning' : 'neutral'}>{t.status}</Badge>,
        blocked: onTrip ? 'On an active trip — change drivers after it completes.' : null,
        warning: !onTrip && t.driver ? `Currently driven by ${t.driver}; they will be unassigned.` : null,
      };
    })
    .sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || Number(!!a.warning) - Number(!!b.warning)), [trucks, trips, driver?.truckPlate, query]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await assignDriverToTruck(selected, driver.id);
      onDone?.(selected);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!driver) return null;
  return (
    <Modal
      open={open} onClose={onClose} width={560}
      title={driver.truckPlate ? 'Reassign to Another Truck' : 'Assign to Truck'}
      description={`${driver.name}${driver.truckPlate ? ` · currently on ${driver.truckPlate}` : ''}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon="truck" disabled={!selected || busy} onClick={submit}>{busy ? 'Saving…' : 'Assign Truck'}</Button></>}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <SearchField placeholder="Search trucks by plate or model..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <PickList items={items} selected={selected} onSelect={setSelected} empty="No trucks match your search." />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </Modal>
  );
}

/** Confirm unassigning the driver from a truck. */
export function RemoveDriverModal({ truck, open, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setError(''); }, [open]);
  if (!truck) return null;
  async function submit() {
    setBusy(true);
    try {
      await assignDriverToTruck(truck.plate, null);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open} onClose={onClose} width={440} title="Remove Driver"
      description={`${truck.driver} will be unassigned from ${truck.plate}.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" icon="user-minus" disabled={busy} onClick={submit}>{busy ? 'Removing…' : 'Remove Driver'}</Button></>}
    >
      <p className="tk-meta" style={{ margin: 0 }}>The driver stays on your team and can be assigned to another truck. This truck can’t be dispatched on new trips until a driver is assigned.</p>
      {error && <p className={styles.error}>{error}</p>}
    </Modal>
  );
}
