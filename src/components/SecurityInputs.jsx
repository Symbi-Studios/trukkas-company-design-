import { useEffect, useRef, useState } from 'react';
import { Link } from '../router.js';
import { Button, Icon, Modal, ProgressBar } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { setTransactionPin } from '../mock/api.js';
import { PIN_LENGTH, passwordStrength, pinProblem } from '../domain/security.js';
import styles from './SecurityInputs.module.css';

/** Row of single-digit boxes for OTPs and PINs. Supports paste and backspace navigation. */
export function CodeInput({ length = 6, value = '', onChange, masked = false, autoFocus = false, disabled, label, error, onComplete }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);

  function update(next) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  return (
    <div className={styles.codeWrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.code} role="group" aria-label={label || 'Verification code'}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className={`${styles.box} ${error ? styles.boxError : ''}`}
            type={masked ? 'password' : 'text'}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => {
              const typed = e.target.value.replace(/\D/g, '');
              if (!typed) return;
              const chars = value.split('');
              if (typed.length > 1) { const clean = update(value.slice(0, i) + typed); refs.current[Math.min(clean.length, length - 1)]?.focus(); return; }
              chars[i] = typed;
              update(chars.join('').slice(0, length));
              refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault();
                const chars = digits.slice();
                if (chars[i]) chars[i] = '';
                else if (i > 0) { chars[i - 1] = ''; refs.current[i - 1]?.focus(); }
                onChange(chars.join(''));
              } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
              else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const clean = update(e.clipboardData.getData('text'));
              refs.current[Math.min(clean.length, length - 1)]?.focus();
            }}
          />
        ))}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

export function PasswordStrength({ password }) {
  if (!password) return null;
  const s = passwordStrength(password);
  const color = { success: 'var(--tk-success)', info: 'var(--tk-blue)', warning: 'var(--tk-warning)', danger: 'var(--tk-danger)' }[s.tone];
  return (
    <div className={styles.strength}>
      <ProgressBar value={s.score} max={4} height={6} color={color} label="Password strength" caption={s.label} />
      <ul>
        {s.checks.map((c) => (
          <li key={c.label} className={c.ok ? styles.ok : ''}><Icon name={c.ok ? 'circle-check' : 'circle'} size={13} />{c.label}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Asks for the transaction PIN before a financial action, then runs
 * `onConfirm(pin)`. Errors thrown by `onConfirm` (wrong PIN, lockout) are shown
 * in place. If no PIN exists yet, the user creates one first.
 */
export function PinPrompt({ open, onClose, title = 'Enter Transaction PIN', description, confirmLabel = 'Confirm', onConfirm }) {
  const security = useCollection('security') || [];
  const account = security[0];
  const pinSet = !!account?.pin?.set;
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage, setStage] = useState('enter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPin(''); setConfirmPin(''); setError(''); setStage(pinSet ? 'enter' : 'create'); }
  }, [open, pinSet]);

  async function run(value) {
    setBusy(true);
    setError('');
    try {
      await onConfirm(value);
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  async function createThenRun() {
    const problem = pinProblem(pin);
    if (problem) { setError(problem); return; }
    if (pin !== confirmPin) { setError('The PINs don’t match.'); setConfirmPin(''); return; }
    setBusy(true);
    try {
      await setTransactionPin({ newPin: pin });
    } catch (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    await run(pin);
  }

  const creating = stage === 'create';
  return (
    <Modal
      open={open} onClose={onClose} width={440}
      title={creating ? 'Create your Transaction PIN' : title}
      description={creating ? 'You need a 6-digit PIN to approve payouts, withdrawals and bank changes. Don’t share it with anyone.' : description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {creating
            ? <Button icon="lock" disabled={busy || pin.length < PIN_LENGTH || confirmPin.length < PIN_LENGTH} onClick={createThenRun}>{busy ? 'Saving…' : 'Save PIN & Continue'}</Button>
            : <Button icon="shield-check" disabled={busy || pin.length < PIN_LENGTH} onClick={() => run(pin)}>{busy ? 'Verifying…' : confirmLabel}</Button>}
        </>
      }
    >
      <div className={styles.pinBody}>
        <span className={styles.pinIcon}><Icon name="lock-keyhole" size={22} /></span>
        {creating ? (
          <>
            <CodeInput masked autoFocus label="New PIN" length={PIN_LENGTH} value={pin} onChange={setPin} />
            <CodeInput masked label="Confirm PIN" length={PIN_LENGTH} value={confirmPin} onChange={setConfirmPin} />
          </>
        ) : (
          <CodeInput masked autoFocus length={PIN_LENGTH} value={pin} onChange={setPin} onComplete={(v) => !busy && run(v)} disabled={busy} />
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!creating && <Link className={styles.forgot} to="/company-settings?tab=pin" onClick={onClose}>Forgot PIN?</Link>}
      </div>
    </Modal>
  );
}
