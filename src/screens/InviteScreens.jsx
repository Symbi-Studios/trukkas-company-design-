'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Button, Icon, TextField } from '../ds.js';
import { AuthFrame, Notice } from './AuthScreens.jsx';
import { useAcceptAccountInviteMutation, useRedeemCompanyInviteMutation } from '../store/features/auth/authApi.js';
import { clearSession } from '../store/features/auth/authSlice.js';
import { baseApi } from '../store/api/baseApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import authStyles from './AuthScreens.module.css';
import styles from './InviteScreens.module.css';

function InviteScreen({ team = false }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [acceptInvite, { isLoading: activating }] = useAcceptAccountInviteMutation();
  const [redeemInvite, { isLoading: joining }] = useRedeemCompanyInviteMutation();
  const submitting = React.useRef(false);
  const [email, setEmail] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState('');
  const [complete, setComplete] = React.useState(false);
  const busy = activating || joining;

  React.useEffect(() => {
    const invitedEmail = new URLSearchParams(window.location.search).get('email');
    if (invitedEmail && /^\S+@\S+\.\S+$/.test(invitedEmail.trim())) setEmail(invitedEmail.trim());
  }, []);

  const identityReady = team
    ? firstName.trim() && lastName.trim() && /^(?:\+234|0)\d{10}$/.test(phone.replace(/[\s()-]/g, ''))
    : /^\S+@\S+\.\S+$/.test(email.trim());
  const validCode = team ? !!code.trim() : code.trim().length === 8;
  const ready = identityReady && validCode && password.length >= 8 && password === confirmation;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || busy || complete) return;
    setError('');
    if (!ready) {
      setError(password !== confirmation ? 'The passwords do not match.' : 'Complete your details and use a password with at least 8 characters.');
      return;
    }
    submitting.current = true;
    try {
      if (team) {
        await redeemInvite({ code, firstName, lastName, phone, password }).unwrap();
        setPassword(''); setConfirmation(''); setCode('');
        setComplete(true);
        router.replace('/dashboard');
      } else {
        await acceptInvite({ email, code, newPassword: password }).unwrap();
        setPassword(''); setConfirmation(''); setCode('');
        dispatch(clearSession());
        dispatch(baseApi.util.resetApiState());
        setComplete(true);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally { submitting.current = false; }
  }

  if (complete) {
    return (
      <AuthFrame
        eyebrow={team ? 'WELCOME TO YOUR TEAM' : 'ACCOUNT ACTIVATED'}
        title={team ? "You're in" : "You're ready to sign in"}
        description={team ? 'Your login is ready. Opening your company workspace.' : 'Your password is set. Sign in to continue setting up your company account.'}
      >
        <div className={styles.successMark}><Icon name="circle-check" size={28} /></div>
        <Button fullWidth iconRight="arrow-right" onClick={() => router.replace(team ? '/dashboard' : '/login')}>
          {team ? 'Open your workspace' : 'Continue to sign in'}
        </Button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow={team ? 'YOUR TEAM IS WAITING' : 'COMPANY INVITATION'}
      title={team ? 'Join your company' : 'Activate your account'}
      description={team ? 'Create your login to access your company workspace.' : 'Your company account has been created. Set a password to make it yours.'}
    >
      <div className={styles.inviteNote}>
        <Icon name={team ? 'users' : 'shield-check'} size={19} />
        <p>{team ? 'Use the invite code sent to your email. Your company admin has already assigned your access.' : 'Use the 8-character code sent to your email or phone.'}</p>
      </div>
      <Notice message={error} error />
      <form className={authStyles.form} onSubmit={submit}>
        {team ? (
          <>
            {email && <TextField label="Invited email" type="email" value={email} readOnly autoComplete="email" />}
            <div className={styles.nameFields}>
              <TextField label="First name" name="firstName" autoComplete="given-name" autoFocus required value={firstName} disabled={busy} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" />
              <TextField label="Last name" name="lastName" autoComplete="family-name" required value={lastName} disabled={busy} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" />
            </div>
            <TextField label="Phone number" type="tel" name="phone" autoComplete="tel" required value={phone} disabled={busy} onChange={(event) => setPhone(event.target.value)} placeholder="+234" hint="Use your Nigerian mobile number." />
          </>
        ) : (
          <TextField label="Invited email" type="email" name="email" autoComplete="username" autoFocus required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} placeholder="Your invited email address" />
        )}
        <TextField label="Invite code" name="code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} required maxLength={team ? undefined : 8} value={code} disabled={busy} onChange={(event) => setCode(event.target.value)} placeholder={team ? 'Paste your team invite code' : 'Enter your 8-character code'} />
        <TextField label="Create password" type="password" name="newPassword" autoComplete="new-password" required value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" hint="Use at least 8 characters." />
        <TextField label="Confirm password" type="password" name="confirmPassword" autoComplete="new-password" required value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter your password again" />
        <Button type="submit" fullWidth iconRight="arrow-right" disabled={busy || !ready}>
          {busy ? team ? 'Joining your team...' : 'Activating your account...' : team ? 'Join company' : 'Activate account'}
        </Button>
      </form>
      <p className={styles.expiryNote}>{team ? 'Invites expire after 24 hours. Ask your company admin for a new code if yours has expired.' : 'Invites expire after 7 days. Contact Trukkas support if your code has expired or is locked.'}</p>
      <div className={authStyles.bottomLinks}>
        <Link href="/login">Already activated? Sign in</Link>
        <Link href={team ? '/accept-invite' : '/join-team'}>{team ? 'Have a company account invite?' : 'Have a team invitation?'}</Link>
      </div>
    </AuthFrame>
  );
}

export function AccountInviteScreen() {
  return <InviteScreen />;
}

export function TeamInviteScreen() {
  return <InviteScreen team />;
}
