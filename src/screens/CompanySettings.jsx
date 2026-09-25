'use client';

import { useState } from 'react';
import { Badge, Banner, Button, Card, PageHeader, Switch, Tabs, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { updateCompanyProfile } from '../mock/api.js';

const TABS = [
  { value: 'profile', label: 'Company Profile' },
  { value: 'payments', label: 'Payments' },
  { value: 'notifications', label: 'Notifications' },
];

const NOTIFICATION_PREFS = [
  { key: 'newJobs', label: 'New job requests', hint: 'Get notified when a matching job request is posted.' },
  { key: 'tripUpdates', label: 'Trip status updates', hint: 'Pickup, in transit, and delivery milestones.' },
  { key: 'payouts', label: 'Payout activity', hint: 'When a payout is processed or fails.' },
  { key: 'documents', label: 'Document expiry reminders', hint: 'Before a vehicle document expires.' },
  { key: 'reviews', label: 'New reviews', hint: 'When a forwarder leaves a rating for your trip.' },
];

export function CompanySettings() {
  const company = useCollection('companyProfile')?.[0];
  const [tab, setTab] = useState('profile');
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState(Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, true])));

  if (!company) return null;
  const form = draft || company;

  async function save() {
    await updateCompanyProfile(draft || {});
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Company Settings" description="Manage your company profile, payment details, and notification preferences." />
      {saved && <Banner tone="success" title="Settings saved" />}
      <Card pad="none">
        <div style={{ padding: '4px 16px 0' }}><Tabs value={tab} onChange={setTab} items={TABS} /></div>
        <div style={{ padding: 16, display: 'grid', gap: 16, maxWidth: 560 }}>
          {tab === 'profile' && (
            <>
              <TextField label="Company Name" value={form.name} onChange={(e) => setDraft({ ...form, name: e.target.value })} />
              <TextField label="RC Number" value={form.rcNumber} onChange={(e) => setDraft({ ...form, rcNumber: e.target.value })} />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setDraft({ ...form, email: e.target.value })} />
              <TextField label="Phone" value={form.phone} onChange={(e) => setDraft({ ...form, phone: e.target.value })} />
              <TextField label="Address" value={form.address} onChange={(e) => setDraft({ ...form, address: e.target.value })} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="tk-meta">Verification Status</span>
                <Badge tone={form.verification === 'Verified' ? 'success' : 'warning'}>{form.verification}</Badge>
              </div>
              <Button style={{ justifySelf: 'start' }} onClick={save} disabled={!draft}>Save Changes</Button>
            </>
          )}
          {tab === 'payments' && (
            <>
              <TextField label="Bank Name" defaultValue="GTBank" />
              <TextField label="Account Name" defaultValue={company.name} />
              <TextField label="Account Number" defaultValue="0123456821" />
              <Button style={{ justifySelf: 'start' }} onClick={save}>Save Payment Details</Button>
            </>
          )}
          {tab === 'notifications' && (
            <>
              {NOTIFICATION_PREFS.map((p) => (
                <Switch key={p.key} label={p.label} hint={p.hint} checked={prefs[p.key]} onChange={(v) => setPrefs({ ...prefs, [p.key]: v })} />
              ))}
              <Button style={{ justifySelf: 'start' }} onClick={save}>Save Preferences</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
