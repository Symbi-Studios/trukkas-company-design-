import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Badge, Banner, Button, ChoiceCard, EmptyState, Icon, Modal, SectionCard, SkeletonRow, Switch, TextField } from '../../ds.js';
import { useGetOnboardingSecurityQuery } from '../../store/features/auth/onboardingApi.js';
import { useChangeSettingsPasswordMutation, useGetSettingsSessionsQuery } from '../../store/features/settings/settingsApi.js';
import { useGetMyProfileAccessQuery } from '../../store/features/profile/profileApi.js';
import { getApiErrorMessage } from '../../store/api/getApiErrorMessage.js';
import { useNavigate } from '../../router.js';
import { formatSecret, maskPhone, otpauthUri, passwordStrength } from '../../domain/security.js';
import { CodeInput, PasswordStrength } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

const unavailableAction = async () => { throw new Error('This security action is not supported by the company API.'); };
const beginTwoFactorSetup = unavailableAction, confirmTwoFactorSetup = unavailableAction, disableTwoFactor = unavailableAction,
  regenerateBackupCodes = unavailableAction, revokeOtherSessions = unavailableAction, revokeSession = unavailableAction,
  sendVerificationCode = unavailableAction, setLoginAlerts = unavailableAction;

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

function TwoFactorSetupModal({ open, onClose, email, phone, onEnabled }) {
  const [method, setMethod] = useState('app');
  const [stage, setStage] = useState('choose');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [codes, setCodes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() { setStage('choose'); setSecret(''); setCode(''); setDemoCode(''); setCodes([]); setError(''); }
  async function next() {
    setError('');
    if (method === 'app') { const r = await beginTwoFactorSetup(); setSecret(r.secret); }
    else { const r = await sendVerificationCode('sms', phone); setDemoCode(r.demoCode); }
    setStage('verify');
  }
  async function verify(value = code) {
    setBusy(true); setError('');
    try {
      const r = await confirmTwoFactorSetup(method, value, phone);
      setCodes(r.backupCodes); setStage('codes');
    } catch (err) { setError(err.message); setCode(''); } finally { setBusy(false); }
  }
  const close = () => { if (stage === 'codes') onEnabled(); reset(); onClose(); };

  return (
    <Modal open={open} onClose={close} width={540} title="Set Up Two-Factor Authentication"
      description={stage === 'codes' ? 'Save these backup codes somewhere safe.' : 'Add a second step when you sign in.'}
      footer={
        stage === 'choose' ? <><Button variant="outline" onClick={close}>Cancel</Button><Button iconRight="arrow-right" onClick={next} disabled={method === 'sms' && !phone}>Continue</Button></>
          : stage === 'verify' ? <><Button variant="outline" onClick={() => setStage('choose')}>Back</Button><Button disabled={busy || code.length < 6} onClick={() => verify()}>{busy ? 'Verifying…' : 'Verify & Enable'}</Button></>
            : <Button onClick={close}>I’ve saved my codes</Button>
      }>
      {stage === 'choose' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <ChoiceCard icon="smartphone" title="Authenticator app (recommended)" description="Google Authenticator, Microsoft Authenticator, 1Password or Authy generate a new code every 30 seconds." selected={method === 'app'} onSelect={() => setMethod('app')} />
          <ChoiceCard icon="message-square" title="Text message (SMS)" description={phone ? `We’ll text a code to ${maskPhone(phone)} each time you sign in.` : 'Add and verify a phone number on your profile first.'} selected={method === 'sms'} onSelect={() => setMethod('sms')} />
        </div>
      )}
      {stage === 'verify' && method === 'app' && (
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
          <a href={otpauthUri(secret, email)} style={{ color: 'var(--tk-blue)', font: '600 13px/18px var(--tk-font-sans)' }}>Open in authenticator app</a>
          <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy} />
        </div>
      )}
      {stage === 'verify' && method === 'sms' && (
        <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
          <span className="tk-meta">Enter the code sent to {maskPhone(phone)}.</span>
          {demoCode && <Badge tone="info">Demo code: {demoCode}</Badge>}
          <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy} />
        </div>
      )}
      {stage === 'codes' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Banner tone="success" title="Two-factor authentication is on">Use a backup code if you lose access to your {method === 'app' ? 'authenticator app' : 'phone'}. Each code works once.</Banner>
          <BackupCodes codes={codes} email={email} />
        </div>
      )}
    </Modal>
  );
}

function TwoFactorCard({ security, email, phone, onToast }) {
  const tf = security.twoFactor;
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const remaining = tf.backupCodes?.filter((c) => !c.used).length ?? '—';

  return (
    <SectionCard title="Two-Factor Authentication (2FA)" description="Require a one-time code in addition to your password."
      action={<Badge tone={tf.enabled ? 'success' : 'warning'} dot>{tf.enabled === null ? '—' : tf.enabled ? 'On' : 'Off'}</Badge>}>
      {tf.enabled ? (
        <div>
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="green"><Icon name={tf.method === 'app' ? 'smartphone' : 'message-square'} size={18} /></span>
            <span className={styles.rowMain}><strong>{tf.method === 'app' ? 'Authenticator app' : `SMS to ${maskPhone(tf.phone)}`}</strong><small>Enabled {tf.enabledOn}</small></span>
            <Button variant="danger" size="sm" disabled onClick={() => { setPassword(''); setError(''); setDisableOpen(true); }}>Turn Off</Button>
          </div>
          <div className={styles.row}>
            <span className={styles.iconTile} data-tone="neutral"><Icon name="life-buoy" size={18} /></span>
            <span className={styles.rowMain}><strong>Backup codes</strong><small>{remaining} of {tf.backupCodes?.length ?? '—'} unused</small></span>
            <Button variant="outline" size="sm" disabled onClick={() => setCodesOpen(true)}>View</Button>
            <Button variant="outline" size="sm" icon="refresh-cw" disabled onClick={async () => { await regenerateBackupCodes(); setCodesOpen(true); onToast('New backup codes generated. Old codes no longer work.'); }}>Regenerate</Button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <span className={styles.iconTile} data-tone="amber"><Icon name="shield-alert" size={18} /></span>
          <span className={styles.rowMain}><strong>Protect your account</strong><small>Your account controls payouts and company data. 2FA stops someone with your password from signing in.</small></span>
          <Button icon="shield-check" disabled onClick={() => setSetupOpen(true)}>Enable 2FA</Button>
        </div>
      )}
      <TwoFactorSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} email={email} phone={phone} onEnabled={() => onToast('Two-factor authentication enabled.')} />
      <Modal open={disableOpen} onClose={() => setDisableOpen(false)} width={420} title="Turn off 2FA?" description="Confirm with your password. Your account will be less secure."
        footer={<><Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => { try { await disableTwoFactor(password, email); setDisableOpen(false); onToast('Two-factor authentication turned off.'); } catch (err) { setError(err.message); } }}>Turn Off 2FA</Button></>}>
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
      </Modal>
      <Modal open={codesOpen} onClose={() => setCodesOpen(false)} width={460} title="Backup Codes" description="Each code can be used once if you can’t access your second factor." footer={<Button onClick={() => setCodesOpen(false)}>Done</Button>}>
        <BackupCodes codes={tf.backupCodes ?? []} email={email} />
      </Modal>
    </SectionCard>
  );
}

export function SecuritySettings({ onToast }) {
  const account = useSelector((state) => state.auth.account);
  const { currentData: data, error, isLoading } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: sessions, error: sessionsError, isLoading: sessionsLoading } = useGetSettingsSessionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: access, error: accessError } = useGetMyProfileAccessQuery();
  const security = { passwordUpdatedOn: !error ? data?.passwordUpdatedOn ?? '—' : '—', twoFactor: { enabled: !error ? data?.twoFactor?.enabled ?? null : null, method: !error ? data?.twoFactor?.method ?? '—' : '—', backupCodes: null, enabledOn: '—' }, loginAlerts: null, sessions: !sessionsError ? sessions ?? [] : [] };
  const others = security.sessions.filter((s) => s.current === false);

  return (
    <>
      {isLoading ? <SkeletonRow columns={2} /> : error && <EmptyState icon="shield-check" title={getApiErrorMessage(error)} />}
      <PasswordCard email={account?.email} updatedOn={security.passwordUpdatedOn} canEdit={!accessError && access?.canEdit === true} onToast={onToast} />
      <TwoFactorCard security={security} email={account?.email} phone={account?.phoneVerified ? account.phone : null} onToast={onToast} />
      <SectionCard title="Sign-in Alerts">
        <Switch label="Email me about new sign-ins" hint="Get an alert when your account is used from a new device or location." checked={security.loginAlerts} disabled onChange={async (v) => { await setLoginAlerts(v); onToast(v ? 'Sign-in alerts on.' : 'Sign-in alerts off.'); }} />
      </SectionCard>
      <SectionCard title="Active Sessions" description="Devices currently signed in to your account."
        action={others.length > 0 && <Button variant="outline" icon="log-out" disabled onClick={async () => { await revokeOtherSessions(); onToast('Signed out of all other devices.'); }}>Sign Out Others</Button>}>
        {sessionsLoading ? <SkeletonRow columns={2} /> : sessionsError ? <EmptyState icon="monitor" title={getApiErrorMessage(sessionsError)} /> : sessions == null && <span className="tk-meta">—</span>}
        {security.sessions.map((s) => (
          <div key={s.id} className={styles.row}>
            <span className={styles.iconTile} data-tone="neutral"><Icon name={/iphone|ios|android/i.test(s.device) ? 'smartphone' : 'monitor'} size={18} /></span>
            <span className={styles.rowMain}><strong>{s.device}{s.current && <Badge tone="success" style={{ marginLeft: 8 }}>This device</Badge>}</strong><small>{s.location} · {s.ip} · {s.lastActive}</small></span>
            {!s.current && <Button size="sm" variant="outline" disabled onClick={async () => { await revokeSession(s.id); onToast('Session signed out.'); }}>Sign Out</Button>}
          </div>
        ))}
      </SectionCard>
    </>
  );
}
