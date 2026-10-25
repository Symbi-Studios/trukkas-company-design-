'use client';

import { useRef, useState } from 'react';
import { Avatar, Badge, Button, DataTable, EmptyState, Modal, SectionCard, SkeletonRow } from '../ds.js';
import { useGetCompanyDriverInvitationsQuery, useCancelCompanyDriverInvitationMutation } from '../store/features/drivers/driversApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import styles from '../components/AssignModals.module.css';

const STATUS_TONE = { PENDING: 'info', REDEEMED: 'success', EXPIRED: 'warning', CANCELLED: 'neutral' };

export function DriverInvitations({ onToast, onRefresh }) {
  const { currentData: invitations, error: loadError, isLoading, isFetching, refetch } = useGetCompanyDriverInvitationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [cancel, { isLoading: cancelling }] = useCancelCompanyDriverInvitationMutation();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  async function confirmCancel() {
    if (submitting.current || !pending) return;
    submitting.current = true; setError('');
    try { await cancel(pending.id).unwrap(); setPending(null); onToast('Driver invitation cancelled.'); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { submitting.current = false; }
  }
  return (
    <>
      <SectionCard title="Driver Invitations" description="Drivers join your company after entering their invitation code in the app." pad="none"
        action={<Button variant="outline" size="sm" icon="refresh-cw" disabled={isFetching || cancelling} onClick={() => { void refetch(); onRefresh?.(); }}>Refresh</Button>}>
        {isLoading ? <SkeletonRow columns={5} /> : loadError ? <EmptyState icon="send" title={getApiErrorMessage(loadError)} />
          : invitations === undefined ? <span className="tk-meta">—</span> : invitations.length === 0 ? <EmptyState icon="send" title="No driver invitations yet" />
            : <DataTable rows={invitations} rowKey={(row) => row.id} columns={[
              { key: 'driver', header: 'Driver', render: (row) => <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={row.name} src={row.photo || undefined} size={30} /><strong>{row.name}</strong></span> },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={STATUS_TONE[row.status]} dot>{row.statusLabel}</Badge> },
              { key: 'created', header: 'Sent', render: (row) => <span className="tk-meta">{row.created}</span> },
              { key: 'expires', header: 'Expires', render: (row) => <span className="tk-meta">{row.expires}</span> },
              { key: 'actions', header: '', render: (row) => row.status === 'PENDING' && row.expiresAt > Date.now()
                ? <Button size="sm" variant="outline" disabled={cancelling || isFetching} onClick={() => { setPending(row); setError(''); }}>Cancel Invitation</Button> : null },
            ]} />}
      </SectionCard>
      <Modal open={!!pending} onClose={() => { if (!submitting.current) setPending(null); }} title="Cancel Driver Invitation" width={440}
        description={pending ? 'Cancel the invitation for ' + pending.name + '?' : ''}
        footer={<><Button variant="outline" disabled={cancelling} onClick={() => setPending(null)}>Keep Invitation</Button><Button variant="danger" disabled={cancelling} onClick={confirmCancel}>{cancelling ? 'Cancelling…' : 'Cancel Invitation'}</Button></>}>
        <p className="tk-meta" style={{ margin: 0 }}>The current code will stop working. You can send a new invitation later.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </Modal>
    </>
  );
}
