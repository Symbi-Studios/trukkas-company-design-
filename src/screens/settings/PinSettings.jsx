import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Badge, Banner, Button, EmptyState, Icon, SectionCard, SkeletonRow } from '../../ds.js';
import { useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation } from '../../store/features/auth/onboardingApi.js';
import { useGetMyProfileAccessQuery } from '../../store/features/profile/profileApi.js';
import { useRequestSettingsPinResetMutation, useResetSettingsPinMutation } from '../../store/features/settings/settingsApi.js';
import { getApiErrorMessage } from '../../store/api/getApiErrorMessage.js';
import { PIN_LENGTH, PIN_PROTECTED_ACTIONS, maskPhone, pinProblem } from '../../domain/security.js';
import { CodeInput } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

/** Create a PIN, change it with the current PIN, or reset it with an SMS code. */
export function PinForm({ mode, phone, onDone, savePin, sendResetCode, disabled = false, loadError = '' }) {
  const [current, setCurrent] = useState('');
  const [otp, setOtp] = useState('');
  const demoCode = '';
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [resendAt, setResendAt] = useState(null);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setTimeout(() => setResendAt(null), Math.max(0, resendAt - Date.now()));
    return () => clearTimeout(timer);
  }, [resendAt]);
  useEffect(() => {
    if (!sent || expiresAt === null) return;
    const timer = setTimeout(() => { setSent(false); setOtp(''); setError('This code has expired. Request a new code.'); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [sent, expiresAt]);

  async function sendCode() {
    if (disabled || busy || resendAt > Date.now()) return;
    setBusy(true); setError('');
    try {
      if (!sendResetCode) throw new Error('PIN reset is unavailable here.');
      const receipt = await sendResetCode();
      setExpiresAt(receipt.expiresAt); setResendAt(receipt.resendAt); setOtp(''); setSent(true);
    } catch (err) { setError(err.message || getApiErrorMessage(err)); if (err.retryAt) setResendAt(err.retryAt); }
    finally { setBusy(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (disabled || busy) return;
    setError('');
    const problem = pinProblem(pin);
    if (problem) { setError(problem); return; }
    if (pin !== confirm) { setError('The new PINs don’t match.'); return; }
    if (mode === 'change' && !/^\d{4}$/.test(current)) { setError('Enter your current four-digit PIN.'); return; }
    if (mode === 'reset' && (!sent || !/^\d{6}$/.test(otp))) { setError('Enter the six-digit reset code.'); return; }
    if (mode === 'reset' && expiresAt !== null && Date.now() >= expiresAt) { setSent(false); setError('This code has expired. Request a new code.'); return; }
    setBusy(true);
    try {
      await savePin({ newPin: pin, confirmPin: confirm, currentPin: mode === 'change' ? current : undefined, otp: mode === 'reset' ? otp : undefined });
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className={styles.pinForm}>
      {mode === 'change' && <CodeInput masked label="Current PIN" length={PIN_LENGTH} value={current} onChange={setCurrent} disabled={busy || disabled} />}
      {mode === 'reset' && (
        sent ? (
          <>
            <CodeInput label={`Code sent to ${maskPhone(phone)}`} value={otp} onChange={setOtp} disabled={busy || disabled} />
            {demoCode && <Badge tone="info">Demo code: {demoCode}</Badge>}
          </>
        ) : (
          <Button variant="secondary" icon="message-square" disabled={!phone || disabled || busy || resendAt > Date.now()} onClick={sendCode}>
            Text a reset code to {phone ? maskPhone(phone) : 'your phone'}
          </Button>
        )
      )}
      {(mode !== 'reset' || sent) && (
        <>
          <CodeInput masked label="New PIN" length={PIN_LENGTH} value={pin} onChange={setPin} disabled={busy || disabled} />
          <CodeInput masked label="Confirm New PIN" length={PIN_LENGTH} value={confirm} onChange={setConfirm} disabled={busy || disabled} />
          <p className={styles.hint}>Use 4 digits. Avoid birthdays, repeated digits (1111) or sequences (1234).</p>
          {(error || loadError) && <p className={styles.error}>{error || loadError}</p>}
          <Button type="submit" icon="lock" disabled={disabled || busy || !!pinProblem(pin) || pin !== confirm || (mode === 'change' && current.length !== PIN_LENGTH) || (mode === 'reset' && otp.length !== 6)}>{busy ? 'Saving…' : mode === 'create' ? 'Create PIN' : 'Save New PIN'}</Button>
        </>
      )}
      {mode === 'reset' && !sent && error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function PinSettings({ onToast }) {
  const account = useSelector((state) => state.auth.account);
  const { currentData: security, error, isLoading } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: access, error: accessError } = useGetMyProfileAccessQuery();
  const [save] = useSaveOnboardingPinMutation();
  const [requestReset] = useRequestSettingsPinResetMutation();
  const [reset] = useResetSettingsPinMutation();
  const [mode, setMode] = useState(null);
  const pin = !error && security?.pin ? security.pin : { set: null, updatedOn: '—' };
  const locked = false; // The API explicitly does not expose PIN-entry lockouts.
  const activeMode = mode || (pin.set === false ? 'create' : null);
  const canEdit = !accessError && !error && typeof pin.set === 'boolean' && access?.canEdit === true;
  async function savePin(values) {
    if (!canEdit) throw new Error('Load your current PIN status and settings access before saving.');
    try { return await (mode === 'reset' ? reset({ code: values.otp, newPin: values.newPin, confirmPin: values.confirmPin }) : save(values)).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }

  return (
    <>
      <SectionCard title="Transaction PIN" description="A 4-digit PIN that approves money movement from your account."
        action={<Badge tone={pin.set ? (locked ? 'danger' : 'success') : 'warning'} dot>{pin.set === null ? '—' : pin.set ? (locked ? 'Locked' : 'Active') : 'Not set'}</Badge>}>
        {isLoading ? <SkeletonRow variant="security" /> : error ? <EmptyState icon="lock" title={getApiErrorMessage(error)} /> : pin.set === null && <span className="tk-meta">—</span>}
        {locked && <Banner tone="danger" title="PIN temporarily locked">Too many wrong attempts. Wait 15 minutes or reset your PIN below.</Banner>}
        {!isLoading && pin.set && !activeMode && (
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="green"><Icon name="lock-keyhole" size={18} /></span>
            <span className={styles.rowMain}><strong>PIN is set</strong><small>Last changed {pin.updatedOn}</small></span>
            <Button variant="outline" disabled={!canEdit} onClick={() => setMode('change')}>Change PIN</Button>
            <Button variant="ghost" disabled={!canEdit} onClick={() => setMode('reset')}>Forgot PIN?</Button>
          </div>
        )}
        {!isLoading && activeMode && (
          <>
            {!pin.set && <p className="tk-meta" style={{ marginTop: 0 }}>You haven’t set a transaction PIN yet. You’ll need one before requesting payouts or withdrawing funds.</p>}
            <PinForm
              key={activeMode} mode={activeMode} phone={account?.phone} disabled={!canEdit} loadError={error || accessError ? getApiErrorMessage(error || accessError) : ''} savePin={savePin} sendResetCode={() => requestReset().unwrap()}
              onDone={() => { setMode(null); onToast(activeMode === 'create' ? 'Transaction PIN created.' : 'Transaction PIN updated.'); }}
            />
            {pin.set && <Button variant="ghost" style={{ marginTop: 10 }} onClick={() => setMode(null)}>Cancel</Button>}
          </>
        )}
      </SectionCard>
      <SectionCard title="Actions that need your PIN">
        {PIN_PROTECTED_ACTIONS.map((a) => (
          <div key={a.key} className={styles.row}>
            <span className={styles.iconTile}><Icon name={a.icon} size={18} /></span>
            <span className={styles.rowMain}><strong>{a.label}</strong></span>
            <Badge tone="neutral">—</Badge>
          </div>
        ))}
        <p className={styles.hint}>Trukkas staff will never ask for your PIN.</p>
      </SectionCard>
    </>
  );
}
