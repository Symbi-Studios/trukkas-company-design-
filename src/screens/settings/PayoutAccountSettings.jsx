import { useEffect, useState } from 'react';
import { Banner, Button, Icon, SectionCard, Select, TextField } from '../../ds.js';
import { useCollection } from '../../mock/useCollection.js';
import { BANKS, resolveAccountName, updateBankAccount } from '../../mock/api.js';
import { PinPrompt } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

/** Bank account form with mock name enquiry. Used in settings and onboarding. */
export function BankAccountForm({ initial, onSaved, submitLabel = 'Save Bank Account', requirePin = true, onCancel }) {
  const [bankCode, setBankCode] = useState(initial?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    setAccountName('');
    if (!bankCode || accountNumber.length !== 10) return undefined;
    let cancelled = false;
    setResolving(true);
    setError('');
    resolveAccountName(bankCode, accountNumber)
      .then((r) => { if (!cancelled) setAccountName(r.accountName); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bankCode, accountNumber]);

  async function save(pin) {
    const bank = await updateBankAccount({ bankCode, accountNumber, accountName }, pin);
    setPinOpen(false);
    setAccountNumber('');
    onSaved?.(bank);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!accountName) { setError('Enter a valid bank and 10-digit account number.'); return; }
    if (requirePin) { setPinOpen(true); return; }
    try { await save(); } catch (err) { setError(err.message); }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <Select label="Bank" value={bankCode} placeholder="Select your bank" options={BANKS.map((b) => ({ value: b.code, label: b.name }))} onChange={(e) => setBankCode(e.target.value)} />
      <TextField label="Account Number (NUBAN)" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="10-digit account number" />
      <div className={styles.full}>
        {resolving && <span className="tk-meta">Verifying account name…</span>}
        {accountName && <span className={styles.resolved}><Icon name="circle-check" size={16} />{accountName}</span>}
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.hint} style={{ marginTop: 8 }}>The account name must match your registered company name. Payouts can’t be sent to personal accounts.</p>
      </div>
      <div className={styles.formActions}>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" icon="landmark" disabled={!accountName}>{submitLabel}</Button>
      </div>
      <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} confirmLabel="Approve Change"
        description="Changing where payouts are sent requires your transaction PIN." onConfirm={save} />
    </form>
  );
}

export function PayoutAccountSettings({ onToast }) {
  const wallet = useCollection('walletSummary')?.[0];
  const bank = wallet?.bankAccount;
  const [editing, setEditing] = useState(false);

  return (
    <>
      <SectionCard title="Payout Account" description="Where Trukkas sends your payouts and withdrawals.">
        {!bank && !editing && (
          <Banner tone="warning" title="No payout account yet" action={<Button size="sm" onClick={() => setEditing(true)}>Add Bank Account</Button>}>
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
            <div><Button variant="outline" icon="pencil" onClick={() => setEditing(true)}>Change Bank Account</Button></div>
          </div>
        )}
        {editing && (
          <BankAccountForm
            initial={bank} requirePin={!!bank} onCancel={() => setEditing(false)}
            onSaved={(b) => { setEditing(false); onToast(`Payouts will now go to ${b.bankName} •••• ${b.last4}.`); }}
          />
        )}
      </SectionCard>
      <SectionCard title="How payouts work">
        <ul className={styles.steps}>
          <li>Completed trips become available to request under Payouts.</li>
          <li>Every payout, withdrawal and bank change is approved with your 6-digit transaction PIN.</li>
          <li>The account name must match your registered company name.</li>
        </ul>
      </SectionCard>
    </>
  );
}
