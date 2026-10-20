import { useMemo, useState } from 'react';
import { Button, EmptyState, LabelValue, Modal, SkeletonRow, TextField } from '../ds.js';
import { useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation } from '../store/features/auth/onboardingApi.js';
import { useGetWithdrawalFeeQuery, useRequestWalletWithdrawalMutation } from '../store/features/wallet/walletApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { formatNaira } from '../mock/format.js';
import { PinPrompt } from './SecurityInputs.jsx';

const money = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
const withdrawalAttempts = new Map();

// Retain an uncertain request when moving between Wallet and Payouts. This
// keeps retries on the same idempotency key without storing any PIN.
export function useWalletWithdrawalAttempt(companyId, actorId) {
  return useMemo(() => {
    const key = JSON.stringify([companyId, actorId]);
    if (!withdrawalAttempts.has(key)) withdrawalAttempts.set(key, { current: null });
    return withdrawalAttempts.get(key);
  }, [companyId, actorId]);
}

export function WalletWithdrawModal({ onClose, onDone, available, bank, attempt, companyId }) {
  const [amount, setAmount] = useState(() => attempt.current?.companyId === companyId ? String(attempt.current.amount) : '');
  const [error, setError] = useState('');
  const [step, setStep] = useState('amount');
  const { currentData: security, error: securityError, isFetching: securityLoading } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [savePin] = useSaveOnboardingPinMutation();
  const [requestWithdrawal] = useRequestWalletWithdrawalMutation();
  const value = Number(amount);
  const bankKey = bank ? JSON.stringify([bank.bankCode, bank.bankName, bank.last4, bank.accountName]) : null;
  const retrying = attempt.current?.companyId === companyId && attempt.current.amount === value && attempt.current.bankKey === bankKey;
  const validAmount = Number.isFinite(value) && value >= 1000 && value <= Number.MAX_SAFE_INTEGER && (retrying || (typeof available === 'number' && value <= available));
  const { currentData: fee, error: feeError, isFetching: feeLoading } = useGetWithdrawalFeeQuery(value, { skip: step === 'amount' || !validAmount, refetchOnMountOrArgChange: true });
  const ready = validAmount && bank && fee && !feeError && !feeLoading && !securityError && !securityLoading && typeof security?.pin?.set === 'boolean';
  function submit(event) {
    event.preventDefault();
    setError('');
    if (!Number.isFinite(value) || value < 1000 || value > Number.MAX_SAFE_INTEGER) { setError('Enter a withdrawal amount of at least ₦1,000.'); return; }
    if (attempt.current && !retrying) { setError('Retry the previous withdrawal amount and bank account before starting another request.'); return; }
    if (!retrying && (typeof available !== 'number' || !Number.isFinite(available))) { setError('Your available balance could not be confirmed. Please reload.'); return; }
    if (!retrying && value > available) { setError('Amount exceeds your available balance.'); return; }
    if (!bank) { setError('Add a payout bank account in Company Settings first.'); return; }
    setStep('confirm');
  }
  async function createPin(fields) {
    try { await savePin(fields).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function withdraw(pin) {
    if (!validAmount || !bank || !fee || feeError || feeLoading) throw new Error('Confirm the withdrawal amount, bank account and fee again.');
    if (attempt.current && !retrying) throw new Error('Retry the previous withdrawal before starting another request.');
    if (attempt.current && Date.now() - attempt.current.startedAt >= 24 * 60 * 60 * 1000) throw new Error('This request is too old to retry safely. Check its status in transaction history before starting another withdrawal.');
    if (!attempt.current) {
      if (!globalThis.crypto?.randomUUID) throw new Error('A secure request identifier could not be created. Please use a secure connection.');
      attempt.current = { companyId, amount: value, bankKey, key: globalThis.crypto.randomUUID(), startedAt: Date.now() };
    }
    try {
      const result = await requestWithdrawal({ amount: value, transactionPin: pin, idempotencyKey: attempt.current.key }).unwrap();
      attempt.current = null;
      onDone(result);
    } catch (err) {
      // Definitive validation/permission failures did not move money. Keep the
      // same key for network failures, 409 and unconfirmed successful responses.
      if ([400, 403, 404, 422, 429].includes(err.status)) attempt.current = null;
      throw new Error(getApiErrorMessage(err));
    }
  }
  return (
    <>
    <Modal open={step === 'amount'} onClose={onClose} title="Withdraw Funds" description={bank ? `Funds go to ${bank.bankName} •••• ${bank.last4} (${bank.accountName}).` : bank === null ? 'Add a payout bank account in Company Settings first.' : '—'} width={420}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="withdraw-form" type="submit" disabled={!bank}>Withdraw</Button></>}>
      <form id="withdraw-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Amount (₦)" type="number" min="1000" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Available balance: ${money(available)}`} error={error} />
      </form>
    </Modal>
    <Modal open={step === 'confirm'} onClose={onClose} title="Confirm Withdrawal" description="Review the fee and amount your bank will receive. Withdrawals require backend approval." width={420}
      footer={<><Button variant="outline" onClick={() => setStep('amount')}>Back</Button><Button disabled={!ready} onClick={() => { if (ready) setStep('pin'); }}>Continue</Button></>}>
      {feeLoading || securityLoading ? <SkeletonRow variant="form" rows={2} action={false} /> : feeError || securityError ? <EmptyState icon="wallet" title={getApiErrorMessage(feeError || securityError)} /> : <>
        <LabelValue label="Withdrawal amount" value={money(fee?.amount)} />
        <LabelValue label="Withdrawal fee" value={money(fee?.fee)} />
        <LabelValue label="Amount received" value={money(fee?.net)} />
        <LabelValue label="Bank account" value={bank ? `${bank.bankName} •••• ${bank.last4}` : '—'} />
      </>}
    </Modal>
    <PinPrompt open={step === 'pin'} onClose={onClose} confirmLabel="Approve Withdrawal" securityState={security ?? { pin: { set: null } }} createPin={createPin}
      description={`Withdraw ${money(fee?.amount)} to your bank account. Fee: ${money(fee?.fee)}. Amount received: ${money(fee?.net)}.`} onConfirm={withdraw} />
    </>
  );
}
