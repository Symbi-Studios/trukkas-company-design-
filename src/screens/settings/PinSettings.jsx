import { useState } from 'react';
import { Badge, Banner, Button, Icon, SectionCard } from '../../ds.js';
import { useCollection } from '../../mock/useCollection.js';
import { sendVerificationCode, setTransactionPin } from '../../mock/api.js';
import { PIN_LENGTH, PIN_PROTECTED_ACTIONS, maskPhone, pinProblem } from '../../domain/security.js';
import { CodeInput } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

/** Create a PIN, change it with the current PIN, or reset it with an SMS code. */
export function PinForm({ mode, phone, onDone }) {
  const [current, setCurrent] = useState('');
  const [otp, setOtp] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const problem = pinProblem(pin);
    if (problem) { setError(problem); return; }
    if (pin !== confirm) { setError('The new PINs don’t match.'); return; }
    setBusy(true);
    try {
      await setTransactionPin({ newPin: pin, currentPin: mode === 'change' ? current : undefined, otp: mode === 'reset' ? otp : undefined });
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className={styles.pinForm}>
      {mode === 'change' && <CodeInput masked label="Current PIN" length={PIN_LENGTH} value={current} onChange={setCurrent} />}
      {mode === 'reset' && (
        sent ? (
          <>
            <CodeInput label={`Code sent to ${maskPhone(phone)}`} value={otp} onChange={setOtp} />
            {demoCode && <Badge tone="info">Demo code: {demoCode}</Badge>}
          </>
        ) : (
          <Button variant="secondary" icon="message-square" disabled={!phone} onClick={async () => { const r = await sendVerificationCode('sms', phone); setDemoCode(r.demoCode); setSent(true); }}>
            Text a reset code to {phone ? maskPhone(phone) : 'your phone'}
          </Button>
        )
      )}
      {(mode !== 'reset' || sent) && (
        <>
          <CodeInput masked label="New PIN" length={PIN_LENGTH} value={pin} onChange={setPin} />
          <CodeInput masked label="Confirm New PIN" length={PIN_LENGTH} value={confirm} onChange={setConfirm} />
          <p className={styles.hint}>Use 6 digits. Avoid birthdays, repeated digits (111111) or sequences (123456).</p>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" icon="lock" disabled={busy || pin.length < PIN_LENGTH || confirm.length < PIN_LENGTH}>{busy ? 'Saving…' : mode === 'create' ? 'Create PIN' : 'Save New PIN'}</Button>
        </>
      )}
    </form>
  );
}

export function PinSettings({ onToast }) {
  const security = (useCollection('security') || [])[0];
  const profile = (useCollection('adminProfile') || [])[0];
  const [mode, setMode] = useState(null);
  if (!security) return null;
  const { pin } = security;
  const locked = pin.lockedUntil && Date.now() < pin.lockedUntil;
  const activeMode = mode || (pin.set ? null : 'create');

  return (
    <>
      <SectionCard title="Transaction PIN" description="A 6-digit PIN that approves money movement from your account."
        action={<Badge tone={pin.set ? (locked ? 'danger' : 'success') : 'warning'} dot>{pin.set ? (locked ? 'Locked' : 'Active') : 'Not set'}</Badge>}>
        {locked && <Banner tone="danger" title="PIN temporarily locked">Too many wrong attempts. Wait 15 minutes or reset your PIN below.</Banner>}
        {pin.set && !activeMode && (
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="green"><Icon name="lock-keyhole" size={18} /></span>
            <span className={styles.rowMain}><strong>PIN is set</strong><small>Last changed {pin.updatedOn}</small></span>
            <Button variant="outline" onClick={() => setMode('change')}>Change PIN</Button>
            <Button variant="ghost" onClick={() => setMode('reset')}>Forgot PIN?</Button>
          </div>
        )}
        {activeMode && (
          <>
            {!pin.set && <p className="tk-meta" style={{ marginTop: 0 }}>You haven’t set a transaction PIN yet. You’ll need one before requesting payouts or withdrawing funds.</p>}
            <PinForm
              key={activeMode} mode={activeMode} phone={profile?.phone}
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
            <Badge tone="success">Protected</Badge>
          </div>
        ))}
        <p className={styles.hint}>Trukkas staff will never ask for your PIN. Five wrong attempts lock it for 15 minutes.</p>
      </SectionCard>
    </>
  );
}
