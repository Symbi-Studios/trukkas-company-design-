import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Badge, Banner, Button, ChoiceCard, EmptyState, Icon, Modal, SectionCard, SkeletonRow, Switch, TextField } from '../../ds.js';
import { useGetOnboardingSecurityQuery } from '../../store/features/auth/onboardingApi.js';
import {
  useChangeSettingsPasswordMutation, useGetSettingsSessionsQuery, useSetupSettingsTwoFactorMutation,
  useEnableSettingsTwoFactorMutation, useDisableSettingsTwoFactorMutation, useRegenerateSettingsBackupCodesMutation,
  useUpdateSettingsSignInAlertsMutation, useRevokeSettingsSessionMutation, useGetSettingsNotificationsQuery,
} from '../../store/features/settings/settingsApi.js';
import { useGetMyProfileAccessQuery } from '../../store/features/profile/profileApi.js';
import { getApiErrorMessage } from '../../store/api/getApiErrorMessage.js';
import { useNavigate } from '../../router.js';
import { formatSecret, maskPhone, passwordStrength } from '../../domain/security.js';
import { CodeInput, PasswordStrength } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupCodes({ codes, email }) {
  const list = codes.map((c) => (typeof c === 'string' ? { code: c, used: false } : c));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className={styles.codes}>{list.map((c) => <span key={c.code} className={c.used ? styles.used : ''}>{c.code}</span>)}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" variant="outline" icon="copy" onClick={() => navigator.clipboard?.writeText(list.map((c) => c.code).join('\n'))}>Copy</Button>
        <Button size="sm" variant="outline" icon="download" onClick={() => downloadText('trukkas-backup-codes.txt', `Trukkas backup codes for ${email}\nEach code works once.\n\n${list.map((c) => c.code).join('\n')}\n`)}>Download</Button>
      </div>
    </div>
  );
}

function PasswordCard({ email, updatedOn, onToast, canEdit }) {
  const navigate = useNavigate();
  const [changePassword] = useChangeSettingsPasswordMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy || !canEdit) return;
    setError('');
    if (form.next.length < 8 || passwordStrength(form.next).score < 3) { setError('Choose a stronger password.'); return; }
    if (form.next !== form.confirm) { setError('The new passwords don’t match.'); return; }
    setBusy(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next, confirmPassword: form.confirm }).unwrap();
      setOpen(false); setForm({ current: '', next: '', confirm: '' });
      onToast('Password updated. Other devices were signed out.');
      navigate('/login?reset=1', { replace: true });
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  }
  return (
    <SectionCard title="Password" description={`Last changed ${updatedOn}.`}
      action={!open && <Button variant="outline" icon="key-round" disabled={!canEdit} onClick={() => setOpen(true)}>Update Password</Button>}>
      {open ? (
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.full}><TextField label="Current Password" type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></div>
          <TextField label="New Password" type="password" autoComplete="new-password" required value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          <TextField label="Confirm New Password" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          <div className={styles.full}><PasswordStrength password={form.next} /></div>
          {error && <p className={`${styles.error} ${styles.full}`}>{error}</p>}
          <div className={styles.formActions}>
            <Button variant="outline" onClick={() => { setOpen(false); setError(''); }}>Cancel</Button>
            <Button type="submit" disabled={!canEdit || busy || !form.current || form.next.length < 8 || form.next !== form.confirm}>{busy ? 'Updating…' : 'Update Password'}</Button>
          </div>
        </form>
      ) : <span className="tk-meta">Use a strong password you don’t use anywhere else. Changing it signs out your other devices.</span>}
    </SectionCard>
  );
}

function TwoFactorSetupModal({ open, onClose, email, onEnabled, canEdit }) {
  const [stage, setStage] = useState('choose');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setupPending = useRef(false);
  const [beginSetup, { reset: resetSetup }] = useSetupSettingsTwoFactorMutation();
  const [enableTwoFactor, { reset: resetEnable }] = useEnableSettingsTwoFactorMutation();

  function reset() {
    setStage('choose'); setSecret(''); setOtpauthUrl(''); setCode(''); setCodes([]); setError('');
    resetSetup(); resetEnable();
  }
  async function next() {
    if (setupPending.current || !canEdit) return;
    setupPending.current = true;
    setBusy(true); setError('');
    try {
      const result = await beginSetup().unwrap();
      setSecret(result.secret); setOtpauthUrl(result.otpauthUrl); setStage('verify');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { resetSetup(); setupPending.current = false; setBusy(false); }
  }
  async function verify(value = code) {
    if (setupPending.current || !canEdit || !/^\d{6}$/.test(value)) return;
    setupPending.current = true;
    setBusy(true); setError('');
    try {
      const result = await enableTwoFactor({ code: value }).unwrap();
      setCodes(result.backupCodes); setStage('codes');
    } catch (err) { setError(getApiErrorMessage(err)); setCode(''); }
    finally { resetEnable(); setupPending.current = false; setBusy(false); }
  }
  const close = () => { if (setupPending.current) return; if (stage === 'codes') onEnabled(); reset(); onClose(); };

  return (
    <Modal open={open} onClose={close} width={540} title="Set Up Two-Factor Authentication"
      description={stage === 'codes' ? 'Save these backup codes somewhere safe.' : 'Add a second step when you sign in.'}
      footer={
        stage === 'choose' ? <><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button iconRight="arrow-right" onClick={next} disabled={!canEdit || busy}>Continue</Button></>
          : stage === 'verify' ? <><Button variant="outline" onClick={() => setStage('choose')} disabled={busy}>Back</Button><Button disabled={busy || code.length !== 6} onClick={() => verify()}>{busy ? 'Verifying…' : 'Verify & Enable'}</Button></>
            : <Button onClick={close}>I’ve saved my codes</Button>
      }>
      {stage === 'choose' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <ChoiceCard icon="smartphone" title="Authenticator app (recommended)" description="Google Authenticator, Microsoft Authenticator, 1Password or Authy generate a new code every 30 seconds." selected onSelect={() => {}} disabled={!canEdit} />
          <ChoiceCard icon="message-square" title="Text message (SMS)" description="SMS-based two-factor authentication is not supported for company accounts." disabled />
        </div>
      )}
      {stage === 'verify' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <ol className={styles.steps}>
            <li>Open your authenticator app and choose <strong>Add account → Enter a setup key</strong>.</li>
            <li>Enter the key below (time-based). On a phone you can tap “Open in authenticator”.</li>
            <li>Type the 6-digit code the app shows.</li>
          </ol>
          <div className={styles.secretBox}>
            <span>{formatSecret(secret)}</span>
            <Button size="sm" variant="outline" icon="copy" onClick={() => navigator.clipboard?.writeText(secret)}>Copy</Button>
          </div>
          <a href={otpauthUrl} style={{ color: 'var(--tk-blue)', font: '600 13px/18px var(--tk-font-sans)' }}>Open in authenticator app</a>
          <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy} />
        </div>
      )}
      {stage === 'codes' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Banner tone="success" title="Two-factor authentication is on">Use a backup code if you lose access to your authenticator app. Each code works once.</Banner>
          <BackupCodes codes={codes} email={email} />
        </div>
      )}
      {error && stage !== 'verify' && <p className={styles.error}>{error}</p>}
    </Modal>
  );
}

function TwoFactorCard({ security, email, canEdit, onToast }) {
  const tf = security.twoFactor;
  const [setupOpen, setSetupOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofAction, setProofAction] = useState('disable');
  const [codesOpen, setCodesOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [proof, setProof] = useState('');
  const [newCodes, setNewCodes] = useState([]);
  const [error, setError] = useState('');
  const proofPending = useRef(false);
  const [disableTwoFactor, { isLoading: disabling }] = useDisableSettingsTwoFactorMutation();
  const [regenerateCodes, { isLoading: regenerating, reset: resetRegenerate }] = useRegenerateSettingsBackupCodesMutation();
  const remaining = tf.backupCodesRemaining ?? '—';
  const busy = disabling || regenerating;
  const validProof = /^\d{6}$/.test(proof) || /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(proof.trim());

  function openProof(action) {
    setProofAction(action); setPassword(''); setProof(''); setError(''); setProofOpen(true);
  }
  function closeProof() {
    setProofOpen(false); setPassword(''); setProof(''); setError(''); resetRegenerate();
  }
  async function confirmProof() {
    if (proofPending.current || !canEdit || !password || !validProof) return;
    proofPending.current = true;
    setError('');
    const values = /^\d{6}$/.test(proof) ? { code: proof } : { backupCode: proof.trim().toUpperCase() };
    try {
      if (proofAction === 'disable') {
        await disableTwoFactor({ currentPassword: password, ...values }).unwrap();
        closeProof(); onToast('Two-factor authentication turned off.');
      } else {
        const result = await regenerateCodes({ currentPassword: password, ...values }).unwrap();
        setNewCodes(result.backupCodes); setCodesOpen(true); closeProof();
        onToast('New backup codes generated. Old codes no longer work.');
      }
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { proofPending.current = false; }
  }
  function closeCodes() { setCodesOpen(false); setNewCodes([]); }

  return (
    <SectionCard title="Two-Factor Authentication (2FA)" description="Require a one-time code in addition to your password."
      action={<Badge tone={tf.enabled === true ? 'success' : 'warning'} dot>{tf.enabled === null ? '—' : tf.enabled ? 'On' : 'Off'}</Badge>}>
      {tf.enabled === true ? (
        <div>
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="green"><Icon name={tf.method === 'app' ? 'smartphone' : 'message-square'} size={18} /></span>
            <span className={styles.rowMain}><strong>{tf.method === 'app' ? 'Authenticator app' : '—'}</strong><small>Enabled {tf.enabledOn}</small></span>
            <Button variant="danger" size="sm" disabled={!canEdit || tf.available !== true} onClick={() => openProof('disable')}>Turn Off</Button>
          </div>
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="neutral"><Icon name="life-buoy" size={18} /></span>
            <span className={styles.rowMain}><strong>Backup codes</strong><small>{remaining} remaining</small></span>
            <Button variant="outline" size="sm" disabled>View</Button>
            <Button variant="outline" size="sm" icon="refresh-cw" disabled={!canEdit || tf.available !== true} onClick={() => openProof('regenerate')}>Regenerate</Button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <span className={styles.iconTile} data-tone="amber"><Icon name="shield-alert" size={18} /></span>
          <span className={styles.rowMain}><strong>Protect your account</strong><small>Your account controls payouts and company data. 2FA stops someone with your password from signing in.</small></span>
          <Button icon="shield-check" disabled={!canEdit || tf.available !== true || tf.enabled !== false} onClick={() => setSetupOpen(true)}>Enable 2FA</Button>
        </div>
      )}
      <TwoFactorSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} email={email} canEdit={canEdit} onEnabled={() => onToast('Two-factor authentication enabled.')} />
      <Modal open={proofOpen} onClose={() => { if (!proofPending.current) closeProof(); }} width={420}
        title={proofAction === 'disable' ? 'Turn off 2FA?' : 'Regenerate backup codes'}
        description={proofAction === 'disable' ? 'Confirm with your password and an authenticator or backup code.' : 'Confirm with your password and an authenticator or backup code. Old backup codes will stop working.'}
        footer={<><Button variant="outline" disabled={busy} onClick={closeProof}>Cancel</Button><Button variant={proofAction === 'disable' ? 'danger' : 'primary'} disabled={!canEdit || busy || !password || !validProof} onClick={confirmProof}>{busy ? 'Saving…' : proofAction === 'disable' ? 'Turn Off 2FA' : 'Regenerate Codes'}</Button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <TextField label="6-digit code or backup code" autoComplete="off" value={proof} onChange={(event) => setProof(event.target.value.toUpperCase())} error={error || undefined} />
        </div>
      </Modal>
      <Modal open={codesOpen} onClose={closeCodes} width={460} title="Backup Codes" description="Each code can be used once if you can’t access your second factor." footer={<Button onClick={closeCodes}>Done</Button>}>
        <BackupCodes codes={newCodes} email={email} />
      </Modal>
    </SectionCard>
  );
}

export function SecuritySettings({ onToast }) {
  const account = useSelector((state) => state.auth.account);
  const { currentData: data, error, isLoading } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: preferences, error: preferencesError } = useGetSettingsNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: sessions, error: sessionsError, isLoading: sessionsLoading } = useGetSettingsSessionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: access, error: accessError } = useGetMyProfileAccessQuery();
  const [updateSignInAlerts, { isLoading: updatingAlerts }] = useUpdateSettingsSignInAlertsMutation();
  const [revokeSession, { isLoading: revokingSession }] = useRevokeSettingsSessionMutation();
  const alertsPending = useRef(false);
  const sessionPending = useRef(false);
  const canEdit = !accessError && access?.canEdit === true;
  const security = {
    passwordUpdatedOn: !error ? data?.passwordUpdatedOn ?? '—' : '—',
    twoFactor: {
      available: !error ? data?.twoFactor?.available ?? null : null,
      enabled: !error ? data?.twoFactor?.enabled ?? null : null,
      method: !error ? data?.twoFactor?.method ?? null : null,
      backupCodesRemaining: !error ? data?.twoFactor?.backupCodesRemaining ?? null : null,
      enabledOn: !error ? data?.twoFactor?.enabledOn ?? '—' : '—',
    },
    loginAlerts: !preferencesError ? preferences?.loginAlerts ?? null : null,
    sessions: !sessionsError ? sessions ?? [] : [],
  };
  const others = security.sessions.filter((s) => s.current === false);
  async function changeSignInAlerts(enabled) {
    if (alertsPending.current || !canEdit || security.loginAlerts === null) return;
    alertsPending.current = true;
    try { await updateSignInAlerts({ enabled }).unwrap(); onToast(enabled ? 'Sign-in alerts on.' : 'Sign-in alerts off.'); }
    catch (err) { onToast(getApiErrorMessage(err)); }
    finally { alertsPending.current = false; }
  }
  async function endSession(id) {
    if (sessionPending.current || !canEdit || !security.sessions.some((session) => session.id === id && session.current === false)) return;
    sessionPending.current = true;
    try { await revokeSession({ id }).unwrap(); onToast('Session signed out.'); }
    catch (err) { onToast(getApiErrorMessage(err)); }
    finally { sessionPending.current = false; }
  }

  if (isLoading) return <>
    <SectionCard title="Password"><SkeletonRow variant="security" /></SectionCard>
    <SectionCard title="Two-Factor Authentication (2FA)" description="Require a one-time code in addition to your password."><SkeletonRow variant="security" /></SectionCard>
    <SectionCard title="Sign-in Alerts"><SkeletonRow variant="preferences" rows={1} action={false} /></SectionCard>
    <SectionCard title="Active Sessions" description="Devices currently signed in to your account."><SkeletonRow variant="list" rows={1} /></SectionCard>
  </>;

  return (
    <>
      {(error || preferencesError) && <EmptyState icon="shield-check" title={getApiErrorMessage(error || preferencesError)} />}
      <PasswordCard email={account?.email} updatedOn={security.passwordUpdatedOn} canEdit={!accessError && access?.canEdit === true} onToast={onToast} />
      <TwoFactorCard security={security} email={account?.email} canEdit={canEdit && access?.isOwner === true} onToast={onToast} />
      <SectionCard title="Sign-in Alerts">
        <Switch label="Email me about new sign-ins" hint="Get an alert when your account is used from a new device or location." checked={security.loginAlerts} disabled={!canEdit || updatingAlerts || security.loginAlerts === null} onChange={changeSignInAlerts} />
      </SectionCard>
      <SectionCard title="Active Sessions" description="Devices currently signed in to your account."
        action={others.length > 0 && <Button variant="outline" icon="log-out" disabled>Sign Out Others</Button>}>
        {sessionsLoading ? <SkeletonRow variant="list" rows={1} /> : sessionsError ? <EmptyState icon="monitor" title={getApiErrorMessage(sessionsError)} /> : sessions == null && <span className="tk-meta">—</span>}
        {!sessionsLoading && security.sessions.map((s) => (
          <div key={s.id} className={styles.row}>
            <span className={styles.iconTile} data-tone="neutral"><Icon name={/iphone|ios|android/i.test(s.device) ? 'smartphone' : 'monitor'} size={18} /></span>
            <span className={styles.rowMain}><strong>{s.device}{s.current && <Badge tone="success" style={{ marginLeft: 8 }}>This device</Badge>}</strong><small>{s.location} · {s.ip} · {s.lastActive}</small></span>
            {!s.current && <Button size="sm" variant="outline" disabled={!canEdit || revokingSession || s.current !== false} onClick={() => endSession(s.id)}>Sign Out</Button>}
          </div>
        ))}
      </SectionCard>
    </>
  );
}
