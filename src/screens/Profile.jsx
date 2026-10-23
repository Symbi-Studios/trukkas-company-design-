'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader, SectionCard, Select, SkeletonRow, Textarea, TextField } from '../ds.js';
import {
  EMPTY_PROFILE, isProfileContactValid, useGetMyProfileQuery, useGetMyProfileAccessQuery, useGetMyProfileLoginHistoryQuery,
  useUpdateMyProfileMutation, useUploadMyProfilePhotoMutation,
  useRemoveMyProfilePhotoMutation, useRequestProfileContactChangeMutation, useVerifyProfileContactChangeMutation,
  useRequestProfileEmailVerificationMutation, useVerifyProfileEmailMutation,
  useRequestProfilePhoneVerificationMutation, useVerifyProfilePhoneMutation,
} from '../store/features/profile/profileApi.js';
import { useGetOnboardingSecurityQuery } from '../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { PERMISSION_GROUPS } from '../domain/access.js';
import { CodeInput } from '../components/SecurityInputs.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './settings/Settings.module.css';

const TIMEZONES = ['Africa/Lagos (WAT, UTC+1)', 'Africa/Accra (GMT, UTC+0)', 'Africa/Nairobi (EAT, UTC+3)', 'Europe/London (UTC+0/+1)'];

/** Contact modal, also opened from the dashboard to verify existing contacts. */
function ChangeContactModal({ channel, open, onClose, onDone, verifyCurrent = false, currentValue = '' }) {
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [verifyingSavedPhone, setVerifyingSavedPhone] = useState(false);
  const currentVerification = verifyCurrent || verifyingSavedPhone;
  const [requestChange, { isLoading: sendingChange }] = useRequestProfileContactChangeMutation();
  const [verifyChange, { isLoading: verifyingChange }] = useVerifyProfileContactChangeMutation();
  const [requestEmailVerification, { isLoading: sendingEmail }] = useRequestProfileEmailVerificationMutation();
  const [verifyEmail, { isLoading: verifyingEmail }] = useVerifyProfileEmailMutation();
  const [requestPhoneVerification, { isLoading: sendingPhone }] = useRequestProfilePhoneVerificationMutation();
  const [verifyPhone, { isLoading: verifyingPhone }] = useVerifyProfilePhoneMutation();
  const sending = sendingChange || sendingEmail || sendingPhone;
  const verifying = verifyingChange || verifyingEmail || verifyingPhone;
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const submitting = useRef(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [resendAt, setResendAt] = useState(null);
  const timedCode = currentVerification || channel === 'email' || resendAt !== null;
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { if (open) { setValue(verifyCurrent ? currentValue : ''); setCode(''); setSent(false); setError(''); setExpiresAt(null); setResendAt(null); setRemainingAttempts(null); setVerifyingSavedPhone(false); } }, [open, channel, verifyCurrent, currentValue]);
  useEffect(() => {
    if (!open || !timedCode) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open, timedCode]);
  const resendLeft = resendAt ? Math.max(0, Math.ceil((resendAt - clock) / 1000)) : null;
  useEffect(() => {
    if (!open || !timedCode || !sent || !expiresAt) return;
    const timer = setTimeout(() => { setSent(false); setCode(''); setError('This code has expired. Send a new code.'); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [open, timedCode, sent, expiresAt]);
  const isEmail = channel === 'email';
  const validContact = isProfileContactValid(channel, value);

  async function send() {
    if (submitting.current) return;
    setError('');
    if (timedCode && resendAt > Date.now()) return;
    if (!validContact) { setError(isEmail ? 'Enter a valid email.' : 'Enter a valid phone number.'); return; }
    submitting.current = true;
    try {
      const samePhone = !isEmail && value.replace(/\D/g, '') === currentValue.replace(/\D/g, '');
      if (currentVerification || samePhone) {
        const receipt = await (isEmail ? requestEmailVerification() : requestPhoneVerification()).unwrap();
        if (receipt.verified) { onDone(true); return; }
        if (samePhone) setVerifyingSavedPhone(true);
        setRemainingAttempts(receipt.remainingAttempts ?? null);
        setExpiresAt(receipt.expiresAt);
        setResendAt(receipt.resendAt);
      } else {
        const receipt = await requestChange({ channel, value }).unwrap();
        if (isEmail) { setRemainingAttempts(receipt.remainingAttempts); setExpiresAt(receipt.expiresAt); setResendAt(receipt.resendAt); }
      }
      setClock(Date.now()); setSent(true); setCode('');
    } catch (err) { setError(getApiErrorMessage(err)); if (err.retryAt) { setResendAt(err.retryAt); setClock(Date.now()); } }
    finally { submitting.current = false; }
  }
  async function confirm(c = code) {
    if (submitting.current || !sent || remainingAttempts === 0 || !/^\d{6}$/.test(c)) return;
    if (timedCode && expiresAt !== null && Date.now() >= expiresAt) { setSent(false); setCode(''); setError('This code has expired. Send a new code.'); return; }
    setError('');
    submitting.current = true;
    try {
      if (currentVerification) await (isEmail ? verifyEmail({ code: c }) : verifyPhone({ code: c })).unwrap();
      else await verifyChange({ channel, value, code: c }).unwrap();
      onDone(currentVerification);
    }
    catch (err) {
      const attempts = Number.isSafeInteger(err.remainingAttempts) && err.remainingAttempts >= 0 ? err.remainingAttempts : null;
      setError(attempts === null ? getApiErrorMessage(err) : `${getApiErrorMessage(err)} ${attempts} verification attempt(s) remaining.`);
      setCode('');
      if (attempts !== null) { setRemainingAttempts(attempts); if (attempts === 0) setSent(false); }
    }
    finally { submitting.current = false; }
  }

  return (
    <Modal open={open} onClose={() => { if (!sending && !verifying) onClose(); }} width={440} title={currentVerification ? isEmail ? 'Verify Email Address' : 'Verify Phone Number' : isEmail ? 'Change Email Address' : 'Change Phone Number'}
      description={currentVerification ? isEmail ? 'Confirm the email address on your account.' : 'Confirm the phone number on your account.' : isEmail ? 'We’ll send a code to your new email to confirm it.' : 'We’ll text a code to your new number to confirm it.'}
      footer={<><Button variant="outline" disabled={sending || verifying} onClick={onClose}>Cancel</Button>{sent ? <>
          {timedCode && <Button variant="ghost" disabled={sending || verifying || resendLeft === null || resendLeft > 0} onClick={send}>{resendLeft === null ? '—' : resendLeft > 0 ? 'Resend in ' + resendLeft + 's' : 'Resend code'}</Button>}
          <Button disabled={!/^\d{6}$/.test(code) || verifying || sending || remainingAttempts === 0} onClick={() => confirm()}>Confirm</Button>
        </> : <Button disabled={sending || !validContact || (timedCode && resendAt > Date.now())} onClick={send}>Send Code</Button>}</>}>
      <div style={{ display: 'grid', gap: 14, justifyItems: 'stretch' }}>
        <TextField label={currentVerification ? isEmail ? 'Email Address' : 'Phone Number' : isEmail ? 'New Email' : 'New Phone Number'} type={isEmail ? 'email' : 'tel'} value={value} disabled={currentVerification || sent || sending} onChange={(e) => setValue(e.target.value)} placeholder={isEmail ? 'you@company.com' : '+234 800 000 0000'} />
        {sent && (
          <>
            <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => confirm(v)} disabled={sending || verifying} />
          </>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
}

export function Profile() {
  return <Suspense fallback={null}><ProfileContent /></Suspense>;
}

function ProfileContent() {
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const requestedVerification = searchParams.get('verify');
  const account = useSelector((state) => state.auth.account);
  const { data: profileData, error, isLoading } = useGetMyProfileQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { data: securityData, error: securityError } = useGetOnboardingSecurityQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { data: accessData, error: accessError } = useGetMyProfileAccessQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const data = error ? undefined : profileData;
  const security = securityError ? undefined : securityData;
  const access = accessError ? undefined : accessData;
  const { currentData: loginHistory, error: historyError, isFetching: historyLoading } = useGetMyProfileLoginHistoryQuery(data?.timezoneId ?? null, {
    skip: !account || isLoading, refetchOnMountOrArgChange: true,
  });
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [uploadPhoto, { isLoading: uploading }] = useUploadMyProfilePhotoMutation();
  const [removePhoto, { isLoading: removing }] = useRemoveMyProfilePhotoMutation();
  const profile = data ?? EMPTY_PROFILE;
  const verificationChannel = requestedVerification === 'phone' ? 'phone'
    : requestedVerification === 'email' ? 'email'
    : requestedVerification === 'contact' ? profile.emailVerified === false ? 'email' : profile.phoneVerified === false ? 'phone' : null : null;
  const canEdit = access?.canEdit === true;
  const busy = saving || uploading || removing;
  const [draft, setDraft] = useState(null);
  const [contact, setContact] = useState(null);
  const [toast, showToast] = useToast();
  const fileInput = useRef(null);

  function closeContact() {
    setContact(null);
    if (requestedVerification) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('verify');
      const query = params.toString();
      navigate(`/profile${query ? `?${query}` : ''}`, { replace: true });
    }
  }

  if (!account) return null;
  const form = { ...profile, ...draft };
  const set = (key) => (e) => {
    const value = e.target.value;
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  async function persist(changes, message) {
    if (busy) return;
    const changed = Object.fromEntries(Object.entries(changes).filter(([key, value]) => value !== profile[key]));
    if (!Object.keys(changed).length) { setDraft(null); return; }
    try {
      await updateProfile(changed).unwrap();
      setDraft(null);
      showToast(message);
    } catch (err) { showToast(getApiErrorMessage(err)); }
  }

  async function savePhoto(file) {
    if (busy) return;
    try { await uploadPhoto(file).unwrap(); showToast('Profile photo updated.'); }
    catch (err) { showToast(getApiErrorMessage(err)); }
  }

  async function deletePhoto() {
    if (busy) return;
    try { await removePhoto().unwrap(); showToast('Profile photo removed.'); }
    catch (err) { showToast(getApiErrorMessage(err)); }
  }

  if (isLoading) return (
    <div className={styles.page}>
      <PageHeader title="My Profile" description="Your personal details, sign-in security and access on this company account." />
      <SkeletonRow variant="detail" />
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="My Profile" description={error || accessError || securityError ? getApiErrorMessage(error || accessError || securityError) : 'Your personal details, sign-in security and access on this company account.'} />

      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Avatar name={profile.name} src={profile.photoUrl || undefined} size={80} tone="var(--tk-navy)" />
        <span style={{ flex: 1, minWidth: 220, display: 'grid', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ font: '700 22px/28px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{profile.name}</strong>
            <Badge tone="purple">{access?.roleName ?? '—'}</Badge>
          </span>
          <span className="tk-meta">{[profile.title, profile.companyName].join(' · ')}</span>
          <span className="tk-meta">Member since {profile.joined}</span>
        </span>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { showToast('Photos must be under 5 MB.'); return; }
          savePhoto(file);
        }} />
        <Button variant="outline" icon="camera" disabled={busy || !data || !canEdit} onClick={() => fileInput.current?.click()}>{profile.photoUrl ? 'Change Photo' : 'Upload Photo'}</Button>
        {profile.photoUrl && <Button variant="ghost" disabled={busy || !canEdit} onClick={deletePhoto}>Remove</Button>}
      </Card>

      <div className={styles.shell} style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
        <div className={styles.content}>
          <SectionCard title="Personal Details">
            <div className={styles.form} style={{ maxWidth: 'none' }}>
              <TextField label="Full Name" value={form.name} onChange={set('name')} />
              <TextField label="Job Title" value={form.title} onChange={set('title')} placeholder="e.g. Managing Director" />
              <div>
                <TextField label="Email Address" value={profile.email} disabled suffix={profile.emailVerified === null ? '—' : profile.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>} />
                <button type="button" disabled={busy || !data || !canEdit} className={styles.hint} style={{ border: 0, background: 'none', padding: 0, marginTop: 6, color: 'var(--tk-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setContact('email')}>Change email</button>
              </div>
              <div>
                <TextField label="Phone Number" value={profile.phone} disabled suffix={profile.phoneVerified === null ? '—' : profile.phoneVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>} />
                <button type="button" disabled={busy || !data || !canEdit} className={styles.hint} style={{ border: 0, background: 'none', padding: 0, marginTop: 6, color: 'var(--tk-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setContact('phone')}>Change phone</button>
              </div>
              <div className={styles.full}><Textarea label="Short Bio (optional)" rows={2} maxLength={200} value={form.bio || ''} onChange={set('bio')} /></div>
              <Select label="Language" value={form.language} placeholder={form.language} options={['English', 'Pidgin (coming soon)', 'Hausa (coming soon)', 'Yoruba (coming soon)', 'Igbo (coming soon)'].map((v) => ({ value: v, label: v }))} onChange={set('language')} />
              <Select label="Time Zone" value={form.timezone} placeholder={form.timezone} options={TIMEZONES} onChange={set('timezone')} />
              <div className={styles.formActions}>
                <Button disabled={!draft || !form.name.trim() || busy || !data || !canEdit} onClick={() => persist({ name: form.name.trim(), title: form.title, bio: form.bio, language: form.language, timezone: form.timezone }, 'Profile saved.')}>Save Changes</Button>
                {draft && <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent Sign-in Activity" pad="none">
            {historyLoading ? <SkeletonRow columns={4} /> : historyError ? <EmptyState icon="clock" title={getApiErrorMessage(historyError)} /> : <DataTable rows={loginHistory ?? []} rowKey={(r, i) => r.id ?? r.time + i} columns={[
              { key: 'time', header: 'When', render: (r) => r.time },
              { key: 'device', header: 'Device', render: (r) => r.device },
              { key: 'location', header: 'Location', render: (r) => r.location },
              { key: 'result', header: 'Result', render: (r) => <Badge tone={r.result === 'Success' ? 'success' : r.result === 'Failed' ? 'danger' : 'neutral'}>{r.result}</Badge> },
            ]} />}
          </SectionCard>
        </div>

        <aside className={styles.content}>
          <SectionCard title="Account Security">
            {[
              { icon: 'key-round', label: 'Password', value: security?.passwordUpdatedOn && security.passwordUpdatedOn !== '—' ? `Changed ${security.passwordUpdatedOn}` : '—', ok: security?.passwordUpdatedOn && security.passwordUpdatedOn !== '—', tab: 'security' },
              { icon: 'shield-check', label: 'Two-factor authentication', value: security?.twoFactor?.enabled === true ? `On · ${security.twoFactor.method ?? '—'}` : security?.twoFactor?.enabled === false ? 'Off' : '—', ok: security?.twoFactor?.enabled, disabled: security?.twoFactor?.available === false, tab: 'security' },
              { icon: 'lock-keyhole', label: 'Transaction PIN', value: security?.pin?.set === true ? `Set · ${security.pin.updatedOn ?? '—'}` : security?.pin?.set === false ? 'Not set' : '—', ok: security?.pin?.set, tab: 'pin' },
            ].map((item) => (
              <button key={item.label} type="button" disabled={item.disabled} className={styles.row} onClick={() => navigate(`/company-settings?tab=${item.tab}`)}
                style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--tk-line)', cursor: 'pointer', textAlign: 'left' }}>
                <span className={styles.iconTile} data-tone={item.ok ? 'green' : 'amber'}><Icon name={item.icon} size={18} /></span>
                <span className={styles.rowMain}><strong>{item.label}</strong><small>{item.value}</small></span>
                <Icon name="chevron-right" size={16} color="var(--tk-ink-300)" />
              </button>
            ))}
          </SectionCard>
          <SectionCard title="Your Access" description={access?.roleDescription ?? '—'}>
            {PERMISSION_GROUPS.map((g) => {
              const group = access?.groups[g.group];
              return (
                <div key={g.group} className={styles.row}>
                  <span className={styles.iconTile} data-tone={group?.granted ? 'green' : 'neutral'}><Icon name={g.icon} size={16} /></span>
                  <span className={styles.rowMain}><strong>{g.group}</strong><small>{group?.value ?? '—'}</small></span>
                </div>
              );
            })}
          </SectionCard>
        </aside>
      </div>

      <ChangeContactModal key={contact ?? verificationChannel ?? 'closed'} channel={contact ?? verificationChannel} open={!!contact || (!!verificationChannel && !!data)} onClose={closeContact}
        verifyCurrent={!contact && !!verificationChannel} currentValue={(contact ?? verificationChannel) === 'phone' ? profile.phone : profile.email}
        onDone={(verified = false) => {
          if (!contact && requestedVerification === 'contact' && verificationChannel === 'email' && profile.phoneVerified === false) {
            navigate('/profile?verify=phone', { replace: true }); showToast('Email verified.'); return;
          }
          const ch = contact; closeContact(); showToast(verified ? (ch ?? verificationChannel) === 'phone' ? 'Phone number verified.' : 'Email verified.' : ch === 'email' ? 'Email updated.' : 'Phone number updated.');
        }} />
      <Toast message={toast} />
    </div>
  );
}
