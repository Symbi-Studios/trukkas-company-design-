'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge, Banner, Button, Card, Checkbox, Icon, Logo, Select, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { addTruck, confirmVerificationCode, sendVerificationCode, updateCompanyProfile } from '../mock/api.js';
import { emailTaken } from '../mock/accounts.js';
import { SIGNUP_DEMO_EMAIL } from '../mock/fixtures/account.js';
import { useSignUpAccountMutation } from '../store/features/auth/authApi.js';
import { setCredentials } from '../store/features/auth/authSlice.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { COMPANY_REQUIREMENTS, complianceFor, documentsFor } from '../domain/documents.js';
import { VEHICLE_CLASSES } from '../domain/vehicles.js';
import { maskEmail, maskPhone, passwordStrength } from '../domain/security.js';
import { CodeInput, PasswordStrength } from '../components/SecurityInputs.jsx';
import { ComplianceChecklist, UploadDocumentModal } from '../components/DocumentCompliance.jsx';
import { BankAccountForm } from './settings/PayoutAccountSettings.jsx';
import { PinForm } from './settings/PinSettings.jsx';
import styles from './Onboarding.module.css';

const STEPS = [
  { key: 'account', label: 'Create account', icon: 'user-round' },
  { key: 'email', label: 'Verify email', icon: 'mail-check' },
  { key: 'phone', label: 'Verify phone', icon: 'smartphone' },
  { key: 'company', label: 'Company details', icon: 'building-2' },
  { key: 'documents', label: 'Company documents', icon: 'file-check', optional: true },
  { key: 'trucks', label: 'Add trucks', icon: 'truck', optional: true },
  { key: 'payout', label: 'Payout & PIN', icon: 'landmark', optional: true },
  { key: 'done', label: 'All set', icon: 'party-popper' },
];

const STATES = ['Lagos', 'Ogun', 'Oyo', 'Rivers', 'Kano', 'Kaduna', 'FCT (Abuja)', 'Delta', 'Edo', 'Anambra', 'Abia', 'Enugu', 'Kwara', 'Sokoto', 'Cross River', 'Other'];
const REGIONS = ['South West', 'South South', 'South East', 'North Central', 'North West', 'North East', 'Cross-border (ECOWAS)'];
const FLEET_SIZES = ['1–5 trucks', '6–20 trucks', '21–50 trucks', '51–100 trucks', '100+ trucks'];
const RESEND_SECONDS = 30;

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(RESEND_SECONDS)];
}

/** "Send code → enter 6 digits" block for email and phone verification. */
function VerifyStep({ channel, target, onVerified, onChangeTarget }) {
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, restart] = useCountdown();

  async function send() {
    setError('');
    const r = await sendVerificationCode(channel, target);
    setDemoCode(r.demoCode);
    restart();
  }
  useEffect(() => { send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(value = code) {
    setBusy(true); setError('');
    try { await confirmVerificationCode(channel, target, value); await onVerified(); } catch (err) { setError(err.message); setCode(''); } finally { setBusy(false); }
  }

  return (
    <div className={styles.verify}>
      <span className={styles.verifyIcon}><Icon name={channel === 'email' ? 'mail' : 'message-square'} size={26} /></span>
      <p className={styles.lead}>We sent a 6-digit code to <strong>{channel === 'email' ? maskEmail(target) : maskPhone(target)}</strong>. It expires in 10 minutes.</p>
      <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy} />
      {demoCode && <Badge tone="info">Prototype only — no {channel === 'email' ? 'email' : 'SMS'} is sent. Demo code: {demoCode}</Badge>}
      <div className={styles.verifyActions}>
        <Button variant="ghost" disabled={left > 0} onClick={send}>{left > 0 ? `Resend in ${left}s` : 'Resend code'}</Button>
        <Button variant="ghost" onClick={onChangeTarget}>{channel === 'email' ? 'Change email' : 'Change number'}</Button>
      </div>
      <Button fullWidth disabled={busy || code.length < 6} onClick={() => verify()}>{busy ? 'Verifying…' : 'Verify'}</Button>
    </div>
  );
}

export function Onboarding() {
  const router = useRouter();
  const dispatch = useDispatch();
  const account = useSelector((state) => state.auth.account);
  const [signUpAccount] = useSignUpAccountMutation();
  const company = useCollection('companyProfile')?.[0];
  const documents = useCollection('documents') || [];
  const trucks = useCollection('trucks') || [];
  const wallet = useCollection('walletSummary')?.[0];
  const security = (useCollection('security') || [])[0];

  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({ name: '', email: SIGNUP_DEMO_EMAIL, password: '', confirm: '', terms: false, phone: '+234 ' });
  const [biz, setBiz] = useState({ name: '', rcNumber: '', entity: 'Limited Liability Company', founded: '', email: '', phone: '', address: '', state: 'Lagos', fleetSize: '', regions: [], role: 'Director' });
  const [truck, setTruck] = useState({ plate: '', vehicleClass: 'Head', make: '', model: '', year: '' });
  const [uploadType, setUploadType] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // An already signed-in user who didn't just sign up doesn't belong here.
  useEffect(() => { if (account && !created) router.replace('/dashboard'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = STEPS[step];
  const go = (index) => { setError(''); setStep(index); window.scrollTo({ top: 0 }); };
  const companyDocs = documentsFor(documents, 'company');
  const compliance = complianceFor(COMPANY_REQUIREMENTS, companyDocs).summary;

  async function submitAccount(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Enter your full name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return; }
    if (passwordStrength(form.password).score < 3) { setError('Choose a stronger password.'); return; }
    if (form.password !== form.confirm) { setError('Passwords don’t match.'); return; }
    if (!form.terms) { setError('Accept the terms to continue.'); return; }
    if (await emailTaken(form.email)) { setError('An account with this email already exists. Sign in instead.'); return; }
    go(1);
  }

  async function createAccount() {
    const result = await signUpAccount({ name: form.name, email: form.email, phone: form.phone.trim(), password: form.password }).unwrap().catch((err) => { throw new Error(getApiErrorMessage(err)); });
    setCreated(true);
    setForm((f) => ({ ...f, password: '', confirm: '' }));
    setBiz((b) => ({ ...b, email: result.account.email, phone: result.account.phone }));
    go(3);
  }

  async function submitCompany(event) {
    event.preventDefault();
    setError('');
    if (!biz.name.trim() || !biz.rcNumber.trim() || !biz.address.trim()) { setError('Company name, RC/BN number and address are required.'); return; }
    setBusy(true);
    await updateCompanyProfile({
      name: biz.name.trim(), shortName: biz.name.trim().split(' ')[0], rcNumber: biz.rcNumber.trim().toUpperCase(), entityType: biz.entity,
      founded: biz.founded, email: biz.email, phone: biz.phone, address: `${biz.address.trim()}, ${biz.state}, Nigeria`, fleetSize: biz.fleetSize, regions: biz.regions,
      frontPerson: { name: account.name, role: biz.role, email: account.email, phone: account.phone },
    });
    dispatch(setCredentials({ account: { ...account, companyName: biz.name.trim(), title: biz.role } }));
    setBusy(false);
    go(4);
  }

  async function submitTruck(event) {
    event.preventDefault();
    setError('');
    if (!truck.plate.trim() || !truck.make.trim() || !truck.model.trim() || !truck.year) { setError('Enter plate, make, model and year.'); return; }
    try {
      const plate = truck.plate.trim().toUpperCase().replace(/\s+/g, ' ');
      await addTruck({
        plate, vehicleClass: truck.vehicleClass, type: truck.vehicleClass === 'Trailer' ? 'Trailer' : 'Truck (Head)',
        make: truck.make.trim(), model: truck.model.trim(), year: Number(truck.year), makeModel: `${truck.make.trim()} ${truck.model.trim()} ${truck.year}`,
        color: '—', vin: '—', purchaseDate: '—', ownership: 'Company Owned', insuranceExpiry: '—', roadWorthinessExpiry: '—',
      });
      setTruck({ plate: '', vehicleClass: truck.vehicleClass, make: '', model: '', year: '' });
    } catch (err) { setError(err.message); }
  }

  const checklist = [
    { label: 'Email & phone verified', done: created, icon: 'badge-check' },
    { label: 'Company details', done: !!company?.rcNumber, icon: 'building-2' },
    { label: `Company documents (${compliance.requiredMet}/${compliance.requiredTotal})`, done: compliance.complete, icon: 'file-check', to: '/documents' },
    { label: `Trucks added (${trucks.length})`, done: trucks.length > 0, icon: 'truck', to: '/fleet/new' },
    { label: 'Payout bank account', done: !!wallet?.bankAccount, icon: 'landmark', to: '/company-settings?tab=payout' },
    { label: 'Transaction PIN', done: !!security?.pin?.set, icon: 'lock-keyhole', to: '/company-settings?tab=pin' },
  ];

  return (
    <main className={styles.page}>
      <aside className={styles.rail}>
        <div className={styles.brand}><Logo /></div>
        <h2>Move more. Go further.</h2>
        <p>Set up your trucking company on Trukkas in a few minutes. You can skip anything marked optional and finish later.</p>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.key} className={i < step ? styles.done : i === step ? styles.current : ''}>
              <span className={styles.dot}>{i < step ? <Icon name="check" size={13} /> : i + 1}</span>
              <span>{s.label}{s.optional && <small>Optional</small>}</span>
            </li>
          ))}
        </ol>
        <p className={styles.railFoot}>Already on Trukkas? <Link href="/login">Sign in</Link></p>
      </aside>

      <section className={styles.main}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <span className={styles.headIcon}><Icon name={current.icon} size={20} /></span>
            <span>
              <small>Step {step + 1} of {STEPS.length}{current.optional ? ' · Optional' : ''}</small>
              <h1>{{
                account: 'Create your Trukkas account', email: 'Verify your email', phone: 'Verify your phone number', company: 'Tell us about your company',
                documents: 'Upload company documents', trucks: 'Add your trucks', payout: 'Payout account & transaction PIN', done: 'You’re all set!',
              }[current.key]}</h1>
            </span>
          </div>

          {current.key === 'account' && (
            <form onSubmit={submitAccount} className={styles.form}>
              <p className={styles.lead}>You’ll be the <strong>owner</strong> of your company’s account and can invite your team later.</p>
              <TextField label="Full Name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Adaeze Okonkwo" />
              <TextField label="Work Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className={styles.two}>
                <TextField label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <TextField label="Confirm Password" type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
              </div>
              <PasswordStrength password={form.password} />
              <Checkbox checked={form.terms} onChange={(v) => setForm({ ...form, terms: v })} label="I agree to the Trukkas Terms of Service and Privacy Policy, and confirm I’m authorised to register this company." />
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" fullWidth size="lg" iconRight="arrow-right">Continue</Button>
            </form>
          )}

          {current.key === 'email' && (
            <VerifyStep channel="email" target={form.email.trim().toLowerCase()} onVerified={() => go(2)} onChangeTarget={() => go(0)} />
          )}

          {current.key === 'phone' && (
            form.phoneEntered ? (
              <VerifyStep
                channel="sms" target={form.phone.trim()}
                onVerified={createAccount}
                onChangeTarget={() => setForm({ ...form, phoneEntered: false })}
              />
            ) : (
              <form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                if (form.phone.replace(/\D/g, '').length < 13) { setError('Enter a valid Nigerian mobile number, e.g. +234 803 000 0000.'); return; }
                setError(''); setForm({ ...form, phoneEntered: true });
              }}>
                <p className={styles.lead}>We use your phone for sign-in codes, PIN resets and important trip alerts.</p>
                <TextField label="Mobile Number" type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 803 000 0000" />
                {error && <p className={styles.error}>{error}</p>}
                <Button type="submit" fullWidth size="lg" icon="message-square">Send Code</Button>
              </form>
            )
          )}

          {current.key === 'company' && (
            <form onSubmit={submitCompany} className={styles.form}>
              <Banner tone="success" title={`Welcome, ${account?.name?.split(' ')[0] || ''}! Your account is ready.`}>Now let’s set up your company profile. Forwarders see this on your bids.</Banner>
              <div className={styles.two}>
                <TextField label="Registered Company Name" required value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} placeholder="As on your CAC certificate" />
                <TextField label="RC / BN Number" required value={biz.rcNumber} onChange={(e) => setBiz({ ...biz, rcNumber: e.target.value })} placeholder="e.g. RC 1234567" />
                <Select label="Business Type" value={biz.entity} options={['Limited Liability Company', 'Business Name (Enterprise)', 'Partnership', 'Cooperative']} onChange={(e) => setBiz({ ...biz, entity: e.target.value })} />
                <TextField label="Year Founded" inputMode="numeric" maxLength={4} value={biz.founded} onChange={(e) => setBiz({ ...biz, founded: e.target.value.replace(/\D/g, '') })} />
                <TextField label="Company Email" type="email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
                <TextField label="Company Phone" value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
              </div>
              <TextField label="Business Address" required value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} placeholder="Street, area, city" />
              <div className={styles.two}>
                <Select label="State" value={biz.state} options={STATES} onChange={(e) => setBiz({ ...biz, state: e.target.value })} />
                <Select label="Fleet Size" value={biz.fleetSize} placeholder="How many trucks?" options={FLEET_SIZES} onChange={(e) => setBiz({ ...biz, fleetSize: e.target.value })} />
                <Select label="Your Role" value={biz.role} options={['Director', 'Managing Director', 'CEO / Founder', 'Operations Manager', 'Fleet Manager']} onChange={(e) => setBiz({ ...biz, role: e.target.value })} />
              </div>
              <div>
                <span className={styles.label}>Where do you operate?</span>
                <div className={styles.chips}>
                  {REGIONS.map((r) => {
                    const on = biz.regions.includes(r);
                    return (
                      <button key={r} type="button" aria-pressed={on} className={on ? styles.chipOn : ''} onClick={() => setBiz({ ...biz, regions: on ? biz.regions.filter((x) => x !== r) : [...biz.regions, r] })}>
                        {on && <Icon name="check" size={13} />}{r}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" fullWidth size="lg" disabled={busy} iconRight="arrow-right">{busy ? 'Saving…' : 'Save & Continue'}</Button>
            </form>
          )}

          {current.key === 'documents' && (
            <div className={styles.form}>
              <p className={styles.lead}>Trukkas verifies every company before it can bid on jobs or receive payouts. Upload what you have now — you can finish from <strong>Documents</strong> later.</p>
              <ComplianceChecklist title="Business Documents" requirements={COMPANY_REQUIREMENTS} docs={companyDocs} onUpload={(req) => setUploadType(req.type)} style={{ boxShadow: 'none' }} />
              <div className={styles.footer}>
                <Button variant="outline" onClick={() => go(5)}>Skip for now</Button>
                <Button iconRight="arrow-right" onClick={() => go(5)}>Continue</Button>
              </div>
            </div>
          )}

          {current.key === 'trucks' && (
            <div className={styles.form}>
              <p className={styles.lead}>Add the basics now. Registration papers, photos, specs and drivers can be added from <strong>Fleet</strong> any time.</p>
              <form onSubmit={submitTruck} className={styles.truckForm}>
                <TextField label="Plate Number" value={truck.plate} onChange={(e) => setTruck({ ...truck, plate: e.target.value })} placeholder="LSD 555 XY" />
                <Select label="Type" value={truck.vehicleClass} options={VEHICLE_CLASSES.map((c) => ({ value: c.value, label: c.label }))} onChange={(e) => setTruck({ ...truck, vehicleClass: e.target.value })} />
                <TextField label="Make" value={truck.make} onChange={(e) => setTruck({ ...truck, make: e.target.value })} placeholder="Mercedes-Benz" />
                <TextField label="Model" value={truck.model} onChange={(e) => setTruck({ ...truck, model: e.target.value })} placeholder="Actros" />
                <TextField label="Year" inputMode="numeric" maxLength={4} value={truck.year} onChange={(e) => setTruck({ ...truck, year: e.target.value.replace(/\D/g, '') })} />
                <Button type="submit" icon="plus">Add</Button>
              </form>
              {error && <p className={styles.error}>{error}</p>}
              {trucks.length > 0 ? (
                <ul className={styles.truckList}>
                  {trucks.map((t) => (
                    <li key={t.plate}><Icon name="truck" size={18} color="var(--tk-blue)" /><strong>{t.plate}</strong><span>{t.makeModel}</span><Badge tone="warning">Documents pending</Badge></li>
                  ))}
                </ul>
              ) : <p className="tk-meta">No trucks added yet.</p>}
              <div className={styles.footer}>
                <Button variant="outline" onClick={() => go(6)}>{trucks.length ? 'Continue' : 'Skip, add later'}</Button>
                {trucks.length > 0 && <Button iconRight="arrow-right" onClick={() => go(6)}>Continue</Button>}
              </div>
            </div>
          )}

          {current.key === 'payout' && (
            <div className={styles.form}>
              <section className={styles.block}>
                <h3><Icon name="landmark" size={17} /> Payout bank account</h3>
                {wallet?.bankAccount
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />{wallet.bankAccount.bankName} •••• {wallet.bankAccount.last4} · {wallet.bankAccount.accountName}</span>
                  : <BankAccountForm requirePin={false} submitLabel="Save Bank Account" />}
              </section>
              <section className={styles.block}>
                <h3><Icon name="lock-keyhole" size={17} /> Transaction PIN</h3>
                {security?.pin?.set
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />PIN created. You’ll use it to approve payouts, withdrawals and bank changes.</span>
                  : <PinForm mode="create" phone={account?.phone} onDone={() => {}} />}
              </section>
              <div className={styles.footer}>
                <Button variant="outline" onClick={() => go(7)}>Skip for now</Button>
                <Button iconRight="arrow-right" onClick={() => go(7)}>Continue</Button>
              </div>
            </div>
          )}

          {current.key === 'done' && (
            <div className={styles.form}>
              <p className={styles.lead}>Your company workspace is ready. Here’s what’s left before you can bid on jobs and get paid:</p>
              <ul className={styles.checklist}>
                {checklist.map((c) => (
                  <li key={c.label} className={c.done ? styles.checkDone : ''}>
                    <Icon name={c.done ? 'circle-check' : c.icon} size={18} />
                    <span>{c.label}</span>
                    {c.done ? <Badge tone="success">Done</Badge> : c.to && <Link href={c.to}>Finish</Link>}
                  </li>
                ))}
              </ul>
              <Banner tone="info" title="Verification">Once your required documents are uploaded, Trukkas reviews them (usually within 1 business day) and unlocks bidding.</Banner>
              <Button fullWidth size="lg" icon="layout-dashboard" onClick={() => router.replace('/dashboard')}>Go to Dashboard</Button>
            </div>
          )}
        </Card>
        {step > 0 && step < 3 && <button type="button" className={styles.back} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
        {step > 3 && step < 7 && <button type="button" className={styles.back} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
      </section>

      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="company" ownerId={company?.id} ownerLabel={company?.name}
        requirements={COMPANY_REQUIREMENTS} initialType={uploadType} onDone={() => setUploadType(null)}
      />
    </main>
  );
}

