'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal, TextField } from '../ds.js';
import { authFailureCode, useAddCompanyAccountMutation } from '../store/features/auth/authApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { CodeInput } from './SecurityInputs.jsx';
import styles from '../screens/AuthScreens.module.css';

// Mount only while open, keeping credentials in transient form state.
export function CompanyAccountModal({ email, initialPassword = '', availableRoles = [], onClose, onComplete }) {
  const [password, setPassword] = useState(initialPassword);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState('');
  const [addCompanyAccount, { isLoading: busy }] = useAddCompanyAccountMutation();
  const submitting = useRef(false);

  useEffect(() => {
    if (!challenge) return undefined;
    const expiresAt = Date.parse(challenge.expiresAt);
    const expired = () => {
      setChallenge(null); setCode(''); setUseBackup(false);
      setError('Your sign-in code expired. Enter your password again to continue.');
    };
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { expired(); return undefined; }
    const timer = setTimeout(expired, expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [challenge]);

  async function submit(event, value = code) {
    event?.preventDefault();
    if (submitting.current) return;
    if (challenge && (!Number.isFinite(Date.parse(challenge.expiresAt)) || Date.parse(challenge.expiresAt) <= Date.now())) {
      setChallenge(null); setCode(''); setUseBackup(false);
      setError('Your sign-in code expired. Enter your password again to continue.');
      return;
    }
    submitting.current = true;
    setError('');
    try {
      const result = await addCompanyAccount({
        email, password,
        ...(challenge ? { challengeId: challenge.id, challengePurpose: challenge.purpose, ...(useBackup ? { backupCode: value } : { code: value }) } : {}),
      }).unwrap();
      if (result.twoFactorRequired) { setChallenge(result.challenge); setCode(''); setUseBackup(false); return; }
      setPassword('');
      onComplete(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setCode('');
      // Verification consumes the challenge before later account/setup calls.
      // Start a fresh sign-in after those failures so a retry can resume safely.
      if (challenge && authFailureCode(err) !== 'TWO_FACTOR_INVALID') setChallenge(null);
    } finally { submitting.current = false; }
  }

  const validCode = useBackup ? /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code.trim()) : /^\d{6}$/.test(code);
  return (
    <Modal open title={challenge ? 'Verify your existing account' : 'Add a company account'}
      description={availableRoles.includes('FORWARDER') ? 'You have a forwarder account. Add a trucking company account with the same login?' : 'Use your existing Trukkas login to add a trucking company account.'}
      onClose={() => { if (!submitting.current) onClose(); }}>
      <form className={styles.form} onSubmit={submit}>
        <TextField label="Email address" type="email" value={email} readOnly autoComplete="username" />
        {challenge ? (
          <>
            <p className="tk-meta">{useBackup ? 'Enter one of your 8-character backup codes.' : 'Open your authenticator app and enter the 6-digit code for Trukkas.'}</p>
            {useBackup ? <TextField label="Backup code" autoFocus autoComplete="one-time-code" value={code} disabled={busy} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX" />
              : <CodeInput autoFocus value={code} onChange={setCode} onComplete={(value) => submit(null, value)} disabled={busy} />}
            <Button variant="ghost" disabled={busy} onClick={() => { setUseBackup((value) => !value); setCode(''); }}>{useBackup ? 'Use verification code' : 'Use a backup code'}</Button>
          </>
        ) : (
          <>
            <TextField label="Current Trukkas password" type="password" autoComplete="current-password" autoFocus required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
            <p className="tk-meta">Enter the password for your existing login. If you already have a company account, we’ll open it.</p>
          </>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <Button type="submit" fullWidth disabled={busy || !password || (challenge && !validCode)}>{busy ? 'Continuing…' : challenge ? 'Verify & continue' : 'Add company account'}</Button>
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
      </form>
    </Modal>
  );
}
