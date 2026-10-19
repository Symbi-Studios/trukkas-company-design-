import { useCallback, useEffect, useState } from 'react';
import { Banner, Button, EmptyState, Icon, SectionCard, Select, SkeletonRow, TextField } from '../../ds.js';
import { BANKS, resolveAccountName, updateBankAccount } from '../../mock/api.js';
import { useGetOnboardingBankQuery, useGetOnboardingBanksQuery, useResolveOnboardingBankMutation, useSaveOnboardingBankMutation, useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation } from '../../store/features/auth/onboardingApi.js';
import { useUpdateSettingsBankMutation } from '../../store/features/settings/settingsApi.js';
import { useGetMyProfileAccessQuery } from '../../store/features/profile/profileApi.js';
import { getApiErrorMessage } from '../../store/api/getApiErrorMessage.js';
import { PinPrompt } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

/** Bank account form shared by settings, onboarding and the remaining prototype screens. */
export function BankAccountForm({ initial, onSaved, submitLabel = 'Save Bank Account', requirePin = true, onCancel, banks = BANKS, resolveAccount = resolveAccountName, saveAccount = updateBankAccount, approvalUnavailable = false, disabled = false, loadError = '', securityState, createPin }) {
  const [bankCode, setBankCode] = useState(initial?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccountName('');
    setResolving(false);
    if (!bankCode || accountNumber.length !== 10) return undefined;
    let cancelled = false;
    setResolving(true);
    setError('');
    resolveAccount(bankCode, accountNumber)
      .then((r) => { if (!cancelled) setAccountName(r.accountName); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bankCode, accountNumber, resolveAccount]);

  async function save(pin) {
    setSaving(true);
    try {
      const bank = await saveAccount({ bankCode, accountNumber, accountName }, pin);
      setPinOpen(false);
      setAccountNumber('');
      onSaved?.(bank);
    } finally { setSaving(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (saving || disabled) return;
    setError('');
    if (!accountName) { setError('Enter a valid bank and 10-digit account number.'); return; }
    if (requirePin) {
      if (approvalUnavailable) { setError('The bank API does not support PIN-approved account changes yet.'); return; }
      setPinOpen(true); return;
    }
    try { await save(); } catch (err) { setError(err.message); }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <Select label="Bank" value={bankCode} placeholder="Select your bank" disabled={saving || disabled} options={banks.map((b) => ({ value: b.code, label: b.name }))} onChange={(e) => setBankCode(e.target.value)} />
      <TextField label="Account Number (NUBAN)" inputMode="numeric" maxLength={10} disabled={saving || disabled} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="10-digit account number" />
      <div className={styles.full}>
        {resolving && <span className="tk-meta">Verifying account name…</span>}
        {accountName && <span className={styles.resolved}><Icon name="circle-check" size={16} />{accountName}</span>}
        {(error || loadError) && <p className={styles.error}>{error || loadError}</p>}
        <p className={styles.hint} style={{ marginTop: 8 }}>The account name must match your registered company name. Payouts can’t be sent to personal accounts.</p>
      </div>
      <div className={styles.formActions}>
        {onCancel && <Button variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>}
        <Button type="submit" icon="landmark" disabled={!accountName || saving || disabled}>{submitLabel}</Button>
      </div>
      <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} confirmLabel="Approve Change"
        description="Changing where payouts are sent requires your transaction PIN." onConfirm={save} securityState={securityState} createPin={createPin} />
    </form>
  );
}

export function PayoutAccountSettings({ onToast }) {
  const { data: bank, error, isLoading } = useGetOnboardingBankQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: banks, error: banksError } = useGetOnboardingBanksQuery();
  const { data: access } = useGetMyProfileAccessQuery();
  const { data: security, error: securityError } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [resolveBank] = useResolveOnboardingBankMutation();
  const [saveBank] = useSaveOnboardingBankMutation();
  const [updateBank] = useUpdateSettingsBankMutation();
  const [saveTransactionPin] = useSaveOnboardingPinMutation();
  const [editing, setEditing] = useState(false);
  const resolveAccount = useCallback(async (bankCode, accountNumber) => {
    const selected = banks?.find((row) => row.code === bankCode);
    if (!selected) throw new Error('Choose a supported bank.');
    try {
      const result = await resolveBank({ bankName: selected.name, accountNumber }).unwrap();
      if (!result.accountName || result.accountName === '—') throw new Error('The API could not confirm the account name.');
      return result;
    } catch (err) { throw new Error(err instanceof Error ? err.message : getApiErrorMessage(err)); }
  }, [banks, resolveBank]);
  async function createPin(values) {
    if (access?.canEdit !== true || security?.pin?.set !== false) throw new Error('Your current PIN status must be confirmed before creating a PIN.');
    try { return await saveTransactionPin(values).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function saveAccount({ bankCode, accountNumber }, transactionPin) {
    if (access?.canEdit !== true) throw new Error('You need settings.edit permission to save a payout account.');
    if (bank === undefined) throw new Error('Load your current payout account before saving changes.');
    const selected = banks?.find((row) => row.code === bankCode);
    if (!selected) throw new Error('Choose a supported bank.');
    try {
      const result = await (bank ? updateBank({ bankName: selected.name, accountNumber, transactionPin })
        : saveBank({ bankName: selected.name, accountNumber })).unwrap();
      if (!result) throw new Error('The API did not confirm the saved bank account.');
      return result;
    } catch (err) { throw new Error(err instanceof Error ? err.message : getApiErrorMessage(err)); }
  }

  return (
    <>
      <SectionCard title="Payout Account" description="Where Trukkas sends your payouts and withdrawals.">
        {isLoading ? <SkeletonRow columns={2} /> : error || banksError ? <EmptyState icon="landmark" title={getApiErrorMessage(error || banksError)} /> : bank === undefined && <span className="tk-meta">—</span>}
        {bank === null && !editing && (
          <Banner tone="warning" title="No payout account yet" action={<Button size="sm" disabled={access?.canEdit !== true} onClick={() => setEditing(true)}>Add Bank Account</Button>}>
            Add a company bank account to request payouts and withdraw your wallet balance.
          </Banner>
        )}
        {bank && !editing && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className={styles.bankCard}>
              <Icon name="landmark" size={28} />
              <span>
                <strong>{bank.bankName} •••• {bank.last4}</strong>
                <small>{bank.accountName}</small>
                <small>Verified · updated {bank.updatedOn || '—'}</small>
              </span>
            </div>
            <div><Button variant="outline" icon="pencil" disabled={access?.canEdit !== true} onClick={() => setEditing(true)}>Change Bank Account</Button></div>
          </div>
        )}
        {editing && (
          <BankAccountForm
            initial={bank} requirePin={!!bank} onCancel={() => setEditing(false)} banks={banks ?? []} resolveAccount={resolveAccount} saveAccount={saveAccount}
            securityState={security ?? null} createPin={createPin} loadError={securityError ? getApiErrorMessage(securityError) : ''}
            disabled={access?.canEdit !== true || bank === undefined || !!error || !!banksError || (!!bank && typeof security?.pin?.set !== 'boolean')}
            onSaved={(b) => { setEditing(false); onToast(`Payouts will now go to ${b.bankName} •••• ${b.last4}.`); }}
          />
        )}
      </SectionCard>
      <SectionCard title="How payouts work">
        <ul className={styles.steps}>
          <li>Completed trips become available to request under Payouts.</li>
          <li>Every payout, withdrawal and bank change is approved with your 4-digit transaction PIN.</li>
          <li>The account name must match your registered company name.</li>
        </ul>
      </SectionCard>
    </>
  );
}
