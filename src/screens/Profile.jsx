'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import { Avatar, Badge, Button, Card, DataTable, Icon, Modal, PageHeader, SectionCard, Select, Textarea, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { confirmVerificationCode, sendVerificationCode, updateAdminProfile } from '../mock/api.js';
import { setCredentials } from '../store/features/auth/authSlice.js';
import { PERMISSION_GROUPS, roleById } from '../domain/access.js';
import { CodeInput } from '../components/SecurityInputs.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './settings/Settings.module.css';

const TIMEZONES = ['Africa/Lagos (WAT, UTC+1)', 'Africa/Accra (GMT, UTC+0)', 'Africa/Nairobi (EAT, UTC+3)', 'Europe/London (UTC+0/+1)'];

/** Change email or phone: send a code to the new value, then confirm it. */
function ChangeContactModal({ channel, open, onClose, onDone }) {
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setValue(''); setCode(''); setDemoCode(''); setSent(false); setError(''); } }, [open]);
  const isEmail = channel === 'email';

  async function send() {
    setError('');
    if (isEmail ? !/^\S+@\S+\.\S+$/.test(value) : value.replace(/\D/g, '').length < 10) { setError(isEmail ? 'Enter a valid email.' : 'Enter a valid phone number.'); return; }
    const r = await sendVerificationCode(isEmail ? 'email' : 'sms', value.trim());
    setDemoCode(r.demoCode); setSent(true);
  }
  async function confirm(c = code) {
    setError('');
    try { await confirmVerificationCode(isEmail ? 'email' : 'sms', value.trim(), c); onDone(value.trim()); } catch (err) { setError(err.message); setCode(''); }
  }

  return (
    <Modal open={open} onClose={onClose} width={440} title={isEmail ? 'Change Email Address' : 'Change Phone Number'}
      description={isEmail ? 'We’ll send a code to your new email to confirm it.' : 'We’ll text a code to your new number to confirm it.'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>{sent ? <Button disabled={code.length < 6} onClick={() => confirm()}>Confirm</Button> : <Button onClick={send}>Send Code</Button>}</>}>
      <div style={{ display: 'grid', gap: 14, justifyItems: 'stretch' }}>
        <TextField label={isEmail ? 'New Email' : 'New Phone Number'} type={isEmail ? 'email' : 'tel'} value={value} disabled={sent} onChange={(e) => setValue(e.target.value)} placeholder={isEmail ? 'you@company.com' : '+234 800 000 0000'} />
        {sent && (
          <>
            <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => confirm(v)} />
            {demoCode && <Badge tone="info" style={{ justifySelf: 'center' }}>Demo code: {demoCode}</Badge>}
          </>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const account = useSelector((state) => state.auth.account);
  const profile = (useCollection('adminProfile') || [])[0];
  const security = (useCollection('security') || [])[0];
  const roles = useCollection('roles') || [];
  const company = useCollection('companyProfile')?.[0];
  const [draft, setDraft] = useState(null);
  const [contact, setContact] = useState(null);
  const [toast, showToast] = useToast();
  const fileInput = useRef(null);

  if (!profile || !account) return null;
  const form = draft || profile;
  const role = roleById(roles, account.roleId || 'owner');
  const set = (key) => (e) => setDraft({ ...form, [key]: e.target.value });

  async function persist(changes, message) {
    const updated = await updateAdminProfile(changes);
    dispatch(setCredentials({ account: { ...account, name: updated.name, phone: updated.phone, email: updated.email, title: updated.title } }));
    setDraft(null);
    showToast(message);
  }

  return (
    <div className={styles.page}>
      <PageHeader title="My Profile" description="Your personal details, sign-in security and access on this company account." />

      <Card style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Avatar name={profile.name} src={profile.photoUrl || undefined} size={80} tone="var(--tk-navy)" />
        <span style={{ flex: 1, minWidth: 220, display: 'grid', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ font: '700 22px/28px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{profile.name}</strong>
            <Badge tone="purple">{role?.name || account.role}</Badge>
          </span>
          <span className="tk-meta">{[profile.title, company?.name].filter(Boolean).join(' · ')}</span>
          <span className="tk-meta">Member since {profile.joined}</span>
        </span>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { showToast('Photos must be under 5 MB.'); return; }
          persist({ photoUrl: URL.createObjectURL(file) }, 'Profile photo updated.');
        }} />
        <Button variant="outline" icon="camera" onClick={() => fileInput.current?.click()}>{profile.photoUrl ? 'Change Photo' : 'Upload Photo'}</Button>
        {profile.photoUrl && <Button variant="ghost" onClick={() => persist({ photoUrl: null }, 'Profile photo removed.')}>Remove</Button>}
      </Card>

      <div className={styles.shell} style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
        <div className={styles.content}>
          <SectionCard title="Personal Details">
            <div className={styles.form} style={{ maxWidth: 'none' }}>
              <TextField label="Full Name" value={form.name} onChange={set('name')} />
              <TextField label="Job Title" value={form.title} onChange={set('title')} placeholder="e.g. Managing Director" />
              <div>
                <TextField label="Email Address" value={profile.email} disabled suffix={profile.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>} />
                <button type="button" className={styles.hint} style={{ border: 0, background: 'none', padding: 0, marginTop: 6, color: 'var(--tk-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setContact('email')}>Change email</button>
              </div>
              <div>
                <TextField label="Phone Number" value={profile.phone} disabled suffix={profile.phoneVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>} />
                <button type="button" className={styles.hint} style={{ border: 0, background: 'none', padding: 0, marginTop: 6, color: 'var(--tk-blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setContact('phone')}>Change phone</button>
              </div>
              <div className={styles.full}><Textarea label="Short Bio (optional)" rows={2} maxLength={200} value={form.bio || ''} onChange={set('bio')} /></div>
              <Select label="Language" value={form.language} options={['English', 'Pidgin (coming soon)', 'Hausa (coming soon)', 'Yoruba (coming soon)', 'Igbo (coming soon)'].map((v) => ({ value: v, label: v }))} onChange={set('language')} />
              <Select label="Time Zone" value={form.timezone} options={TIMEZONES} onChange={set('timezone')} />
              <div className={styles.formActions}>
                <Button disabled={!draft || !form.name.trim()} onClick={() => persist({ name: form.name.trim(), title: form.title, bio: form.bio, language: form.language, timezone: form.timezone }, 'Profile saved.')}>Save Changes</Button>
                {draft && <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent Sign-in Activity" pad="none">
            <DataTable rows={profile.loginHistory} rowKey={(r, i) => r.time + i} columns={[
              { key: 'time', header: 'When', render: (r) => r.time },
              { key: 'device', header: 'Device', render: (r) => r.device },
              { key: 'location', header: 'Location', render: (r) => r.location },
              { key: 'result', header: 'Result', render: (r) => <Badge tone={r.result === 'Success' ? 'success' : 'danger'}>{r.result}</Badge> },
            ]} />
          </SectionCard>
        </div>

        <aside className={styles.content}>
          <SectionCard title="Account Security">
            {[
              { icon: 'key-round', label: 'Password', value: `Changed ${security?.passwordUpdatedOn || '—'}`, ok: true, tab: 'security' },
              { icon: 'shield-check', label: 'Two-factor authentication', value: security?.twoFactor.enabled ? `On · ${security.twoFactor.method === 'app' ? 'Authenticator app' : 'SMS'}` : 'Off', ok: security?.twoFactor.enabled, tab: 'security' },
              { icon: 'lock-keyhole', label: 'Transaction PIN', value: security?.pin.set ? `Set · ${security.pin.updatedOn}` : 'Not set', ok: security?.pin.set, tab: 'pin' },
            ].map((item) => (
              <button key={item.label} type="button" className={styles.row} onClick={() => navigate(`/company-settings?tab=${item.tab}`)}
                style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--tk-line)', cursor: 'pointer', textAlign: 'left' }}>
                <span className={styles.iconTile} data-tone={item.ok ? 'green' : 'amber'}><Icon name={item.icon} size={18} /></span>
                <span className={styles.rowMain}><strong>{item.label}</strong><small>{item.value}</small></span>
                <Icon name="chevron-right" size={16} color="var(--tk-ink-300)" />
              </button>
            ))}
          </SectionCard>
          <SectionCard title="Your Access" description={role?.description}>
            {PERMISSION_GROUPS.map((g) => {
              const granted = g.permissions.filter((p) => role?.permissions.includes(p.key));
              return (
                <div key={g.group} className={styles.row}>
                  <span className={styles.iconTile} data-tone={granted.length ? 'green' : 'neutral'}><Icon name={g.icon} size={16} /></span>
                  <span className={styles.rowMain}><strong>{g.group}</strong><small>{granted.length ? granted.map((p) => p.label).join(', ') : 'No access'}</small></span>
                </div>
              );
            })}
          </SectionCard>
        </aside>
      </div>

      <ChangeContactModal channel={contact} open={!!contact} onClose={() => setContact(null)}
        onDone={(value) => { const ch = contact; setContact(null); persist(ch === 'email' ? { email: value, emailVerified: true } : { phone: value, phoneVerified: true }, ch === 'email' ? 'Email updated.' : 'Phone number updated.'); }} />
      <Toast message={toast} />
    </div>
  );
}
