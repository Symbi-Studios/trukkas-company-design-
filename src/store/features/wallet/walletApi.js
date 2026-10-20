import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, rows, text } from '../jobs/jobContracts.js';
import { walletEarningsView, walletJobView, walletTransactionView, walletView, withdrawalFeeView } from './walletContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.apiRole === 'TRUCKER' && account?.truckerType === 'COMPANY'
    ? null : unavailable('Sign in with your trucking-company account to manage earnings and wallet.');
};
async function allPages(api, baseQuery, url, key, params = {}) {
  const collection = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The wallet request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, limit: 100 } });
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.[key]), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination.total) === null || count(pagination.totalPages) === null) return unavailable('The API did not return valid wallet records and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if (pages > 500 || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The records changed while loading. Please reload.');
    collection.push(...items);
    if (collection.length > total) return unavailable('The API returned invalid wallet pagination.');
  }
  if (collection.length !== total || collection.some((item) => !text(item.id)) || new Set(collection.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete wallet collection.');
  return { data: collection };
}

export const walletApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyWallet', 'CompanyWalletTransactions', 'CompanyDashboard', 'CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyMaintenance'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getCompanyWallet: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery('/wallets');
        return result.error ? result : { data: walletView(unwrapApiResponseData(result.data)) };
      },
      providesTags: ['CompanyWallet', 'CompanyDashboard'],
    }),
    getWalletEarnings: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery({ url: '/company/earnings', params: { period: '12m' } });
        return result.error ? result : { data: walletEarningsView(unwrapApiResponseData(result.data)) };
      },
      providesTags: ['CompanyWallet', 'CompanyDashboard', 'CompanyMaintenance'],
    }),
    getWalletTransactions: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const wallet = await baseQuery('/wallets');
        if (wallet.error) return wallet;
        if (unwrapApiResponseData(wallet.data)?.wallet?.currency !== 'NGN') return unavailable('The API did not confirm an NGN wallet for these transactions.');
        const result = await allPages(api, baseQuery, '/wallets/transactions', 'transactions');
        if (result.error) return result;
        const records = [];
        // balanceAfter is documented on the detail response. Read it when the
        // list omits it; never reconstruct historical balances from today's.
        for (let offset = 0; offset < result.data.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The wallet request was cancelled.');
          const loaded = await Promise.all(result.data.slice(offset, offset + 4).map(async (row) => {
            if (Object.hasOwn(row, 'balanceAfter')) return { data: row };
            const detail = await baseQuery(`/wallets/transactions/${encodeURIComponent(row.id)}`);
            if (detail.error) return detail;
            const transaction = unwrapApiResponseData(detail.data)?.transaction;
            return transaction?.id === row.id ? { data: transaction } : unavailable('The API did not identify this wallet transaction.');
          }));
          for (const item of loaded) { if (item.error) return item; records.push(walletTransactionView(item.data)); }
        }
        return { data: records };
      },
      providesTags: ['CompanyWalletTransactions', 'CompanyWallet', 'CompanyDashboard'],
    }),
    getWalletJobs: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await allPages(api, baseQuery, '/company/trips', 'trips', { group: 'COMPLETED' });
        if (result.error) return result;
        if (result.data.some((trip) => trip.status !== 'COMPLETED')) return unavailable('The API returned trips outside the completed group.');
        const jobRows = [];
        for (let offset = 0; offset < result.data.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The earnings request was cancelled.');
          const batch = result.data.slice(offset, offset + 4);
          const loaded = await Promise.all(batch.map(async (row) => {
            const [tripResult, jobResult] = await Promise.all([baseQuery(`/company/trips/${encodeURIComponent(row.id)}`), baseQuery(`/jobs/${encodeURIComponent(row.id)}`)]);
            if (tripResult.error) return tripResult;
            if (jobResult.error) return jobResult;
            const trip = unwrapApiResponseData(tripResult.data)?.trip, job = unwrapApiResponseData(jobResult.data);
            if (trip?.id !== row.id || trip.jobId !== row.id || trip.status !== 'COMPLETED' || job?.id !== row.id) return unavailable('The API did not identify the completed job and its trip.');
            const mapped = walletJobView(job, trip);
            return mapped ? { data: mapped } : unavailable('The API did not return a valid completed job.');
          }));
          for (const item of loaded) { if (item.error) return item; jobRows.push(item.data); }
        }
        // Trip filters use job-created dates; no completion date/monthly count
        // is documented, so these records cannot supply "trips this month".
        return { data: { rows: jobRows, completedThisMonth: null } };
      },
      providesTags: ['CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyWallet'],
    }),
    getWithdrawalFee: builder.query({
      async queryFn(amount, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1000 || amount > Number.MAX_SAFE_INTEGER) return unavailable('Enter a withdrawal amount of at least ₦1,000.');
        const result = await baseQuery({ url: '/wallets/withdraw/fee', params: { amount } });
        if (result.error) return result;
        const fee = withdrawalFeeView(unwrapApiResponseData(result.data), amount);
        return fee ? { data: fee } : unavailable('The API did not return a valid withdrawal fee.');
      },
      keepUnusedDataFor: 0,
    }),
    requestWalletWithdrawal: builder.mutation({
      // WithdrawDto currently has no transactionPin. Do not submit a financial
      // write that bypasses the PIN approval required by this screen.
      queryFn: () => unavailable('Withdrawal is unavailable until the backend supports transaction PIN verification. No withdrawal was submitted.'),
    }),
  }),
});

export const { useGetCompanyWalletQuery, useGetWalletEarningsQuery, useGetWalletTransactionsQuery, useGetWalletJobsQuery, useGetWithdrawalFeeQuery, useRequestWalletWithdrawalMutation } = walletApi;
