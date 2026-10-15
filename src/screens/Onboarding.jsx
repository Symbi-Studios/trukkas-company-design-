'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge, Banner, Button, Card, Checkbox, Icon, Logo, Select, TextField,
} from '../ds.js';
import {
  useCheckAccountEmailMutation, useStartAccountRegistrationMutation, useResendAccountCodeMutation,
  useVerifyAccountPhoneMutation, useSignUpAccountMutation, useSaveOnboardingCompanyMutation, useFinishCompanyOnboardingMutation,
} from '../store/features/auth/authApi.js';
import { setCredentials } from '../store/features/auth/authSlice.js';
import {
  useGetOnboardingDocumentsQuery, useUploadOnboardingDocumentMutation, useGetOnboardingTrucksQuery,
  useGetOnboardingBanksQuery, useResolveOnboardingBankMutation, useGetOnboardingBankQuery,
  useSaveOnboardingBankMutation, useGetOnboardingSecurityQuery,
} from '../store/features/auth/onboardingApi.js';
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
  { key: 'birth', label: 'Date of birth', icon: 'user-round' },
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
function VerifyStep({ channel, target, sessionToken, onVerified, onChangeTarget }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, restart] = useCountdown();
  const [resendCode, { isLoading: resending }] = useResendAccountCodeMutation();
  const [verifyPhone] = useVerifyAccountPhoneMutation();
  const verifying = useRef(false);
  const verified = useRef(false);

  async function send() {
    setError('');
    try {
      await resendCode({ sessionToken }).unwrap();
      restart();
    } catch (err) { setError(getApiErrorMessage(err)); }
  }
  useEffect(() => { restart(); }, []); // The phone form already sent the first code.

  async function verify(value = code) {
    if (verifying.current || resending || !/^\d{6}$/.test(value)) return;
    verifying.current = true;
    setBusy(true); setError('');
    try {
      if (!verified.current) {
        await verifyPhone({ sessionToken, code: value }).unwrap();
        verified.current = true;
      }
      await onVerified();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { verifying.current = false; setBusy(false); }
  }

  return (
    <div className={styles.verify}>
      <span className={styles.verifyIcon}><Icon name={channel === 'email' ? 'mail' : 'message-square'} size={26} /></span>
      <p className={styles.lead}>We sent a 6-digit code to <strong>{channel === 'email' ? maskEmail(target) : maskPhone(target)}</strong>. Expiry: —.</p>
      <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy} />
      <div className={styles.verifyActions}>
        <Button variant="ghost" disabled={left > 0 || resending || busy || verified.current} onClick={send}>{left > 0 ? `Resend in ${left}s` : 'Resend code'}</Button>
        <Button variant="ghost" disabled={busy} onClick={onChangeTarget}>{channel === 'email' ? 'Change email' : 'Change number'}</Button>
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
  const [checkEmail] = useCheckAccountEmailMutation();
  const [startRegistration] = useStartAccountRegistrationMutation();
  const [saveCompany] = useSaveOnboardingCompanyMutation();
  const [finishOnboarding] = useFinishCompanyOnboardingMutation();
  const [uploadDocument] = useUploadOnboardingDocumentMutation();
  const [resolveBank] = useResolveOnboardingBankMutation();
  const [saveBank] = useSaveOnboardingBankMutation();
  const { data: documents } = useGetOnboardingDocumentsQuery(undefined, { skip: !account });
  const { data: truckData } = useGetOnboardingTrucksQuery(undefined, { skip: !account });
  const { data: banks } = useGetOnboardingBanksQuery(undefined, { skip: !account });
  const { data: bank } = useGetOnboardingBankQuery(undefined, { skip: !account });
  const { data: security } = useGetOnboardingSecurityQuery(undefined, { skip: !account });
  const trucks = truckData || [];

  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false, phone: '+234 ', dateOfBirth: '' });
  const [sessionToken, setSessionToken] = useState(null);
  const [biz, setBiz] = useState({ name: '', rcNumber: '', entity: 'Limited Liability Company', founded: '', email: '', phone: '', address: '', state: 'Lagos', fleetSize: '', regions: [], role: 'Director', directorName: '', directorDob: '' });
  const [truck, setTruck] = useState({ plate: '', vehicleClass: 'Head', make: '', model: '', year: '' });
  const [uploadType, setUploadType] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resolveAccount = useCallback(async (bankCode, accountNumber) => {
    try {
      const selected = banks?.find((item) => item.code === bankCode);
      if (!selected) throw new Error('Choose a bank from the supported bank list.');
      const resolved = await resolveBank({ bankName: selected.name, accountNumber }).unwrap();
      if (!resolved.accountName || resolved.accountName === '—') throw new Error('The API could not confirm the account name.');
      return resolved;
    } catch (err) { throw new Error(err instanceof Error ? err.message : getApiErrorMessage(err)); }
  }, [banks, resolveBank]);

  async function saveAccount({ bankCode, accountNumber }) {
    try {
      const selected = banks?.find((item) => item.code === bankCode);
      if (!selected) throw new Error('Choose a bank from the supported bank list.');
      const saved = await saveBank({ bankName: selected.name, accountNumber }).unwrap();
      if (!saved) throw new Error('The API did not return a saved bank account.');
      return saved;
    } catch (err) { throw new Error(err instanceof Error ? err.message : getApiErrorMessage(err)); }
  }

  async function submitDocument(document) {
    try { return await uploadDocument(document).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }

  // Resume company setup without collecting or persisting a password again.
  useEffect(() => {
    if (!account) return;
    if (account.onboardingComplete !== false || ['AWAITING_REVIEW', 'APPLICATION_REJECTED'].includes(account.onboardingStep)) {
      router.replace('/dashboard');
      return;
    }
    setCreated(true);
    setStep(account.cacNumber ? 4 : 3);
    setBiz((value) => ({
      ...value, name: account.companyName === '—' ? '' : account.companyName,
      rcNumber: account.cacNumber || '', address: account.businessAddress || '',
      entity: account.businessType || value.entity, email: account.email, phone: account.phone,
      directorName: account.contactName || account.name, directorDob: account.dateOfBirth || '',
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = STEPS[step];
  const go = (index) => {
    if (index < 2) { setSessionToken(null); setForm((value) => ({ ...value, phoneEntered: false })); }
    setError(''); setStep(index); window.scrollTo({ top: 0 });
  };
  const companyDocs = documentsFor(documents || [], 'company');
  const compliance = complianceFor(COMPANY_REQUIREMENTS, companyDocs).summary;

  async function submitAccount(event) {
    event.preventDefault();
    setError('');
    if (form.name.trim().split(/\s+/).length < 2) { setError('Enter your first and last name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return; }
    if (passwordStrength(form.password).score < 3) { setError('Choose a stronger password.'); return; }
    if (form.password !== form.confirm) { setError('Passwords don’t match.'); return; }
    if (!form.terms) { setError('Accept the terms to continue.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const availability = await checkEmail({ email: form.email }).unwrap();
      if (availability.available === false) { setError('An account with this email already exists. Sign in instead.'); return; }
      if (availability.available !== true) { setError('Email availability could not be confirmed. Try again.'); return; }
      go(1);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function createAccount() {
    const result = await signUpAccount({ name: form.name, email: form.email, password: form.password, dateOfBirth: form.dateOfBirth, sessionToken }).unwrap();
    setCreated(true);
    setForm((f) => ({ ...f, password: '', confirm: '' }));
    setBiz((b) => ({ ...b, email: result.account.email, phone: result.account.phone, directorName: result.account.name, directorDob: form.dateOfBirth }));
    go(3);
  }

  async function sendPhoneCode(event) {
    event.preventDefault();
    if (busy) return;
    if (!/^\+234\d{10}$/.test(form.phone.replace(/\s/g, ''))) { setError('Enter a valid Nigerian mobile number, e.g. +234 803 000 0000.'); return; }
    setBusy(true); setError('');
    try {
      const result = await startRegistration({ phone: form.phone }).unwrap();
      if (!result.sessionToken) throw new Error('The API did not return a phone verification session.');
      setSessionToken(result.sessionToken);
      setForm((value) => ({ ...value, phoneEntered: true }));
    } catch (err) { setError(err instanceof Error ? err.message : getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function submitCompany(event) {
    event.preventDefault();
    setError('');
    if (!biz.name.trim() || !biz.rcNumber.trim() || !biz.address.trim()) { setError('Company name, RC/BN number and address are required.'); return; }
    if (!biz.directorName.trim() || !biz.directorDob) { setError('Enter the director’s full name and date of birth.'); return; }
    setBusy(true);
    try {
      await saveCompany(biz).unwrap();
      dispatch(setCredentials({ account: { ...account, companyName: biz.name.trim(), cacNumber: biz.rcNumber.trim(), businessAddress: `${biz.address.trim()}, ${biz.state}, Nigeria`, businessType: biz.entity, contactName: biz.directorName.trim() } }));
      go(4);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function submitTruck(event) {
    event.preventDefault();
    setError('');
    if (!truck.plate.trim() || !truck.make.trim() || !truck.model.trim() || !truck.year) { setError('Enter plate, make, model and year.'); return; }
    try {
      throw new Error('Truck registration is unavailable here: the API does not document saving make, model or head/trailer type from this form.');
    } catch (err) { setError(err.message); }
  }

  async function finish() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await finishOnboarding().unwrap();
      dispatch(setCredentials({ account: { ...account, ...result } }));
      router.replace('/dashboard');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }
  const checklist = [
    { label: 'Phone verified', done: created, icon: 'badge-check' },
    { label: 'Company details', done: step >= 4, icon: 'building-2' },
    { label: `Company documents (${documents ? compliance.requiredMet : '—'}/${compliance.requiredTotal})`, done: !!documents && compliance.complete, icon: 'file-check', to: '/documents' },
    { label: `Trucks added (${truckData ? trucks.length : '—'})`, done: trucks.length > 0, icon: 'truck', to: '/fleet/new' },
    { label: 'Payout bank account', done: !!bank, icon: 'landmark', to: '/company-settings?tab=payout' },
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
                account: 'Create your Trukkas account', birth: 'Your date of birth', phone: 'Verify your phone number', company: 'Tell us about your company',
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
              <Button type="submit" fullWidth size="lg" disabled={busy} iconRight="arrow-right">{busy ? 'Checking…' : 'Continue'}</Button>
            </form>
          )}

          {current.key === 'birth' && (
            <form className={styles.form} onSubmit={(event) => {
              event.preventDefault();
              const birth = new Date(`${form.dateOfBirth}T00:00:00`);
              const adult = new Date();
              adult.setFullYear(adult.getFullYear() - 18);
              if (!form.dateOfBirth || Number.isNaN(birth.getTime()) || birth > adult) { setError('You must be at least 18 years old to register.'); return; }
              go(2);
            }}>
              <TextField label="Date of birth" type="date" autoComplete="bday" required value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" fullWidth size="lg" iconRight="arrow-right">Continue</Button>
            </form>
          )}

          {current.key === 'phone' && (
            form.phoneEntered ? (
              <VerifyStep
                channel="sms" target={form.phone.trim()} sessionToken={sessionToken}
                onVerified={createAccount}
                onChangeTarget={() => setForm({ ...form, phoneEntered: false })}
              />
            ) : (
              <form className={styles.form} onSubmit={sendPhoneCode}>
                <p className={styles.lead}>We use your phone for sign-in codes, PIN resets and important trip alerts.</p>
                <TextField label="Mobile Number" type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 803 000 0000" />
                {error && <p className={styles.error}>{error}</p>}
                <Button type="submit" fullWidth size="lg" disabled={busy} icon="message-square">{busy ? 'Sending…' : 'Send Code'}</Button>
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
              </div>
              <div>
                <span className={styles.label}>Director details</span>
                <p className={styles.lead} style={{ marginBottom: 12 }}>The director operating this account. Their NIN, BVN and government ID are verified in the next step.</p>
                <div className={styles.two}>
                  <TextField label="Director’s Full Name" required value={biz.directorName} onChange={(e) => setBiz({ ...biz, directorName: e.target.value })} placeholder="As on their government ID" />
                  <TextField label="Date of Birth" type="date" required value={biz.directorDob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBiz({ ...biz, directorDob: e.target.value })} />
                  <Select label="Director’s Role" value={biz.role} options={['Director', 'Managing Director', 'CEO / Founder', 'Executive Director']} onChange={(e) => setBiz({ ...biz, role: e.target.value })} />
                </div>
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
              <ComplianceChecklist title="Business Documents" requirements={COMPANY_REQUIREMENTS} docs={companyDocs} unavailable={!documents} onUpload={(req) => setUploadType(req.type)} style={{ boxShadow: 'none' }} />
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
              ) : <p className="tk-meta">{truckData ? 'No trucks added yet.' : '—'}</p>}
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
                {bank
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />{bank.bankName} •••• {bank.last4} · {bank.accountName}</span>
                  : <BankAccountForm requirePin={false} submitLabel="Save Bank Account" banks={banks || []} resolveAccount={resolveAccount} saveAccount={saveAccount} />}
              </section>
              <section className={styles.block}>
                <h3><Icon name="lock-keyhole" size={17} /> Transaction PIN</h3>
                {security?.pin?.set
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />PIN created. You’ll use it to approve payouts, withdrawals and bank changes.</span>
                  : <PinForm mode="create" phone={account?.phone} savePin={async () => { throw new Error('The API accepts a 4-digit transaction PIN; this form uses 6 digits. PIN creation is unavailable until these contracts match.'); }} onDone={() => {}} />}
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
              {error && <p className={styles.error}>{error}</p>}
              <Button fullWidth size="lg" icon="layout-dashboard" disabled={busy} onClick={finish}>{busy ? 'Opening dashboard…' : 'Go to Dashboard'}</Button>
            </div>
          )}
        </Card>
        {step > 0 && step < 3 && <button type="button" className={styles.back} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
        {step > 3 && step < 7 && <button type="button" className={styles.back} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
      </section>

      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="company" ownerId={account?.id} ownerLabel={account?.companyName}
        requirements={COMPANY_REQUIREMENTS} initialType={uploadType} submitDocument={submitDocument} onDone={() => setUploadType(null)}
      />
    </main>
  );
}

