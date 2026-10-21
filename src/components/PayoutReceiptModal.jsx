import { useGetPayoutRecordQuery } from '../store/features/payouts/payoutsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { ReceiptModal } from './Receipt.jsx';

/** Mount on click so the dialog acknowledges the action before the read completes. */
export function PayoutReceiptModal({ id, onClose }) {
  const { currentData, error, isFetching, refetch } = useGetPayoutRecordQuery(id, { refetchOnMountOrArgChange: true });
  return <ReceiptModal open onClose={onClose} description={id}
    receipt={currentData?.receipt} loading={isFetching}
    error={error ? getApiErrorMessage(error) : undefined} onRetry={refetch} />;
}
