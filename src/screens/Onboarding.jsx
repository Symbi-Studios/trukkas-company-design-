'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Badge, Banner, Button, Card, Checkbox, Icon, Logo, SectionCard, Select, TextField,
} from '../ds.js';
import {
  useCheckAccountEmailMutation, useStartAccountRegistrationMutation, useResendAccountCodeMutation,
  useVerifyAccountPhoneMutation, useSignUpAccountMutation, useSaveOnboardingCompanyMutation, useFinishCompanyOnboardingMutation,
  useLazyGetOnboardingStatusQuery, useRetryCompanyVerificationMutation, authFailureCode,
} from '../store/features/auth/authApi.js';
import {
  useGetOnboardingDocumentsQuery, useUploadOnboardingDocumentMutation, useGetOnboardingTrucksQuery,
  useGetOnboardingBanksQuery, useResolveOnboardingBankMutation, useGetOnboardingBankQuery,
  useSaveOnboardingBankMutation, useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation,
  useAddOnboardingTruckMutation, ONBOARDING_REQUIREMENTS, UNSUPPORTED_ONBOARDING_DOCUMENTS,
} from '../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { isAdultDate } from '../store/features/auth/onboardingContracts.js';
import { complianceFor, documentsFor } from '../domain/documents.js';
import { VEHICLE_CLASSES } from '../domain/vehicles.js';
import { maskEmail, maskPhone, passwordStrength } from '../domain/security.js';
import { CodeInput, PasswordStrength } from '../components/SecurityInputs.jsx';
import { CompanyAccountModal } from '../components/CompanyAccountModal.jsx';
import { DirectorVerificationFields } from '../components/DirectorVerificationPanel.jsx';
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

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];
const REGIONS = ['South West', 'South South', 'South East', 'North Central', 'North West', 'North East', 'Cross-border (ECOWAS)'];
const FLEET_SIZES = ['1–5 trucks', '6–20 trucks', '21–50 trucks', '51–100 trucks', '100+ trucks'];
function secondsUntil(timestamp, now = Date.now()) {
  return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - now) / 1000)) : null;
}

function otpExpiryCopy(expiresAt, now) {
  const seconds = secondsUntil(expiresAt, now);
  if (seconds === null) return '—';
  if (seconds < 60) return seconds ? 'less than a minute' : 'expired';
  const minutes = Math.ceil(seconds / 60);
  return 'about ' + minutes + ' minute' + (minutes === 1 ? '' : 's');
}

/** Enter the server-issued code and follow the expiry and resend window returned by the API. */
function VerifyStep({ channel, target, sessionToken, otp, onVerified, onChangeTarget, onBusyChange }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCode, { isLoading: resending }] = useResendAccountCodeMutation();
  const [verifyPhone] = useVerifyAccountPhoneMutation();
  const verifying = useRef(false);
  const verified = useRef(false);
  const sending = useRef(false);
  const [otpLength, setOtpLength] = useState(otp.length);
  const [expiresAt, setExpiresAt] = useState(otp.expiresAt);
  const [resendAt, setResendAt] = useState(otp.resendAvailableAt);
  const [remainingResends, setRemainingResends] = useState(otp.remainingResends);
  const [remainingAttempts, setRemainingAttempts] = useState(otp.remainingAttempts);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    onBusyChange(busy || resending);
    return () => onBusyChange(false);
  }, [busy, resending, onBusyChange]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const effectiveExpiry = Math.min(expiresAt, otp.sessionExpiresAt);
  const expired = clock >= effectiveExpiry || remainingAttempts === 0;
  const left = secondsUntil(resendAt, clock) ?? 0;
  const codePattern = new RegExp('^\\d{' + otpLength + '}$');
  useEffect(() => {
    if (expired && !verified.current) {
      setError(remainingAttempts === 0 ? 'No verification attempts remain. Request a new code.'
        : clock >= otp.sessionExpiresAt ? 'This verification session has expired. Start phone verification again.'
          : 'This code has expired. Request a new code.');
    }
  }, [expired, remainingAttempts, clock, otp.sessionExpiresAt]);

  async function send() {
    if (Date.now() < resendAt || remainingResends <= 0 || sending.current || resending || verifying.current || verified.current || Date.now() >= otp.sessionExpiresAt) return;
    sending.current = true;
    setError('');
    try {
      const result = await resendCode({ sessionToken }).unwrap();
      setCode('');
      setOtpLength(result.otp.length);
      setExpiresAt(result.otp.expiresAt);
      setResendAt(result.otp.resendAvailableAt);
      setRemainingResends(result.otp.remainingResends);
      setRemainingAttempts(result.otp.remainingAttempts);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { sending.current = false; }
  }

  async function verify(value = code) {
    if (verifying.current || sending.current || resending || !codePattern.test(value)) return;
    if (!verified.current && (Date.now() >= effectiveExpiry || remainingAttempts === 0)) {
      setError(remainingAttempts === 0 ? 'No verification attempts remain. Request a new code.' : 'This code has expired. Request a new code.');
      return;
    }
    verifying.current = true;
    setBusy(true); setError('');
    try {
      if (!verified.current) {
        await verifyPhone({ sessionToken, code: value }).unwrap();
        verified.current = true;
      }
      await onVerified();
    } catch (err) {
      if (Number.isSafeInteger(err?.remainingAttempts) && err.remainingAttempts >= 0) setRemainingAttempts(err.remainingAttempts);
      setError(getApiErrorMessage(err));
    } finally { verifying.current = false; setBusy(false); }
  }

  return (
    <div className={styles.verify}>
      <span className={styles.verifyIcon}><Icon name={channel === 'email' ? 'mail' : 'message-square'} size={26} /></span>
      <p className={styles.lead}>We sent a {otpLength}-digit code to <strong>{channel === 'email' ? maskEmail(target) : maskPhone(target)}</strong>. It expires in {otpExpiryCopy(effectiveExpiry, clock)}.</p>
      <CodeInput length={otpLength} autoFocus value={code} onChange={setCode} onComplete={(v) => verify(v)} error={error} disabled={busy || resending || (expired && !verified.current)} />
      <div className={styles.verifyActions}>
        <Button variant="ghost" disabled={left > 0 || remainingResends <= 0 || resending || busy || verified.current || clock >= otp.sessionExpiresAt} onClick={send}>
          {remainingResends <= 0 ? 'No resends left' : left > 0 ? 'Resend in ' + left + 's' : 'Resend code'}
        </Button>
        <Button variant="ghost" disabled={busy || resending || verified.current} onClick={onChangeTarget}>{channel === 'email' ? 'Change email' : 'Change number'}</Button>
      </div>
      <Button fullWidth disabled={busy || resending || !codePattern.test(code) || (expired && !verified.current)} onClick={() => verify()}>{busy ? 'Verifying…' : 'Verify'}</Button>
    </div>
  );
}

export function Onboarding() {
  const router = useRouter();
  const account = useSelector((state) => state.auth.account);
  const [signUpAccount] = useSignUpAccountMutation();
  const [checkEmail] = useCheckAccountEmailMutation();
  const [startRegistration] = useStartAccountRegistrationMutation();
  const [saveCompany] = useSaveOnboardingCompanyMutation();
  const [finishOnboarding] = useFinishCompanyOnboardingMutation();
  const [loadOnboardingStatus] = useLazyGetOnboardingStatusQuery();
  const [retryCompanyVerification, { isLoading: retryingCompany }] = useRetryCompanyVerificationMutation();
  const [addTruck] = useAddOnboardingTruckMutation();
  const [uploadDocument] = useUploadOnboardingDocumentMutation();
  const [resolveBank] = useResolveOnboardingBankMutation();
  const [saveBank] = useSaveOnboardingBankMutation();
  const [saveTransactionPin] = useSaveOnboardingPinMutation();
  const { currentData: loadedDocuments, error: documentsError } = useGetOnboardingDocumentsQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const documentData = documentsError ? undefined : loadedDocuments;
  const documents = documentData?.documents;
  const { currentData: loadedTrucks, error: trucksError } = useGetOnboardingTrucksQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { currentData: loadedBanks, error: banksError } = useGetOnboardingBanksQuery(undefined, { skip: !account });
  const { currentData: loadedBank, error: bankError } = useGetOnboardingBankQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const { currentData: loadedSecurity, error: securityError } = useGetOnboardingSecurityQuery(undefined, { skip: !account, refetchOnMountOrArgChange: true });
  const truckData = trucksError ? undefined : loadedTrucks;
  const banks = banksError ? undefined : loadedBanks;
  const bank = bankError ? undefined : loadedBank;
  const security = securityError ? undefined : loadedSecurity;
  const trucks = truckData || [];

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false, phone: '+234 ', dateOfBirth: '' });
  const [sessionToken, setSessionToken] = useState(null);
  const [otp, setOtp] = useState(null);
  const [biz, setBiz] = useState({ name: '', rcNumber: '', entity: 'Limited Liability Company', founded: '', email: '', phone: '', address: '', state: 'Lagos', fleetSize: '', regions: [], operatingStates: null, role: 'Director', directorName: '', directorDob: '' });
  const [truck, setTruck] = useState({ plate: '', vehicleClass: 'Head', make: '', model: '', year: '' });
  const [uploadType, setUploadType] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [companyOffer, setCompanyOffer] = useState(null);

  const resolveAccount = useCallback(async (bankCode, accountNumber) => {
    try {
      const selected = banks?.find((item) => item.code === bankCode);
      if (!selected) throw new Error('Choose a bank from the supported bank list.');
      const resolved = await resolveBank({ bankName: selected.name, accountNumber }).unwrap();
      if (!resolved.accountName || resolved.accountName === '—') throw new Error('We couldn’t confirm the account name. Check the bank details and try again.');
      return resolved;
    } catch (err) { throw new Error(getApiErrorMessage(err)); }
  }, [banks, resolveBank]);

  async function saveAccount({ bankCode, accountNumber }) {
    setBusy(true);
    try {
      if (bank !== null) throw new Error('We couldn’t confirm your current payout account. Please refresh this page.');
      const selected = banks?.find((item) => item.code === bankCode);
      if (!selected) throw new Error('Choose a bank from the supported bank list.');
      const saved = await saveBank({ bankName: selected.name, accountNumber }).unwrap();
      if (!saved) throw new Error('We couldn’t confirm that your bank account was saved. Check your payout details before trying again.');
      return saved;
    } catch (err) { throw new Error(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function submitDocument(document) {
    try { return await uploadDocument(document).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }

  async function savePin(values) {
    setBusy(true);
    try {
      if (security?.pin?.set !== false) throw new Error('We couldn’t confirm your current PIN status. Please refresh this page before creating a PIN.');
      return await saveTransactionPin(values).unwrap();
    }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  // Resume company setup without collecting or persisting a password again.
  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    const resumeStep = (progress) => {
      if (progress.onboardingComplete === true || progress.onboardingStep === 'AWAITING_REVIEW'
        || (progress.onboardingStep === 'APPLICATION_REJECTED' && progress.kycStatus !== 'REJECTED')) {
        router.replace('/dashboard');
        return;
      }
      setStep(progress.kycStatus === 'REJECTED' || progress.onboardingStep === 'APPLICATION_REJECTED' ? 4
        : ({ ADD_TRUCKS: 5, SUBMIT_FOR_REVIEW: 7 })[progress.onboardingStep] ?? 3);
      setBiz((value) => ({ ...value, ...(progress.onboardingCompany || {}) }));
    };
    setStep(account.kycStatus === 'REJECTED' || account.onboardingStep === 'APPLICATION_REJECTED' ? 4
      : ({ ADD_TRUCKS: 5, SUBMIT_FOR_REVIEW: 7 })[account.onboardingStep] ?? 3);
    setBiz((value) => ({ ...value, ...(account.onboardingCompany || {}) }));
    setBusy(true);
    loadOnboardingStatus().unwrap().then((progress) => {
      if (cancelled) return;
      resumeStep(progress);
    }).catch((err) => { if (!cancelled) setError(getApiErrorMessage(err)); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = STEPS[step];
  const canContinueAccount = form.name.trim().split(/\s+/).length >= 2
    && /^\S+@\S+\.\S+$/.test(form.email)
    && form.password.length >= 8
    && passwordStrength(form.password).score >= 3
    && form.password === form.confirm
    && form.terms;
  const isValidRegistrationPhone = /^\+234\d{10}$/.test(form.phone.replace(/\s/g, ''));
  const go = (index) => {
    if (index < 2) { setSessionToken(null); setForm((value) => ({ ...value, phoneEntered: false })); }
    setError(''); setStep(index); window.scrollTo({ top: 0 });
  };
  const companyDocs = documentsFor(documents || [], 'company');
  const compliance = complianceFor(ONBOARDING_REQUIREMENTS, companyDocs).summary;
  const companyComplianceAvailable = documentData?.complianceAvailable === true;

  async function submitAccount(event) {
    event.preventDefault();
    setError('');
    if (form.name.trim().split(/\s+/).length < 2) { setError('Enter your first and last name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (passwordStrength(form.password).score < 3) { setError('Choose a stronger password.'); return; }
    if (form.password !== form.confirm) { setError('Passwords don’t match.'); return; }
    if (!form.terms) { setError('Accept the terms to continue.'); return; }
    if (busy || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const availability = await checkEmail({ email: form.email }).unwrap();
      if (availability.available === false) { setCompanyOffer({ email: form.email.trim() }); return; }
      if (availability.available !== true) { setError('Email availability could not be confirmed. Try again.'); return; }
      go(1);
    } catch (err) {
      if (authFailureCode(err) === 'EMAIL_ALREADY_REGISTERED') setCompanyOffer({ email: form.email.trim() });
      else setError(getApiErrorMessage(err));
    }
    finally { submitting.current = false; setBusy(false); }
  }

  function continueCompanySetup(result) {
    setCompanyOffer(null);
    setSessionToken(null);
    setForm((value) => ({ ...value, password: '', confirm: '', phoneEntered: false }));
    const company = result.account;
    if (company.onboardingComplete === true || company.onboardingStep === 'AWAITING_REVIEW') {
      router.replace('/dashboard');
      return;
    }
    if (company.kycStatus === 'REJECTED' || company.onboardingStep === 'APPLICATION_REJECTED') {
      setBiz((value) => ({ ...value, ...(company.onboardingCompany || {}) }));
      setStep(4);
      return;
    }
    const saved = company.onboardingCompany;
    setBiz((value) => ({ ...value, ...saved,
      email: saved?.email || company.email, phone: saved?.phone || company.phone,
      directorName: saved?.directorName || '',
      directorDob: saved?.directorDob || '',
    }));
    go(({ ADD_TRUCKS: 5, SUBMIT_FOR_REVIEW: 7 })[company.onboardingStep] ?? 3);
  }

  async function createAccount() {
    const result = await signUpAccount({ name: form.name, email: form.email, password: form.password, dateOfBirth: form.dateOfBirth, sessionToken, acceptedTerms: form.terms }).unwrap();
    if (result.companyAccountRequired) { setCompanyOffer({ email: form.email.trim() }); return; }
    continueCompanySetup(result);
  }

  async function sendPhoneCode(event) {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (!isValidRegistrationPhone) { setError('Enter a valid Nigerian mobile number, e.g. +234 803 000 0000.'); return; }
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const result = await startRegistration({ phone: form.phone }).unwrap();
      if (result.companyAccountRequired) { setCompanyOffer({ email: form.email.trim() }); return; }
      if (typeof result.sessionToken !== 'string' || !result.sessionToken.trim()) throw new Error('We couldn’t start phone verification. Please try again.');
      setSessionToken(result.sessionToken);
      setOtp({ ...result.otp, sessionExpiresAt: result.sessionExpiresAt });
      setForm((value) => ({ ...value, phoneEntered: true }));
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  async function retryRejectedCompany() {
    if (retryingCompany) return;
    setError('');
    try { await retryCompanyVerification().unwrap(); router.replace('/dashboard'); }
    catch (err) { setError(getApiErrorMessage(err)); }
  }

  async function submitCompany(event) {
    event.preventDefault();
    if (busy || submitting.current) return;
    setError('');
    if (!biz.name.trim() || !biz.rcNumber.trim() || !biz.address.trim()) { setError('Company name, RC/BN number and address are required.'); return; }
    if (!biz.directorName.trim() || !biz.directorDob) { setError('Enter the director’s full name and date of birth.'); return; }
    submitting.current = true;
    setBusy(true);
    try {
      const saved = await saveCompany(biz).unwrap();
      setBiz((value) => ({ ...value, ...saved.onboardingCompany }));
      go(4);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  async function submitTruck(event) {
    event.preventDefault();
    if (busy || submitting.current) return;
    setError('');
    if (!truck.plate.trim() || !truck.make.trim() || !truck.model.trim() || !truck.year) { setError('Enter plate, make, model and year.'); return; }
    submitting.current = true;
    setBusy(true);
    try {
      await addTruck(truck).unwrap();
      setTruck({ plate: '', vehicleClass: 'Head', make: '', model: '', year: '' });
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }

  async function finish() {
    if (busy || submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      await finishOnboarding({ acceptedTerms: form.terms || account?.registrationTermsConsent === true }).unwrap();
      router.replace('/dashboard');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { submitting.current = false; setBusy(false); }
  }
  const checklist = [
    { label: 'Phone verified', done: account?.phoneVerified === true, icon: 'badge-check' },
    { label: 'Company details', done: step >= 4, icon: 'building-2' },
    { label: `Company documents (${companyComplianceAvailable ? compliance.requiredMet : '—'}/${companyComplianceAvailable ? compliance.requiredTotal : '—'})`, done: companyComplianceAvailable && compliance.complete, icon: 'file-check', to: '/documents' },
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
              <Button type="submit" fullWidth size="lg" disabled={busy || !canContinueAccount} iconRight="arrow-right">{busy ? 'Checking…' : 'Continue'}</Button>
            </form>
          )}

          {current.key === 'birth' && (
            <form className={styles.form} onSubmit={(event) => {
              event.preventDefault();
              if (!isAdultDate(form.dateOfBirth)) { setError('You must be at least 18 years old to register.'); return; }
              go(2);
            }}>
              <TextField label="Date of birth" type="date" autoComplete="bday" required value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" fullWidth size="lg" disabled={!isAdultDate(form.dateOfBirth)} iconRight="arrow-right">Continue</Button>
            </form>
          )}

          {current.key === 'phone' && (
            form.phoneEntered ? (
              <VerifyStep
                key={sessionToken} channel="sms" target={form.phone.trim()} sessionToken={sessionToken} otp={otp}
                onVerified={createAccount} onBusyChange={setBusy}
                onChangeTarget={() => setForm({ ...form, phoneEntered: false })}
              />
            ) : (
              <form className={styles.form} onSubmit={sendPhoneCode}>
                <p className={styles.lead}>We use your phone for sign-in codes, PIN resets and important trip alerts.</p>
                <TextField label="Mobile Number" type="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 803 000 0000" />
                {error && <p className={styles.error}>{error}</p>}
                <Button type="submit" fullWidth size="lg" disabled={busy || !isValidRegistrationPhone} icon="message-square">{busy ? 'Sending…' : 'Send Code'}</Button>
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
                <p className={styles.lead} style={{ marginBottom: 12 }}>The director operating this account. Their NIN or BVN is submitted for manual review. Upload the director’s government ID below.</p>
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
                      <button key={r} type="button" aria-pressed={on} className={on ? styles.chipOn : ''} onClick={() => setBiz({ ...biz, operatingZonesKnown: true, regions: on ? biz.regions.filter((x) => x !== r) : [...biz.regions, r] })}>
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
              {account?.kycStatus === 'REJECTED' && (
                <Banner tone="warning" title="Company verification was rejected">
                  <p>{account.kycRejectionReason || 'Review the company details, then retry verification.'}</p>
                  <div className={styles.footer}>
                    <Button variant="outline" disabled={retryingCompany} onClick={() => go(3)}>Review company details</Button>
                    <Button disabled={retryingCompany} onClick={retryRejectedCompany}>{retryingCompany ? 'Resubmitting…' : 'Retry verification'}</Button>
                  </div>
                </Banner>
              )}
              <SectionCard title="Director identity verification" description="Submit the director’s NIN, BVN, or both for manual review by Trukkas.">
                <DirectorVerificationFields />
              </SectionCard>
              <ComplianceChecklist title="Business Documents" requirements={ONBOARDING_REQUIREMENTS} docs={companyDocs} unavailable={!companyComplianceAvailable} unavailableTypes={UNSUPPORTED_ONBOARDING_DOCUMENTS} onUpload={(req) => setUploadType(req.type)} style={{ boxShadow: 'none' }} />
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
                <Button type="submit" icon="plus" disabled={busy}>Add</Button>
              </form>
              {(error || trucksError) && <p className={styles.error}>{error || getApiErrorMessage(trucksError)}</p>}
              {trucks.length > 0 ? (
                <ul className={styles.truckList}>
                  {trucks.map((t) => (
                    <li key={t.plate}><Icon name="truck" size={18} color="var(--tk-blue)" /><strong>{t.plate}</strong><span>{t.makeModel}</span><Badge tone="warning">Documents pending</Badge></li>
                  ))}
                </ul>
              ) : <p className="tk-meta">{truckData ? 'No trucks added yet.' : '—'}</p>}
              <div className={styles.footer}>
                <Button variant="outline" disabled={busy} onClick={() => go(6)}>{trucks.length ? 'Continue' : 'Skip, add later'}</Button>
                {trucks.length > 0 && <Button iconRight="arrow-right" disabled={busy} onClick={() => go(6)}>Continue</Button>}
              </div>
            </div>
          )}

          {current.key === 'payout' && (
            <div className={styles.form}>
              <section className={styles.block}>
                <h3><Icon name="landmark" size={17} /> Payout bank account</h3>
                {bank
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />{bank.bankName} •••• {bank.last4} · {bank.accountName}</span>
                  : <BankAccountForm requirePin={false} disabled={busy || bank !== null || !!banksError} loadError={bankError || banksError ? getApiErrorMessage(bankError || banksError) : ''} submitLabel="Save Bank Account" banks={banks || []} resolveAccount={resolveAccount} saveAccount={saveAccount} />}
              </section>
              <section className={styles.block}>
                <h3><Icon name="lock-keyhole" size={17} /> Transaction PIN</h3>
                {security?.pin?.set
                  ? <span className={styles.okLine}><Icon name="circle-check" size={16} />PIN created. You’ll use it to approve payouts, withdrawals and bank changes.</span>
                  : <PinForm mode="create" disabled={busy || security?.pin?.set !== false} loadError={securityError ? getApiErrorMessage(securityError) : ''} phone={account?.phone} savePin={savePin} onDone={() => {}} />}
              </section>
              <div className={styles.footer}>
                <Button variant="outline" disabled={busy} onClick={() => go(7)}>Skip for now</Button>
                <Button iconRight="arrow-right" disabled={busy} onClick={() => go(7)}>Continue</Button>
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
        {step > 0 && step < 3 && <button type="button" className={styles.back} disabled={busy} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
        {step > 3 && step < 7 && <button type="button" className={styles.back} disabled={busy} onClick={() => go(step - 1)}><Icon name="arrow-left" size={14} /> Back</button>}
      </section>

      {companyOffer && <CompanyAccountModal {...companyOffer} onClose={() => setCompanyOffer(null)} onComplete={continueCompanySetup} />}
      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="company" ownerId={account?.id} ownerLabel={account?.companyName}
        requirements={ONBOARDING_REQUIREMENTS} initialType={uploadType} submitDocument={submitDocument} onDone={() => setUploadType(null)}
      />
    </main>
  );
}

