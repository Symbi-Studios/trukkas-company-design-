'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import { Badge, Button, Card, Icon, PageHeader, SectionCard, SkeletonRow, Switch, TextField } from '../ds.js';
import { EMPTY_COMPANY_SETTINGS, useGetCompanySettingsQuery, useUpdateCompanySettingsMutation, useGetSettingsNotificationsQuery, useUpdateSettingsNotificationsMutation } from '../store/features/settings/settingsApi.js';
import { useGetMyProfileAccessQuery } from '../store/features/profile/profileApi.js';
import { useGetOnboardingSecurityQuery } from '../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { PayoutAccountSettings } from './settings/PayoutAccountSettings.jsx';
import { RolesSettings, TeamSettings } from './settings/TeamSettings.jsx';
import { SecuritySettings } from './settings/SecuritySettings.jsx';
import { PinSettings } from './settings/PinSettings.jsx';
import styles from './settings/Settings.module.css';

const SECTIONS = [
  { value: 'profile', label: 'Company Profile', icon: 'building-2' },
  { value: 'payout', label: 'Payout Account', icon: 'landmark' },
  { value: 'team', label: 'Team Members', icon: 'users-round' },
  { value: 'roles', label: 'Roles & Permissions', icon: 'shield-half' },
  { value: 'security', label: 'Security & 2FA', icon: 'shield-check' },
  { value: 'pin', label: 'Transaction PIN', icon: 'lock-keyhole' },
  { value: 'notifications', label: 'Notifications', icon: 'bell' },
];

const NOTIFICATION_PREFS = [
  { key: 'newJobs', label: 'New job requests', hint: 'Get notified when a matching job request is posted.' },
  { key: 'tripUpdates', label: 'Trip status updates', hint: 'Pickup, in transit, and delivery milestones.' },
  { key: 'payouts', label: 'Payout activity', hint: 'When a payout is processed or fails.' },
  { key: 'documents', label: 'Document expiry reminders', hint: 'Before a vehicle, driver or company document expires.' },
  { key: 'reviews', label: 'New reviews', hint: 'When a forwarder leaves a rating for your trip.' },
  { key: 'security', label: 'Security alerts', hint: 'PIN changes, bank changes and new team members. Always on for owners.', locked: true },
];

function ProfileSection({ company, canEdit, onToast }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [updateCompany, { isLoading: saving }] = useUpdateCompanySettingsMutation();
  const form = { ...company, ...draft };
  const set = (key) => (e) => setDraft((previous) => ({ ...previous, [key]: e.target.value }));
  async function save() {
    if (saving || !draft) return;
    const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== company[key]));
    if (!Object.keys(changes).length) { setDraft(null); return; }
    try { await updateCompany(changes).unwrap(); setDraft(null); onToast('Company profile saved.'); }
    catch (error) { onToast(getApiErrorMessage(error)); }
  }
  return (
    <>
      <SectionCard title="Company Profile" description="Shown to forwarders on your bids and receipts."
        action={<Badge tone={company.verification === 'Verified' ? 'success' : 'warning'} dot>{company.verification}</Badge>}>
        <div className={styles.form}>
          <TextField label="Registered Company Name" value={form.name} onChange={set('name')} />
          <TextField label="RC Number" value={form.rcNumber} onChange={set('rcNumber')} />
          <TextField label="Company Email" type="email" value={form.email} onChange={set('email')} />
          <TextField label="Company Phone" value={form.phone} onChange={set('phone')} />
          <div className={styles.full}><TextField label="Business Address" value={form.address} onChange={set('address')} /></div>
          <TextField label="Year Founded" value={form.founded || ''} onChange={set('founded')} />
          <TextField label="Industry" value={form.industry || ''} onChange={set('industry')} />
          <div className={styles.formActions}>
            <Button onClick={save} disabled={!draft || saving || !canEdit}>Save Changes</Button>
            {draft && <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>}
          </div>
        </div>
      </SectionCard>
      <Card tone="cool" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Icon name="file-check" size={18} color="var(--tk-blue)" />
        <span className="tk-meta" style={{ flex: 1 }}>Business verification documents (CAC, TIN, director NIN/BVN) are managed under Documents → Company.</span>
        <Button size="sm" variant="outline" onClick={() => navigate('/documents')}>Open Documents</Button>
      </Card>
    </>
  );
}

function NotificationsSection({ onToast, canEdit }) {
  const { data, error, isLoading } = useGetSettingsNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [update, { isLoading: saving }] = useUpdateSettingsNotificationsMutation();
  const [draft, setDraft] = useState(null);
  const prefs = { ...data, ...draft };
  async function save() {
    if (!draft || saving) return;
    try { await update(draft).unwrap(); setDraft(null); onToast('Notification preferences saved.'); }
    catch (requestError) { onToast(getApiErrorMessage(requestError)); }
  }
  return (
    <SectionCard title="Notifications" description="Choose what we email you about.">
      {isLoading && <SkeletonRow columns={2} />}
      {error && <p className={styles.error}>{getApiErrorMessage(error)}</p>}
      <div style={{ display: 'grid', gap: 16 }}>
        {NOTIFICATION_PREFS.map((p) => (
          <Switch key={p.key} label={p.label} hint={p.hint} checked={prefs[p.key] ?? null} disabled onChange={(v) => setDraft({ ...draft, [p.key]: v })} />
        ))}
        <Button style={{ justifySelf: 'start' }} disabled onClick={save}>Save Preferences</Button>
      </div>
    </SectionCard>
  );
}

export function CompanySettings() {
  return <Suspense fallback={null}><CompanySettingsContent /></Suspense>;
}

function CompanySettingsContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const account = useSelector((state) => state.auth.account);
  const { data, error, isLoading } = useGetCompanySettingsQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { data: access, error: accessError } = useGetMyProfileAccessQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { data: security } = useGetOnboardingSecurityQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const company = data?.company ?? EMPTY_COMPANY_SETTINGS;
  const canEdit = access?.canEdit === true;
  const [tab, setTab] = useState('profile');
  const [toast, showToast] = useToast();

  useEffect(() => {
    if (SECTIONS.some((s) => s.value === requested)) setTab(requested);
  }, [requested]);

  if (!account) return null;
  const flag = { security: security?.twoFactor?.available === true && security.twoFactor.enabled === false, pin: security?.pin?.set === false };

  return (
    <div className={styles.page}>
      <PageHeader title="Company Settings" description={error || accessError ? getApiErrorMessage(error || accessError) : 'Company profile, payout account, team access, security and transaction PIN.'} />
      <div className={styles.shell}>
        <Card pad="none" className={styles.nav} role="tablist" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button key={s.value} type="button" role="tab" aria-selected={tab === s.value} className={tab === s.value ? styles.active : ''} onClick={() => setTab(s.value)}>
              <Icon name={s.icon} size={17} />
              <span className={styles.navLabel}>{s.label}</span>
              {flag[s.value] && <Badge tone="warning">Set up</Badge>}
            </button>
          ))}
        </Card>
        <div className={styles.content}>
          {tab === 'profile' && (isLoading ? <Card><SkeletonRow columns={3} /></Card> : <ProfileSection company={company} canEdit={canEdit} onToast={showToast} />)}
          {tab === 'payout' && <PayoutAccountSettings onToast={showToast} />}
          {tab === 'team' && <TeamSettings onToast={showToast} />}
          {tab === 'roles' && <RolesSettings onToast={showToast} />}
          {tab === 'security' && <SecuritySettings onToast={showToast} />}
          {tab === 'pin' && <PinSettings onToast={showToast} />}
          {tab === 'notifications' && <NotificationsSection canEdit={canEdit} onToast={showToast} />}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
