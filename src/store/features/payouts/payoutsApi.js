import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { PAYOUT_TRANSACTION_TYPES, payoutRecord, payoutReceiptView, rows, text } from './payoutContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.apiRole === 'TRUCKER' && account?.truckerType === 'COMPANY'
    ? null : unavailable('Sign in with your trucking-company account to view payouts.');
};

export const payoutsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyPayouts'] }).injectEndpoints({
  endpoints: (builder) => ({
    getPayoutRecords: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = api.getState().auth.account;
        const wallet = await baseQuery('/wallets');
        if (wallet.error) return wallet;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload payouts.');
        if (unwrapApiResponseData(wallet.data)?.wallet?.currency !== 'NGN') return unavailable('The API did not confirm the currency of these payout records.');
        const records = [];
        let pages = 1, total = null;
        // /company/payouts has no documented response schema yet. The wallet
        // explicitly documents this same company's job payments/withdrawals.
        // Load all pages for the existing local search; never use fixtures or
        // treat a page as whole-company totals.
        for (let page = 1; page <= pages; page += 1) {
          if (api.signal.aborted) return unavailable('The payout request was cancelled.');
          const result = await baseQuery({ url: '/wallets/transactions', params: { page, limit: 20, type: PAYOUT_TRANSACTION_TYPES.join(',') } });
          if (result.error) return result;
          if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload payouts.');
          const data = unwrapApiResponseData(result.data);
          const transactions = rows(data?.transactions), pagination = data?.pagination;
          if (!transactions || !count(pagination?.total) || !count(pagination?.totalPages) || pagination.page !== page) return unavailable('The API did not return valid payout records and pagination.');
          if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
          if (pages > 500 || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !transactions.length)) return unavailable('The payout list changed or could not be loaded completely. Reload before continuing.');
          const mapped = transactions.map(payoutRecord);
          if (mapped.some((record) => !record)) return unavailable('The API returned an invalid payout transaction.');
          records.push(...mapped);
          if (records.length > total) return unavailable('The API returned inconsistent payout pagination.');
        }
        if (records.length !== total || new Set(records.map((record) => record.id)).size !== total) return unavailable('The API did not return the complete payout collection.');
        return { data: { records, summary: { paid: null, processing: null, failed: null }, eligible: [], availableToRequest: null, eligibleCount: null, canRequest: false } };
      },
      providesTags: ['CompanyPayouts'],
    }),
    getPayoutRecord: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('Choose a payout with a confirmed API ID.');
        const account = api.getState().auth.account;
        const [result, wallet] = await Promise.all([baseQuery(`/wallets/transactions/${encodeURIComponent(id)}`), baseQuery('/wallets')]);
        if (result.error) return result;
        if (wallet.error) return wallet;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload payouts.');
        if (unwrapApiResponseData(wallet.data)?.wallet?.currency !== 'NGN') return unavailable('The API did not confirm the currency of this payout.');
        const source = unwrapApiResponseData(result.data)?.transaction;
        if (source?.id !== id) return unavailable('The API did not identify this payout.');
        const payout = payoutRecord(source);
        if (!payout) return unavailable('This transaction is not a company job payment or withdrawal.');
        const jobId = payout.items[0]?.jobId;
        const [companyResult, tripResult] = await Promise.all([
          baseQuery('/profile'), jobId ? baseQuery(`/company/trips/${encodeURIComponent(jobId)}`) : Promise.resolve({ data: null }),
        ]);
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload payouts.');
        if (companyResult.error) return companyResult;
        const user = unwrapApiResponseData(companyResult.data)?.user;
        if (user?.id !== account.id || user.role !== 'TRUCKER' || user.truckerType !== 'COMPANY') return unavailable('The API did not identify your company for this receipt.');
        const candidate = tripResult.error ? null : unwrapApiResponseData(tripResult.data)?.trip;
        const trip = candidate?.id === jobId ? candidate : null;
        return { data: { payout, receipt: payoutReceiptView(payout, user, trip) } };
      },
      providesTags: ['CompanyPayouts', 'Profile'],
    }),
    requestCompanyPayout: builder.mutation({
      queryFn: () => unavailable('The company API does not document requesting a payout for selected completed trips. No payout was submitted.'),
    }),
  }),
});

export const { useGetPayoutRecordsQuery, useGetPayoutRecordQuery, useLazyGetPayoutRecordQuery, useRequestCompanyPayoutMutation } = payoutsApi;
