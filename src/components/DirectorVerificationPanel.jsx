'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Badge, Button, EmptyState, LabelValue, SkeletonRow, TextField } from '../ds.js';
import { useGetDirectorVerificationQuery, useSubmitDirectorVerificationMutation } from '../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import styles from '../screens/settings/Settings.module.css';

const statusLabel = (status) => ({
  NOT_STARTED: 'Not submitted', PENDING_REVIEW: 'Pending review', VERIFIED: 'Verified', REJECTED: 'Rejected',
})[status] ?? '—';
const statusTone = (status) => ({ NOT_STARTED: 'neutral', PENDING_REVIEW: 'warning', VERIFIED: 'success', REJECTED: 'danger' })[status] ?? 'neutral';
const canSubmit = (status) => status === 'NOT_STARTED' || status === 'REJECTED';
const displayId = (record) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span>{record?.masked ?? '—'}</span><Badge tone={statusTone(record?.status)}>{statusLabel(record?.status)}</Badge>
  </span>
);

export function DirectorVerificationFields({ showDirector = true }) {
  const account = useSelector((state) => state.auth.account);
  const { currentData: verification, error, isLoading } = useGetDirectorVerificationQuery(undefined, {
    skip: !account, refetchOnMountOrArgChange: true,
  });
  const [submit, { isLoading: submitting, reset }] = useSubmitDirectorVerificationMutation();
  const [nin, setNin] = useState('');
  const [bvn, setBvn] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const ninReady = canSubmit(verification?.nin?.status);
  const bvnReady = canSubmit(verification?.bvn?.status);

  async function send(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError(''); setNotice('');
    const body = { ...(ninReady && nin ? { nin } : {}), ...(bvnReady && bvn ? { bvn } : {}) };
    if (!Object.keys(body).length) {
      setSubmitError('Enter an available 11-digit NIN, BVN, or both.');
      return;
    }
    try {
      await submit(body).unwrap();
      setNin(''); setBvn('');
      setNotice('Submitted for manual review.');
    } catch (err) { setSubmitError(getApiErrorMessage(err)); }
    finally { reset(); }
  }

  if (isLoading) return <SkeletonRow variant="detail" />;
  if (error) return <EmptyState icon="shield-check" title={getApiErrorMessage(error)} />;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {showDirector && verification?.director?.name && verification.director.name !== '—' && (
        <>
          <LabelValue label="Director" value={verification.director.name} />
          <LabelValue label="Date of Birth" value={verification.director.dateOfBirth} />
        </>
      )}
      <LabelValue label="NIN" value={displayId(verification?.nin)} />
      <LabelValue label="BVN" value={displayId(verification?.bvn)} />
      {verification?.rejectionReason && verification.rejectionReason !== '—' && (
        <p className={styles.error}>Review reason: {verification.rejectionReason}</p>
      )}
      {(ninReady || bvnReady) && (
        <form onSubmit={send} style={{ display: 'grid', gap: 12 }}>
          {ninReady && <TextField label="Director’s NIN" inputMode="numeric" autoComplete="off" maxLength={11} value={nin} disabled={submitting} onChange={(event) => setNin(event.target.value.replace(/\D/g, '').slice(0, 11))} />}
          {bvnReady && <TextField label="Director’s BVN" inputMode="numeric" autoComplete="off" maxLength={11} value={bvn} disabled={submitting} onChange={(event) => setBvn(event.target.value.replace(/\D/g, '').slice(0, 11))} />}
          {submitError && <p className={styles.error}>{submitError}</p>}
          {notice && <Badge tone="success">{notice}</Badge>}
          <Button type="submit" disabled={submitting || (!nin && !bvn) || (nin && nin.length !== 11) || (bvn && bvn.length !== 11)}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        </form>
      )}
      {!ninReady && !bvnReady && <span className="tk-meta">{verification?.reviewMode === 'MANUAL' ? 'Submitted director numbers are encrypted. Trukkas reviews them manually; only masked values appear here.' : '—'}</span>}
    </div>
  );
}
