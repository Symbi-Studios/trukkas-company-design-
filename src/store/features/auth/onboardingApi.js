import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';

const documentTypes = {
  'CAC Certificate': 'CAC_CERTIFICATE', 'CAC Status Report': 'CAC_STATUS_REPORT',
  TIN: 'TIN_CERTIFICATE', 'Proof of Address': 'PROOF_OF_ADDRESS',
  'Goods-in-Transit Insurance': 'GOODS_IN_TRANSIT_INSURANCE', 'Haulage Permit': 'OPERATING_LICENCE',
};
const documentNames = Object.fromEntries(Object.entries(documentTypes).map(([name, type]) => [type, name]));
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : '—';
const displayDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const bankView = (bank) => bank ? {
  bankName: text(bank.bankName), bankCode: text(bank.bankCode), accountName: text(bank.accountName),
  last4: typeof bank.accountNo === 'string' && /^\d{10}$/.test(bank.accountNo) ? bank.accountNo.slice(-4) : '—', updatedOn: displayDate(bank.updatedAt),
} : null;

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingDocuments: builder.query({
      query: () => '/company-documents',
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        if (!Array.isArray(data?.documents)) return null;
        return data.documents.filter((doc) => doc.id && documentNames[doc.type]).map((doc) => ({
          id: doc.id, ownerType: 'company', type: documentNames[doc.type], name: text(doc.fileName),
          number: text(doc.documentNumber), uploadedOn: displayDate(doc.uploadedAt), expiryDate: displayDate(doc.expiresAt),
          status: doc.expiryStatus === 'EXPIRED' ? 'Expired' : doc.expiryStatus === 'EXPIRING_SOON' ? 'Expiring Soon'
            : ({ APPROVED: 'Verified', PENDING: 'Pending Review', REJECTED: 'Rejected' })[doc.status] || '—',
          url: doc.url || null,
        }));
      },
      providesTags: ['AuthOnboardingDocuments'],
    }),
    uploadOnboardingDocument: builder.mutation({
      async queryFn({ type, file, number, expiryDate }, _api, _options, baseQuery) {
        if (!documentTypes[type]) return { error: { status: 'CUSTOM_ERROR', error: `The company API does not support ${type} submissions from this form.` } };
        if (!(file instanceof File) || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          return { error: { status: 'CUSTOM_ERROR', error: 'Choose a PDF, JPEG, PNG or WebP file up to 10 MB.' } };
        }
        const body = new FormData();
        body.append('file', file);
        body.append('type', documentTypes[type]);
        if (number) body.append('documentNumber', number);
        if (expiryDate) body.append('expiresAt', expiryDate);
        const result = await baseQuery({ url: '/company-documents', method: 'POST', body });
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        return data?.document?.id ? { data } : { error: { status: 'CUSTOM_ERROR', error: 'The API did not confirm the uploaded document.' } };
      },
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingDocuments'],
    }),
    getOnboardingTrucks: builder.query({
      query: () => '/dashboard/trucks',
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        const trucks = Array.isArray(data) ? data : data?.trucks;
        return Array.isArray(trucks) ? trucks.map((truck) => ({ id: truck.id, plate: text(truck.plateNumber), makeModel: '—' })) : null;
      },
    }),
    getOnboardingBanks: builder.query({
      query: () => '/wallets/banks',
      transformResponse: (response) => {
        const banks = unwrapApiResponseData(response)?.banks;
        return Array.isArray(banks) ? banks.filter((bank) => typeof bank.code === 'string' && typeof bank.name === 'string') : null;
      },
    }),
    resolveOnboardingBank: builder.mutation({
      query: ({ bankName, accountNumber }) => ({ url: '/wallets/resolve-account', method: 'POST', body: { bankName, bankAccountNo: accountNumber } }),
      transformResponse: (response) => ({ accountName: text(unwrapApiResponseData(response)?.accountName) }),
    }),
    getOnboardingBank: builder.query({
      async queryFn(_arg, _api, _options, baseQuery) {
        const result = await baseQuery('/wallets/bank-account');
        if (result.error?.status === 404) return { data: null };
        return result.error ? result : { data: bankView(unwrapApiResponseData(result.data)?.account) };
      },
      providesTags: ['AuthOnboardingBank'],
    }),
    saveOnboardingBank: builder.mutation({
      query: ({ bankName, accountNumber }) => ({ url: '/wallets/bank-account', method: 'POST', body: { bankName, bankAccountNo: accountNumber } }),
      transformResponse: (response) => bankView(unwrapApiResponseData(response)?.account),
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingBank'],
    }),
    getOnboardingSecurity: builder.query({
      query: () => '/profile/security-settings',
      transformResponse: (response) => {
        const data = unwrapApiResponseData(response);
        return { pin: { set: typeof data?.transactionPinSet === 'boolean' ? data.transactionPinSet : null } };
      },
      providesTags: ['AuthOnboardingSecurity'],
    }),
    saveOnboardingPin: builder.mutation({
      async queryFn({ newPin, confirmPin, currentPin }, _api, _options, baseQuery) {
        if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin) || newPin !== confirmPin) {
          return { error: { status: 'CUSTOM_ERROR', error: 'Enter and confirm a matching 4-digit PIN.' } };
        }
        const result = await baseQuery({
          url: '/profile/transaction-pin', method: 'PATCH',
          body: { newPin, confirmPin, ...(currentPin ? { currentPin } : {}) },
        });
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        return data?.transactionPinSet === true ? { data: { transactionPinSet: true } }
          : { error: { status: 'CUSTOM_ERROR', error: 'The API did not confirm that your PIN was saved.' } };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(onboardingApi.util.updateQueryData('getOnboardingSecurity', undefined, (security) => {
            security.pin.set = true;
          }));
        } catch {
          // The form shows the error; retain the last confirmed security status.
        }
      },
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingSecurity'],
    }),
  }),
});

export const {
  useGetOnboardingDocumentsQuery, useUploadOnboardingDocumentMutation, useGetOnboardingTrucksQuery,
  useGetOnboardingBanksQuery, useResolveOnboardingBankMutation, useGetOnboardingBankQuery,
  useSaveOnboardingBankMutation, useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation,
} = onboardingApi;
