'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Card, Logo, TextField } from '../ds.js';
import {
  authFailureCode,
  useForgotAccountPasswordMutation,
  useLoginAccountMutation,
  useResetAccountPasswordMutation,
  useVerifyTwoFactorLoginMutation,
} from '../store/features/auth/authApi.js';
import { clearSession } from '../store/features/auth/authSlice.js';
import { baseApi } from '../store/api/baseApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { maskPhone } from '../domain/security.js';
import { CodeInput } from '../components/SecurityInputs.jsx';
import { CompanyAccountModal } from '../components/CompanyAccountModal.jsx';
import styles from './AuthScreens.module.css';

export function AuthFrame({ eyebrow, title, description, children }) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Logo />
        <Card className={styles.card} style={{ padding: 'clamp(24px, 5vw, 32px)' }}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
        </Card>
        <p className={styles.footer}>Trukkas for Trucking Companies</p>
      </div>
    </main>
  );
}

export function Notice({ message, error = false }) {
  if (!message) return null;
  return (
    <p className={error ? styles.error : styles.success} role={error ? 'alert' : 'status'}>
      {message}
    </p>
  );
}

function destinationAfterLogin() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  try {
    const destination = new URL(next, window.location.origin);
    if (destination.origin !== window.location.origin) return '/dashboard';
    if (['/login', '/forgot-password', '/reset-password', '/signup', '/accept-invite', '/join-team'].includes(destination.pathname)) {
      return '/dashboard';
    }
    return destination.pathname + destination.search + destination.hash;
  } catch {
    return '/dashboard';
  }
}

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginAccount, { isLoading: busy }] = useLoginAccountMutation();
  const account = useSelector((state) => state.auth.account);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [challenge, setChallenge] = React.useState(null);
  const [challengeExpired, setChallengeExpired] = React.useState(false);
  const [companyOffer, setCompanyOffer] = React.useState(null);
  const verifyingCode = React.useRef(false);
  const submittingLogin = React.useRef(false);
  const [code, setCode] = React.useState('');
  const [useBackup, setUseBackup] = React.useState(false);
  const [verifyTwoFactorLogin, { isLoading: verifying }] = useVerifyTwoFactorLoginMutation();

  React.useEffect(() => {
    if (!challenge) return undefined;
    const expiry = Date.parse(challenge.expiresAt);
    const expire = () => { setChallengeExpired(true); setCode(''); setError('This sign-in code expired. Sign in again to request a new one.'); };
    if (!Number.isFinite(expiry) || expiry <= Date.now()) { expire(); return undefined; }
    const timer = setTimeout(expire, expiry - Date.now());
    return () => clearTimeout(timer);
  }, [challenge]);

  React.useEffect(() => {
    if (account) {
      const needsCompanySetup = account.onboardingComplete === false && !['AWAITING_REVIEW', 'APPLICATION_REJECTED'].includes(account.onboardingStep);
      router.replace(needsCompanySetup ? '/signup' : destinationAfterLogin());
      return;
    }
    if (new URLSearchParams(window.location.search).get('reset') === '1') {
      setNotice('Password updated. Sign in with your new password.');
    }
  }, [account, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || submittingLogin.current || companyOffer) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    try {
      submittingLogin.current = true;
      const result = await loginAccount({ email: email.trim(), password }).unwrap();
      if (result.companyAccountRequired) {
        setCompanyOffer({ email: email.trim(), availableRoles: result.availableRoles });
      } else if (result.twoFactorRequired) {
        setChallenge(result.challenge);
        setChallengeExpired(false);
        setUseBackup(false);
        setCode('');
      } else setPassword('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally { submittingLogin.current = false; }
  }

  async function handleVerify(event, value = code) {
    event?.preventDefault();
    if (verifyingCode.current || !challenge) return;
    if (!(useBackup ? /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(value.trim()) : /^\d{6}$/.test(value))) return;
    if (challengeExpired || Date.parse(challenge.expiresAt) <= Date.now()) {
      setChallengeExpired(true); setCode(''); setError('This sign-in code expired. Sign in again to request a new one.');
      return;
    }
    verifyingCode.current = true;
    setError('');
    try {
      await verifyTwoFactorLogin({ challengeId: challenge.id, ...(useBackup ? { backupCode: value } : { code: value }) }).unwrap();
      setPassword('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setCode('');
      if (authFailureCode(requestError) !== 'TWO_FACTOR_INVALID') { setChallenge(null); setChallengeExpired(false); setPassword(''); }
    } finally { verifyingCode.current = false; }
  }

  if (challenge) {
    return (
      <AuthFrame
        eyebrow="TWO-FACTOR AUTHENTICATION"
        title="Enter your code"
        description={useBackup ? 'Enter one of your 8-character backup codes.'
          : challenge.method === 'app' ? 'Open your authenticator app and enter the 6-digit code for Trukkas.'
            : `We texted a 6-digit code to ${maskPhone(challenge.phone)}.`}
      >
        <Notice message={error} error />
        <form className={styles.form} onSubmit={handleVerify}>
          {useBackup ? (
            <TextField label="Backup code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" autoFocus autoComplete="one-time-code" disabled={verifying || challengeExpired} />
          ) : (
            <CodeInput autoFocus value={code} onChange={setCode} onComplete={(v) => handleVerify(null, v)} disabled={verifying || challengeExpired} />
          )}
          <Button type="submit" fullWidth disabled={verifying || challengeExpired || !(useBackup ? /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code.trim()) : /^\d{6}$/.test(code))}>{verifying ? 'Verifying…' : 'Verify & Sign in'}</Button>
        </form>
        <div className={styles.bottomLinks}>
          <a href="#" onClick={(e) => { e.preventDefault(); if (verifyingCode.current) return; setUseBackup((v) => !v); setCode(''); }}>{useBackup ? 'Use verification code' : 'Use a backup code'}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); if (verifyingCode.current) return; setChallenge(null); setChallengeExpired(false); setPassword(''); setError(''); }}>Back to sign in</a>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="COMPANY ACCESS"
      title="Welcome back"
      description="Sign in to manage your fleet, jobs, and earnings on Trukkas."
    >
      <Notice message={notice} />
      <Notice message={error} error />
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Email address"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          aria-required="true"
          disabled={busy}
          placeholder="admin@speedlinelogistics.com"
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          aria-required="true"
          disabled={busy}
          placeholder="Enter your password"
        />
        <div className={styles.formLink}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" fullWidth disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim()) || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className={styles.signupPrompt}>New to Trukkas? <Link href="/signup">Create a company account</Link></p>
      <div className={styles.bottomLinks}>
        <Link href="/join-team">Have a team invitation?</Link>
        <Link href="/accept-invite">Activate an invited account</Link>
      </div>
      {companyOffer && <CompanyAccountModal {...companyOffer} initialPassword={password}
        onClose={() => setCompanyOffer(null)} onComplete={() => { setPassword(''); setCompanyOffer(null); }} />}
    </AuthFrame>
  );
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState('');
  const [forgotAccountPassword, { data: recovery, isLoading: busy }] = useForgotAccountPasswordMutation({ fixedCacheKey: 'password-recovery' });
  const [error, setError] = React.useState('');
  const submitting = React.useRef(false);
  const [sent, setSent] = React.useState(false);
  const [clock, setClock] = React.useState(() => Date.now());
  const cooldown = recovery?.email === email.trim().toLowerCase() && recovery.otp?.resendAt > clock;
  React.useEffect(() => {
    if (!recovery?.otp || recovery.otp.resendAt <= Date.now()) return undefined;
    const timer = setTimeout(() => setClock(Date.now()), Math.max(0, recovery.otp.resendAt - Date.now()));
    return () => clearTimeout(timer);
  }, [recovery]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (recovery?.email === email.trim().toLowerCase() && recovery.otp?.resendAt > Date.now()) return;
    setError('');
    if (!email.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    submitting.current = true;
    try {
      await forgotAccountPassword({ email: email.trim() }).unwrap();
      setClock(Date.now());
      setSent(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally { submitting.current = false; }
  }

  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Forgot your password?"
      description="Enter your email. If it is registered, we’ll send a code to your linked phone."
    >
      <Notice message={error} error />
      {sent ? (
        <div className={styles.form}>
          <Notice message="If that email is registered, a reset code has been sent. Check your linked phone." />
          <Button type="button" variant="secondary" fullWidth onClick={() => setSent(false)}>
            Use another email
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <TextField
            label="Email address"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            aria-required="true"
            disabled={busy}
            placeholder="admin@speedlinelogistics.com"
          />
          <Button type="submit" fullWidth disabled={busy || cooldown || !/^\S+@\S+\.\S+$/.test(email.trim())}>
            {busy ? 'Sending code…' : 'Send reset code'}
          </Button>
        </form>
      )}
      <div className={styles.bottomLinks}>
        <Link href="/login">Back to sign in</Link>
        <Link href="/reset-password">Have a reset code?</Link>
      </div>
    </AuthFrame>
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [resetAccountPassword, { isLoading: busy }] = useResetAccountPasswordMutation();
  const [, { data: recovery }] = useForgotAccountPasswordMutation({ fixedCacheKey: 'password-recovery' });
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState('');
  const submitting = React.useRef(false);
  const [clock, setClock] = React.useState(() => Date.now());
  const recoveryOtp = recovery?.email === email.trim().toLowerCase() ? recovery.otp : null;
  const codeUnavailable = !!recoveryOtp && (clock >= recoveryOtp.expiresAt || recoveryOtp.remainingAttempts === 0);
  React.useEffect(() => {
    if (!recoveryOtp) return undefined;
    const expired = () => { setClock(Date.now()); setError('This reset code has expired. Request a new code.'); };
    if (recoveryOtp.remainingAttempts === 0) { setError('No verification attempts remain. Request a new code.'); return undefined; }
    if (recoveryOtp.expiresAt <= Date.now()) { expired(); return undefined; }
    const timer = setTimeout(expired, recoveryOtp.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [recoveryOtp]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || recovery?.email || '');
    setToken(params.get('otp') || params.get('token') || '');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || submitting.current) return;
    setError('');
    if (recoveryOtp && (Date.now() >= recoveryOtp.expiresAt || recoveryOtp.remainingAttempts === 0)) {
      setClock(Date.now());
      setError(recoveryOtp.remainingAttempts === 0 ? 'No verification attempts remain. Request a new code.' : 'This reset code has expired. Request a new code.');
      return;
    }
    if (!email.trim() || !token.trim() || !newPassword) {
      setError('Enter your email, reset code, and new password.');
      return;
    }
    if (!/^\d{6}$/.test(token.trim())) {
      setError('Enter the 6-digit reset code from your phone.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    submitting.current = true;
    try {
      await resetAccountPassword({ email: email.trim(), token: token.trim(), newPassword }).unwrap();
      dispatch(clearSession());
      dispatch(baseApi.util.resetApiState());
      router.replace('/login?reset=1');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally { submitting.current = false; }
  }

  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Set a new password"
      description="Use the 6-digit code sent to your Trukkas account’s linked phone."
    >
      <Notice message={error} error />
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Email address"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          aria-required="true"
          disabled={busy}
          placeholder="admin@speedlinelogistics.com"
        />
        <TextField
          label="Reset code"
          type="text"
          name="token"
          inputMode="numeric"
          maxLength={6}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="one-time-code"
          required
          aria-required="true"
          disabled={busy}
          placeholder="Enter the 6-digit code from your phone"
        />
        <TextField
          label="New password"
          type="password"
          name="newPassword"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          aria-required="true"
          disabled={busy}
          placeholder="Enter a new password"
        />
        <TextField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          aria-required="true"
          disabled={busy}
          placeholder="Enter the password again"
        />
        <Button type="submit" fullWidth disabled={busy || codeUnavailable || !/^\S+@\S+\.\S+$/.test(email.trim()) || !/^\d{6}$/.test(token.trim()) || newPassword.length < 8 || newPassword !== confirmation}>
          {busy ? 'Updating password…' : 'Reset password'}
        </Button>
      </form>
      <div className={styles.bottomLinks}>
        <Link href="/login">Back to sign in</Link>
      </div>
    </AuthFrame>
  );
}
