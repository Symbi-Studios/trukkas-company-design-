'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Card, Logo, TextField } from '../ds.js';
import {
  useForgotAccountPasswordMutation,
  useLoginAccountMutation,
  useResetAccountPasswordMutation,
} from '../store/features/auth/authApi.js';
import { clearSession } from '../store/features/auth/authSlice.js';
import { baseApi } from '../store/api/baseApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { MOCK_CREDENTIALS } from '../mock/fixtures/account.js';
import styles from './AuthScreens.module.css';

function AuthFrame({ eyebrow, title, description, children }) {
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

function Notice({ message, error = false }) {
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
    if (['/login', '/forgot-password', '/reset-password'].includes(destination.pathname)) {
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

  React.useEffect(() => {
    if (account) {
      router.replace(destinationAfterLogin());
      return;
    }
    if (new URLSearchParams(window.location.search).get('reset') === '1') {
      setNotice('Password updated. Sign in with your new password.');
    }
  }, [account, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    try {
      await loginAccount({ email: email.trim(), password }).unwrap();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
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
          placeholder={MOCK_CREDENTIALS.email}
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
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState('');
  const [forgotAccountPassword, { isLoading: busy }] = useForgotAccountPasswordMutation();
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    try {
      await forgotAccountPassword({ email: email.trim() }).unwrap();
      setSent(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Forgot your password?"
      description="Enter your email. If it is registered, we’ll send a reset link."
    >
      <Notice message={error} error />
      {sent ? (
        <div className={styles.form}>
          <Notice message="If that email is registered, a reset link has been sent. Check your inbox." />
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
            placeholder={MOCK_CREDENTIALS.email}
          />
          <Button type="submit" fullWidth disabled={busy}>
            {busy ? 'Sending link…' : 'Send reset link'}
          </Button>
        </form>
      )}
      <div className={styles.bottomLinks}>
        <Link href="/login">Back to sign in</Link>
        <Link href="/reset-password">Have a reset token?</Link>
      </div>
    </AuthFrame>
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [resetAccountPassword, { isLoading: busy }] = useResetAccountPasswordMutation();
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setToken(params.get('token') || '');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !token.trim() || !newPassword) {
      setError('Enter your email, reset token, and new password.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    try {
      await resetAccountPassword({ email: email.trim(), token: token.trim(), newPassword }).unwrap();
      dispatch(clearSession());
      dispatch(baseApi.util.resetApiState());
      router.replace('/login?reset=1');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Set a new password"
      description="Use the token from your Trukkas password reset email."
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
          placeholder={MOCK_CREDENTIALS.email}
        />
        <TextField
          label="Reset token"
          type="text"
          name="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          required
          aria-required="true"
          disabled={busy}
          placeholder="Paste the token from your email"
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
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Updating password…' : 'Reset password'}
        </Button>
      </form>
      <div className={styles.bottomLinks}>
        <Link href="/login">Back to sign in</Link>
      </div>
    </AuthFrame>
  );
}
