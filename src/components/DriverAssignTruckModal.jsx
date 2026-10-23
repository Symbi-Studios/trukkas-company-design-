import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Icon, Modal, SearchField, SkeletonRow } from '../ds.js';
import { useAssignFleetDriverMutation, useGetFleetDriversQuery, useGetFleetQuery } from '../store/features/fleet/fleetApi.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { PickList } from './AssignModals.jsx';
import styles from './AssignModals.module.css';

export function DriverAssignTruckModal({ driver, open, onClose, onDone }) {
  const { currentData: trucks, error: trucksError, isLoading } = useGetFleetQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const { currentData: drivers, error: driversError, isFetching: driversFetching } = useGetFleetDriversQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const { currentData: trips, error: tripsError } = useGetCompanyTripsQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [assign] = useAssignFleetDriverMutation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) { setSelected(null); setQuery(''); setError(''); } }, [open, driver?.id]);
  const confirmedDriver = driversError ? null : drivers?.find((item) => item.id === driver?.id);

  const items = (trucks ?? [])
    .filter((truck) => truck.id !== driver?.truckId)
    .filter((truck) => !query || [truck.plate, truck.makeModel, truck.driver].some((value) => String(value ?? '').toLowerCase().includes(query.toLowerCase())))
    .map((truck) => {
      const onTrip = trips?.some((trip) => trip.open && (trip.truckId === truck.id || truck.plate !== '—' && trip.truckPlate === truck.plate));
      return {
        id: truck.id, title: truck.plate, subtitle: `${truck.makeModel} · ${truck.location}`,
        media: <span className={styles.truckIcon}><Icon name="truck" size={18} /></span>,
        badge: <Badge tone={truck.status === 'Approved' || truck.status === 'Active' ? 'success' : truck.status === 'On Trip' ? 'info' : truck.status === 'In Maintenance' ? 'warning' : 'neutral'}>{truck.status}</Badge>,
        blocked: onTrip ? 'On an active trip — change drivers after it completes.' : null,
        warning: !onTrip && truck.driver && truck.driver !== '—' ? `Currently driven by ${truck.driver}; they will be unassigned.` : null,
      };
    }).sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || Number(!!a.warning) - Number(!!b.warning));

  async function submit() {
    if (submitting.current || !selected) return;
    const truck = trucks?.find((item) => item.id === selected);
    const currentTrip = trips?.some((trip) => trip.open && (trip.driverId === driver.id || driver.truckId && trip.truckId === driver.truckId || driver.truckPlate && trip.truckPlate === driver.truckPlate));
    if (!driver.active || !confirmedDriver?.active || confirmedDriver.onTrip || driversFetching || !truck || !trips || trucksError || tripsError || currentTrip || items.find((item) => item.id === selected)?.blocked) { setError('This driver or truck cannot be assigned right now.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try { await assign({ truckId: selected, driverId: driver.id }).unwrap(); onDone?.(truck.plate); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  if (!driver) return null;
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} width={560}
      title={driver.truckPlate ? 'Reassign to Another Truck' : 'Assign to Truck'}
      description={`${driver.name}${driver.truckPlate ? ` · currently on ${driver.truckPlate}` : ''}`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button icon="truck" disabled={!selected || busy || driversFetching || !confirmedDriver?.active || confirmedDriver.onTrip || !trucks || !trips || !!trucksError || !!tripsError || !driver.active} onClick={submit}>{busy ? 'Saving…' : 'Assign Truck'}</Button></>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <SearchField placeholder="Search trucks by plate or model..." value={query} onChange={(event) => setQuery(event.target.value)} />
        {isLoading || driversFetching ? <SkeletonRow variant="list" rows={3} /> : <PickList items={items} selected={selected} onSelect={setSelected} empty="No trucks match your search." />}
        {(error || trucksError || driversError || tripsError) && <span className={styles.error}>{error || getApiErrorMessage(trucksError || driversError || tripsError)}</span>}
      </div>
    </Modal>
  );
}
