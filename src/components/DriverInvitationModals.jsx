'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Badge, Button, Modal, SearchField, Select, SkeletonRow } from '../ds.js';
import { useSearchCompanyDriversQuery, useInviteCompanyDriverMutation, useRemoveCompanyDriverMutation } from '../store/features/drivers/driversApi.js';
import { useGetFleetQuery } from '../store/features/fleet/fleetApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { PickList } from './AssignModals.jsx';
import styles from './AssignModals.module.css';

export function InviteExistingDriverModal({ open, onClose, onDone }) {
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [truckId, setTruckId] = useState('');
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(null);
  const submitting = useRef(false);
  const search = useMemo(() => ({ q: term, page }), [term, page]);
  const ready = query.trim().length >= 3 && query.trim() === term;
  const { currentData: results, error: searchError, isFetching } = useSearchCompanyDriversQuery(search, {
    skip: !open || !ready, refetchOnMountOrArgChange: true,
  });
  const { currentData: fleet, error: fleetError } = useGetFleetQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [invite, { isLoading: busy, reset }] = useInviteCompanyDriverMutation();
  const drivers = ready && !searchError ? results?.drivers ?? [] : [];
  const driver = drivers.find((row) => row.id === selected);
  const trucks = !fleetError ? (fleet ?? []).filter((truck) => truck.driverKnown && !truck.driverId && !truck.onTrip && ['ACTIVE', 'APPROVED'].includes(truck.wireStatus)) : [];
  const canInvite = driver?.verified === true && (!truckId || trucks.some((truck) => truck.id === truckId));

  useEffect(() => {
    if (open) { setQuery(''); setTerm(''); setPage(1); setSelected(null); setTruckId(''); setError(''); setRetryAt(null); reset(); }
  }, [open, reset]);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!retryAt) return undefined;
    const timer = setTimeout(() => setRetryAt(null), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!ready || isFetching || searchError || !results) return;
    const lastPage = Math.max(1, results.totalPages);
    if (page > lastPage) { setPage(lastPage); setSelected(null); }
  }, [ready, isFetching, searchError, results, page]);

  async function submit() {
    if (submitting.current || !canInvite || isFetching || retryAt > Date.now()) return;
    submitting.current = true; setError('');
    try {
      const receipt = await invite({ driverId: driver.id, ...(truckId ? { truckId } : {}), search }).unwrap();
      onDone(receipt);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); setRetryAt(requestError.retryAt ?? null); }
    finally { submitting.current = false; }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Invite Existing Driver" width={620}
      description="Find a verified driver who is not linked to a company."
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button icon="send" disabled={busy || isFetching || !canInvite || retryAt > Date.now()} onClick={submit}>{busy ? 'Sending…' : 'Send Invitation'}</Button></>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <SearchField placeholder="Search by name, phone or email..." disabled={busy} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setPage(1); setError(''); }} />
        {query.trim().length < 3 ? <p className="tk-meta" style={{ margin: 0 }}>Enter at least three characters to search.</p>
          : !ready || isFetching ? <SkeletonRow variant="list" rows={3} />
            : searchError ? <p className={styles.error}>{getApiErrorMessage(searchError)}</p>
              : <PickList selected={selected} onSelect={setSelected} empty="No verified, unlinked drivers found." items={drivers.map((row) => ({
                id: row.id, title: row.name, subtitle: row.phone + ' · ' + row.email + ' · ' + row.licenseClass,
                media: <Avatar name={row.name} src={row.photo || undefined} size={36} />,
                badge: <Badge tone={row.verified === true ? 'success' : 'neutral'}>{row.verified === true ? 'Verified' : '—'}</Badge>,
                blocked: row.verified !== true ? 'Verification has not been confirmed.' : null,
              }))} />}
        {ready && !searchError && results && results.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Button size="sm" variant="outline" disabled={busy || isFetching || page <= 1} onClick={() => { setPage((value) => value - 1); setSelected(null); }}>Previous</Button>
            <span className="tk-meta">Page {results.page} of {results.totalPages}</span>
            <Button size="sm" variant="outline" disabled={busy || isFetching || page >= results.totalPages} onClick={() => { setPage((value) => value + 1); setSelected(null); }}>Next</Button>
          </div>
        )}
        <Select label="Truck on joining (optional)" value={truckId} disabled={busy || !!fleetError || !fleet}
          options={[{ value: '', label: 'Choose a truck later' }, ...trucks.map((truck) => ({ value: truck.id, label: truck.plate + ' · ' + truck.makeModel }))]}
          onChange={(event) => setTruckId(event.target.value)} />
        {fleetError && <p className={styles.error}>{getApiErrorMessage(fleetError)}</p>}
        <p className="tk-meta" style={{ margin: 0 }}>The code goes directly to the driver. They enter it in their app to join your company. Contact details stay masked until they join.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function RemoveCompanyDriverModal({ driver, open, onClose, onDone }) {
  const [remove, { isLoading: busy }] = useRemoveCompanyDriverMutation();
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) setError(''); }, [open]);
  async function submit() {
    if (submitting.current || !driver?.id) return;
    submitting.current = true; setError('');
    try { await remove(driver.id).unwrap(); onDone(); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { submitting.current = false; }
  }
  if (!driver) return null;
  return (
    <Modal open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Remove from Company" width={460}
      description={'Remove ' + driver.name + ' from your company?'}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="danger" icon="user-minus" disabled={busy} onClick={submit}>{busy ? 'Removing…' : 'Remove from Company'}</Button></>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <p className="tk-meta" style={{ margin: 0 }}>Their truck assignment and pending invitations from your company will be cleared. The driver will be notified and can join a company again through an invitation.</p>
        <p className="tk-meta" style={{ margin: 0 }}>A driver on an active trip or with a pending offer cannot be removed.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
