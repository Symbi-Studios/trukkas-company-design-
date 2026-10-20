import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { companyPayoutRecord, companyPayoutSummary, payoutRecord, payoutReceiptView, rows, text } from './payoutContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const signedIn = (api) => {
  const account = api.getState().auth.account;
  return account?.apiRole === 'TRUCKER' && account?.truckerType === 'COMPANY'
    ? null : unavailable('Sign in with your trucking-company account to view payouts.');
};
function companyQuery(api, baseQuery) {
  const identity = () => {
    const { account, activeCompanyId } = api.getState().auth;
    return JSON.stringify([account?.id, account?.actualUserId, activeCompanyId]);
  };
  const company = identity();
  return async (args) => {
    if (identity() !== company) return unavailable('Your company session changed. Reload payouts.');
    const result = await baseQuery(args);
    return identity() === company ? result : unavailable('Your company session changed. Reload payouts.');
  };
}

export const payoutsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyPayouts'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getPayoutRecords: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        baseQuery = companyQuery(api, baseQuery);
        const records = [];
        let pages = 1, total = null, summary = null;
        // Load every page for the existing local search. Financial totals come
        // from the documented summary rather than sums of paginated records.
        for (let page = 1; page <= pages; page += 1) {
          if (api.signal.aborted) return unavailable('The payout request was cancelled.');
          const result = await baseQuery({ url: '/company/payouts', params: { page, limit: 100 } });
          if (result.error) return result;
          const data = unwrapApiResponseData(result.data);
          const transactions = rows(data?.payouts), pagination = data?.pagination;
          if (!transactions || !count(pagination?.total) || !count(pagination?.totalPages) || pagination.page !== page) return unavailable('The API did not return valid payout records and pagination.');
          if (page === 1) {
            total = pagination.total; pages = pagination.totalPages; summary = companyPayoutSummary(data.summary);
            if (!summary) return unavailable('The API did not confirm an NGN payout summary.');
          }
          if (pages > 500 || pagination.total !== total || pagination.totalPages !== pages || (page < pages && !transactions.length)) return unavailable('The payout list changed or could not be loaded completely. Reload before continuing.');
          const mapped = transactions.map(companyPayoutRecord);
          if (mapped.some((record) => !record)) return unavailable('The API returned an invalid payout transaction.');
          records.push(...mapped);
          if (records.length > total) return unavailable('The API returned inconsistent payout pagination.');
        }
        if (records.length !== total || new Set(records.map((record) => record.id)).size !== total) return unavailable('The API did not return the complete payout collection.');
        for (let offset = 0; offset < records.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The payout request was cancelled.');
          const batch = records.slice(offset, offset + 4);
          const loaded = await Promise.all(batch.map(async (record) => {
            if (record.type !== 'WITHDRAWAL') return { data: record };
            const result = await baseQuery(`/wallets/transactions/${encodeURIComponent(record.id)}`);
            if (result.error) return result.error.status === 'CUSTOM_ERROR' ? result : { data: record };
            const source = unwrapApiResponseData(result.data)?.transaction;
            const detail = source?.id === record.id ? payoutRecord(source) : null;
            if (!detail || detail.type !== 'WITHDRAWAL') return unavailable('The API did not identify this withdrawal.');
            return { data: { ...record, paidTo: detail.paidTo, requestedOn: detail.requestedOn, paidOn: detail.paidOn, feePercent: detail.feePercent } };
          }));
          for (let index = 0; index < loaded.length; index += 1) {
            if (loaded[index].error) return loaded[index];
            records[offset + index] = loaded[index].data;
          }
        }
        return { data: { records, summary, eligible: [], availableToRequest: summary.availableToRequest, eligibleCount: null, canRequest: summary.availableToRequest !== null && summary.availableToRequest >= 1000 } };
      },
      providesTags: ['CompanyPayouts'],
    }),
    getPayoutRecord: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('Choose a payout with a confirmed API ID.');
        const account = api.getState().auth.account;
        baseQuery = companyQuery(api, baseQuery);
        const [result, wallet] = await Promise.all([baseQuery(`/wallets/transactions/${encodeURIComponent(id)}`), baseQuery('/wallets')]);
        if (result.error) return result;
        if (wallet.error) return wallet;
        if (unwrapApiResponseData(wallet.data)?.wallet?.currency !== 'NGN') return unavailable('The API did not confirm the currency of this payout.');
        const source = unwrapApiResponseData(result.data)?.transaction;
        if (source?.id !== id) return unavailable('The API did not identify this payout.');
        const payout = payoutRecord(source);
        if (!payout) return unavailable('This transaction is not a company job payment or withdrawal.');
        const jobId = payout.items[0]?.jobId;
        const [companyResult, tripResult] = await Promise.all([
          baseQuery('/profile'), jobId ? baseQuery(`/company/trips/${encodeURIComponent(jobId)}`) : Promise.resolve({ data: null }),
        ]);
        if (companyResult.error) return companyResult;
        const user = unwrapApiResponseData(companyResult.data)?.user;
        if (user?.id !== account.id || user.role !== 'TRUCKER' || user.truckerType !== 'COMPANY') return unavailable('The API did not identify your company for this receipt.');
        const candidate = tripResult.error ? null : unwrapApiResponseData(tripResult.data)?.trip;
        const trip = candidate?.id === jobId ? candidate : null;
        return { data: { payout, receipt: payoutReceiptView(payout, user, trip) } };
      },
      providesTags: ['CompanyPayouts', 'Profile'],
    }),
  }),
});

export const { useGetPayoutRecordsQuery, useGetPayoutRecordQuery, useLazyGetPayoutRecordQuery } = payoutsApi;
