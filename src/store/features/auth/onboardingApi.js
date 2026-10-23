import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { pinLockoutView } from '../../api/pinContracts.js';
import { COMPANY_REQUIREMENTS, maskNumber } from '../../../domain/documents.js';

const documentTypes = {
  'CAC Certificate': 'CAC_CERTIFICATE', 'CAC Status Report': 'CAC_STATUS_REPORT',
  TIN: 'TIN_CERTIFICATE', 'Proof of Address': 'PROOF_OF_ADDRESS',
  'Goods-in-Transit Insurance': 'GOODS_IN_TRANSIT_INSURANCE', 'Haulage Permit': 'OPERATING_LICENCE',
  'Memorandum of Association': 'MEMORANDUM_OF_ASSOCIATION', 'Government ID': 'DIRECTOR_ID',
  'Bank Verification': 'BANK_CONFIRMATION_LETTER',
};
const documentNames = Object.fromEntries(Object.entries(documentTypes).map(([name, type]) => [type, name]));
export const UNSUPPORTED_ONBOARDING_DOCUMENTS = ['NIN', 'BVN'];
const requiredDocuments = ['CAC_CERTIFICATE', 'TIN_CERTIFICATE', 'GOODS_IN_TRANSIT_INSURANCE'];
export const ONBOARDING_REQUIREMENTS = COMPANY_REQUIREMENTS.map((requirement) => ({
  ...requirement, required: requiredDocuments.includes(documentTypes[requirement.type]),
}));
const failure = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : '—';
const displayDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const directorStatuses = new Set(['NOT_STARTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED']);
const safeMaskedId = (value) => typeof value === 'string' && /^\*+\d{4}$/.test(value) ? value : '—';

export function directorVerificationView(response) {
  const data = unwrapApiResponseData(response);
  if (!data?.director || typeof data.director !== 'object' || Array.isArray(data.director)) {
    return failure('The API did not return director verification details.');
  }
  const status = (value) => directorStatuses.has(value) ? value : '—';
  return { data: {
    director: { name: text(data.director.name), dateOfBirth: displayDate(data.director.dateOfBirth), role: text(data.director.role) },
    nin: { status: status(data.nin?.status), masked: safeMaskedId(data.nin?.masked) },
    bvn: { status: status(data.bvn?.status), masked: safeMaskedId(data.bvn?.masked) },
    submittedAt: displayDate(data.submittedAt), reviewedAt: displayDate(data.reviewedAt),
    rejectionReason: typeof data.rejectionReason === 'string' && data.rejectionReason.trim() ? data.rejectionReason.trim() : '—',
    reviewMode: data.reviewMode === 'MANUAL' ? 'MANUAL' : '—',
  } };
}
const bankView = (bank) => bank ? {
  bankName: text(bank.bankName), bankCode: text(bank.bankCode), accountName: text(bank.accountName),
  last4: typeof bank.accountNo === 'string' && /^\d{10}$/.test(bank.accountNo) ? bank.accountNo.slice(-4) : '—', updatedOn: displayDate(bank.updatedAt),
} : null;

export function bankRequestResult(result) {
  if (result.error) {
    const body = unwrapApiResponseData(result.error.data);
    const message = ({
      ACCOUNT_NAME_MISMATCH: 'The bank account name does not match your registered company name.',
      TRANSACTION_PIN_REQUIRED: 'Enter your transaction PIN to approve this bank change.',
      TRANSACTION_PIN_INVALID: 'The transaction PIN is incorrect. Please try again.',
    })[body?.code];
    return message ? { error: { ...result.error, data: { ...body, message } } } : result;
  }
  const data = unwrapApiResponseData(result.data);
  const bank = data?.account;
  if (!bank || typeof bank !== 'object' || Array.isArray(bank)) return failure('The API did not confirm the saved bank account. Reload the account before trying again.');
  if (data.nameMatch?.checked === true && data.nameMatch.matched !== true) return failure('The API did not confirm that this bank account matches your company name.');
  return { data: bankView(bank) };
}

export async function syncOnboardingBank(_arg, { dispatch, getState, queryFulfilled }) {
  const account = getState().auth.account;
  try {
    const { data } = await queryFulfilled;
    if (!account || getState().auth.account !== account) return;
    dispatch(onboardingApi.util.updateQueryData('getOnboardingBank', undefined, () => data));
  } catch {
    // Keep the last confirmed account on a failed save.
  }
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingDocuments: builder.query({
      query: () => '/company-documents',
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        if (!Array.isArray(data?.documents)) return null;
        const documents = data.documents.filter((doc) => doc?.id && Object.hasOwn(documentNames, doc.type)).map((doc) => ({
          id: doc.id, ownerType: 'company', type: documentNames[doc.type], name: text(doc.fileName),
          number: doc.type === 'BANK_CONFIRMATION_LETTER' && typeof doc.documentNumber === 'string'
            ? maskNumber(doc.documentNumber) : text(doc.documentNumber),
          uploadedOn: displayDate(doc.uploadedAt), expiryDate: displayDate(doc.expiresAt),
          status: doc.status === 'REJECTED' ? 'Rejected'
            : doc.expiryStatus === 'EXPIRED' ? 'Expired' : doc.expiryStatus === 'EXPIRING_SOON' ? 'Expiring Soon'
            : ({ APPROVED: 'Verified', PENDING: 'Pending Review', REJECTED: 'Rejected' })[doc.status] || '—',
          url: doc.url || null,
        }));
        const required = requiredDocuments.map((type) => data.documents.find((doc) => doc?.type === type));
        const known = required.every((doc) => doc && ['MISSING', 'PENDING', 'APPROVED', 'REJECTED'].includes(doc.status)
          && (doc.status === 'MISSING' ? doc.id === null : typeof doc.id === 'string' && !!doc.id));
        return { documents, complianceAvailable: known };
      },
      providesTags: ['AuthOnboardingDocuments'],
    }),
    uploadOnboardingDocument: builder.mutation({
      async queryFn({ type, file, number, expiryDate }, _api, _options, baseQuery) {
        if (!Object.hasOwn(documentTypes, type)) return { error: { status: 'CUSTOM_ERROR', error: `The company API does not support ${type} submissions from this form.` } };
        if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          return { error: { status: 'CUSTOM_ERROR', error: 'Choose a PDF, JPEG, PNG or WebP file up to 10 MB.' } };
        }
        const requirement = ONBOARDING_REQUIREMENTS.find((item) => item.type === type);
        if (requirement?.expires && (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate || '')
          || !Number.isFinite(Date.parse(expiryDate)) || new Date(expiryDate).toISOString().slice(0, 10) !== expiryDate)) {
          return failure('Enter a valid expiry date.');
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
      query: () => '/auth/register/review',
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        const trucks = data?.trucks;
        if (!Array.isArray(trucks) || trucks.some((truck) => typeof truck?.id !== 'string' || !truck.id.trim())) return null;
        return trucks.map((truck) => ({
          id: truck.id, plate: text(truck.plateNumber),
          makeModel: [truck.make, truck.model].filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()).join(' ') || '—',
        }));
      },
      providesTags: ['AuthOnboardingTrucks'],
    }),
    addOnboardingTruck: builder.mutation({
      async queryFn(form, _api, _options, baseQuery) {
        const vehicleClass = ({ Head: 'HEAD', Trailer: 'TRAILER', Tanker: 'TANKER', Specialized: 'SPECIALIZED', Other: 'OTHER' })[form.vehicleClass];
        if (!vehicleClass || !form.plate?.trim() || !/^\d{4}$/.test(form.year || '')
          || Number(form.year) < 1900 || Number(form.year) > new Date().getUTCFullYear()) {
          return failure('Enter a plate number, vehicle type and valid manufacture year.');
        }
        if ((form.make?.trim().length || 0) > 60 || (form.model?.trim().length || 0) > 60) return failure('Make and model must be at most 60 characters.');
        const result = await baseQuery({ url: '/auth/register/truck', method: 'POST', body: { trucks: [{
          plateNumber: form.plate.trim(), vehicleClass, year: form.year,
          ...(form.make?.trim() ? { make: form.make.trim() } : {}),
          ...(form.model?.trim() ? { model: form.model.trim() } : {}),
        }] } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.trucks;
        return Array.isArray(saved) && saved.length === 1 && saved[0]?.id
          ? { data: { saved: true } } : failure('The API did not confirm the saved truck. Refresh the truck list before trying again.');
      },
      // Refresh even if the response was incomplete; never repeat a successful write automatically.
      invalidatesTags: ['AuthOnboardingTrucks'],
    }),
    getOnboardingBanks: builder.query({
      query: () => '/wallets/banks',
      transformResponse: (response) => {
        const banks = unwrapApiResponseData(response)?.banks;
        if (!Array.isArray(banks)) return null;
        const seenCodes = new Set();
        return banks.filter((bank) => {
          if (typeof bank?.code !== 'string' || !bank.code.trim() || typeof bank.name !== 'string' || !bank.name.trim()) return false;
          const code = bank.code.trim();
          if (seenCodes.has(code)) return false;
          seenCodes.add(code);
          return true;
        }).map((bank) => ({ ...bank, code: bank.code.trim(), name: bank.name.trim() }));
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
        if (result.error) return result;
        const bank = unwrapApiResponseData(result.data)?.account;
        return bank && typeof bank === 'object' && !Array.isArray(bank) ? { data: bankView(bank) }
          : failure('The API did not confirm your saved bank account. Please reload this page.');
      },
      providesTags: ['AuthOnboardingBank'],
    }),
    saveOnboardingBank: builder.mutation({
      async queryFn({ bankName, accountNumber }, _api, _options, baseQuery) {
        if (typeof bankName !== 'string' || !bankName.trim() || !/^\d{10}$/.test(accountNumber || '')) {
          return failure('Choose a supported bank and enter a 10-digit account number.');
        }
        const result = await baseQuery({ url: '/wallets/bank-account', method: 'POST', body: { bankName, bankAccountNo: accountNumber } });
        return bankRequestResult(result);
      },
      onQueryStarted: syncOnboardingBank,
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingBank'],
    }),
    getDirectorVerification: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const account = api.getState().auth.account;
        if (!account || account.apiRole !== 'TRUCKER' || account.truckerType !== 'COMPANY') return failure('Sign in with your company account to load director verification.');
        const result = await baseQuery('/company/director/verification');
        if (result.error) return result;
        if (api.getState().auth.account !== account) return failure('Your company session changed. Reload before continuing.');
        return directorVerificationView(result.data);
      },
      providesTags: ['AuthDirectorVerification'],
    }),
    submitDirectorVerification: builder.mutation({
      async queryFn({ nin, bvn }, api, _options, baseQuery) {
        const account = api.getState().auth.account;
        if (!account || account.apiRole !== 'TRUCKER' || account.truckerType !== 'COMPANY') return failure('Sign in with your company account to submit director verification.');
        const body = {};
        if (nin !== undefined && nin !== '') { if (typeof nin !== 'string' || !/^\d{11}$/.test(nin)) return failure('Enter the director’s 11-digit NIN.'); body.nin = nin; }
        if (bvn !== undefined && bvn !== '') { if (typeof bvn !== 'string' || !/^\d{11}$/.test(bvn)) return failure('Enter the director’s 11-digit BVN.'); body.bvn = bvn; }
        if (!Object.keys(body).length) return failure('Enter a director NIN, BVN, or both.');
        const result = await baseQuery({ url: '/company/director/verification', method: 'POST', body });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return failure('Your company session changed. Reload before continuing.');
        return directorVerificationView(result.data);
      },
      invalidatesTags: (_data, error) => error ? [] : ['AuthDirectorVerification'],
    }),
    getOnboardingSecurity: builder.query({
      query: () => '/profile/security-settings',
      transformResponse: (response) => {
        const data = unwrapApiResponseData(response);
        return {
          pin: {
            set: typeof data?.transactionPinSet === 'boolean' ? data.transactionPinSet : null,
            updatedOn: displayDate(data?.transactionPinChangedAt),
            lockout: pinLockoutView(data?.lockout),
            requirements: Object.fromEntries([
              ['payout', 'payouts'], ['withdraw', 'withdrawals'],
              ['bank', 'bankChanges'], ['finance-role', 'financePermissions'],
            ].map(([key, field]) => [key, typeof data?.pinRequirements?.[field] === 'boolean' ? data.pinRequirements[field] : null])),
          },
          passwordUpdatedOn: displayDate(data?.passwordChangedAt),
          twoFactor: {
            available: typeof data?.twoFactor?.available === 'boolean' ? data.twoFactor.available : null,
            enabled: typeof data?.twoFactor?.enabled === 'boolean' ? data.twoFactor.enabled : null,
            method: data?.twoFactor?.method === 'TOTP' || data?.twoFactor?.method === 'app' ? 'app' : data?.twoFactor?.method === 'sms' ? 'sms' : null,
            enabledOn: displayDate(data?.twoFactor?.enabledAt),
            backupCodesRemaining: Number.isSafeInteger(data?.twoFactor?.backupCodesRemaining) && data.twoFactor.backupCodesRemaining >= 0 ? data.twoFactor.backupCodesRemaining : null,
          },
          loginAlerts: typeof data?.signInAlerts?.enabled === 'boolean' ? data.signInAlerts.enabled : null,
        };
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
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const account = getState().auth.account;
        try {
          await queryFulfilled;
          if (!account || getState().auth.account !== account) return;
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
  useAddOnboardingTruckMutation,
  useGetOnboardingBanksQuery, useResolveOnboardingBankMutation, useGetOnboardingBankQuery,
  useSaveOnboardingBankMutation, useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation,
  useGetDirectorVerificationQuery, useSubmitDirectorVerificationMutation,
} = onboardingApi;
