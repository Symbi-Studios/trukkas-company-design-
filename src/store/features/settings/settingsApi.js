import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { clearSession, setCredentials } from '../auth/authSlice.js';
import { profileApi } from '../profile/profileApi.js';
import { companyFormView } from '../auth/onboardingContracts.js';
import { bankRequestResult, syncOnboardingBank } from '../auth/onboardingApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const bool = (value) => typeof value === 'boolean' ? value : null;
export const settingsUnavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const epoch = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export function settingsAccess(api, owner = false) {
  const account = api.getState().auth.account;
  const access = profileApi.endpoints.getMyProfileAccess.select()(api.getState()).data;
  if (!account || access?.companyId !== account.id || (owner ? access.isOwner !== true : access.canEdit !== true)) {
    return settingsUnavailable(owner ? 'Only the company owner can manage the team and roles.' : 'You need settings.edit permission to change company settings.');
  }
  return null;
}

export const EMPTY_COMPANY_SETTINGS = { name: '—', rcNumber: '—', email: '—', phone: '—', address: '—', founded: '—', industry: '—', verification: '—' };
function companyResult(response, api) {
  const user = unwrapApiResponseData(response)?.user;
  if (!user?.id || user.id !== api.getState().auth.account?.id || user.role !== 'TRUCKER' || user.truckerType !== 'COMPANY') return settingsUnavailable('The API did not return your company profile.');
  const details = user.companyProfile;
  return { data: {
    id: user.id,
    company: {
      ...EMPTY_COMPANY_SETTINGS, name: text(user.businessName) ?? '—', rcNumber: text(user.cacNumber) ?? '—',
      address: text(user.businessAddress) ?? '—', email: text(details?.companyEmail) ?? '—', phone: text(details?.companyPhone) ?? '—',
      founded: Number.isInteger(details?.yearFounded) && details.yearFounded >= 1900 ? String(details.yearFounded) : '—',
      industry: text(details?.industry) ?? text(user.industry) ?? '—',
      verification: ({ VERIFIED: 'Verified', IN_REVIEW: 'Pending Review', PENDING: 'Pending', REJECTED: 'Rejected' })[user.kycStatus] ?? '—',
    },
    accountChanges: { companyName: text(user.businessName) ?? '—', cacNumber: text(user.cacNumber), businessAddress: text(user.businessAddress), businessType: text(user.businessType), onboardingCompany: companyFormView(user) },
  } };
}

async function syncCompany(_arg, { dispatch, getState, queryFulfilled }) {
  const account = getState().auth.account;
  try {
    const { data } = await queryFulfilled;
    if (account && getState().auth.account === account && data?.id === account.id) dispatch(setCredentials({ account: { ...account, ...data.accountChanges } }));
  } catch { /* Keep the last confirmed company details. */ }
}

function notificationView(response) {
  const data = unwrapApiResponseData(response);
  return Object.fromEntries(['newJobs', 'tripUpdates', 'payouts', 'documents', 'reviews', 'security']
    .map((key) => [key, bool(data?.emailCategories?.[key])]));
}

export const settingsApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanySettings', 'SettingsNotifications', 'SettingsSessions'] }).injectEndpoints({
  endpoints: (builder) => ({
    updateSettingsBank: builder.mutation({
      async queryFn({ bankName, accountNumber, transactionPin }, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        if (!text(bankName) || !/^\d{10}$/.test(accountNumber || '') || !/^\d{4}$/.test(transactionPin || '')) {
          return settingsUnavailable('Choose a supported bank, enter a 10-digit account number and approve with your four-digit PIN.');
        }
        const result = await baseQuery({ url: '/wallets/bank-account', method: 'PATCH', body: { bankName, bankAccountNo: accountNumber, transactionPin } });
        return bankRequestResult(result);
      },
      onQueryStarted: syncOnboardingBank,
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingBank'],
    }),
    getCompanySettings: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const result = await baseQuery('/profile');
        return result.error ? result : companyResult(result.data, api);
      },
      onQueryStarted: syncCompany,
      providesTags: ['CompanySettings', 'Profile'],
    }),
    updateCompanySettings: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        const fields = { name: 'businessName', rcNumber: 'cacNumber', address: 'businessAddress', email: 'companyEmail', phone: 'companyPhone', founded: 'yearFounded', industry: 'industry' };
        if (Object.keys(changes).some((key) => !Object.hasOwn(fields, key))) return settingsUnavailable('The company form contains an unsupported field.');
        const body = {};
        for (const [key, value] of Object.entries(changes)) {
          if (typeof value !== 'string') return settingsUnavailable('Enter valid company details.');
          const next = value.trim();
          if (['name', 'rcNumber', 'address'].includes(key) && !next) return settingsUnavailable('Company name, RC number and address cannot be blank.');
          if (key === 'email' && next && !/^\S+@\S+\.\S+$/.test(next)) return settingsUnavailable('Enter a valid company email.');
          if (key === 'phone' && next && !/^\+?\d{10,15}$/.test(next.replace(/\s/g, ''))) return settingsUnavailable('Enter a valid company phone.');
          if (key === 'founded' && next && (!/^\d{4}$/.test(next) || Number(next) < 1900 || Number(next) > new Date().getUTCFullYear())) return settingsUnavailable('Enter a year founded between 1900 and this year.');
          if (key === 'industry' && next.length > 80) return settingsUnavailable('Industry must be 80 characters or fewer.');
          body[fields[key]] = key === 'founded' ? (next ? Number(next) : null) : key === 'phone' ? next.replace(/\s/g, '') || null : ['email', 'industry'].includes(key) ? next || null : next;
        }
        if (!Object.keys(body).length) return settingsUnavailable('There are no company changes to save.');
        const result = await baseQuery({ url: '/profile', method: 'PATCH', body });
        return result.error ? result : companyResult(result.data, api);
      },
      onQueryStarted: syncCompany,
      invalidatesTags: (_data, error) => error ? [] : ['CompanySettings', 'Profile'],
    }),
    changeSettingsPassword: builder.mutation({
      async queryFn({ currentPassword, newPassword, confirmPassword }, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        if (!text(currentPassword) || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword !== confirmPassword) return settingsUnavailable('Enter your current password and matching new passwords of at least 8 characters.');
        return baseQuery({ url: '/profile/password', method: 'PATCH', body: { currentPassword, newPassword, confirmPassword } });
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try { await queryFulfilled; dispatch(clearSession()); dispatch(baseApi.util.resetApiState()); } catch { /* The form shows the error. */ }
      },
    }),
    requestSettingsPinReset: builder.mutation({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        const result = await baseQuery({ url: '/profile/transaction-pin/forgot', method: 'POST' });
        if (result.error) {
          const seconds = unwrapApiResponseData(result.error.data)?.retryAfterSeconds;
          return { error: { ...result.error, retryAt: Number.isFinite(seconds) && seconds > 0 ? Date.now() + seconds * 1000 : null } };
        }
        const data = unwrapApiResponseData(result.data);
        if (!text(data?.message)) return settingsUnavailable('The API did not confirm that a PIN reset code was sent.');
        return { data: { expiresAt: epoch(data.expiresAt), resendAt: epoch(data.resendAvailableAt) } };
      },
    }),
    resetSettingsPin: builder.mutation({
      async queryFn({ code, newPin, confirmPin }, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !/^\d{4}$/.test(newPin) || newPin !== confirmPin) return settingsUnavailable('Enter the reset code and matching four-digit PINs.');
        const result = await baseQuery({ url: '/profile/transaction-pin/reset', method: 'POST', body: { code, newPin, confirmPin } });
        if (result.error) return result;
        return unwrapApiResponseData(result.data)?.transactionPinSet === true ? { data: { transactionPinSet: true } } : settingsUnavailable('The API did not confirm your new PIN.');
      },
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingSecurity'],
    }),
    getSettingsSessions: builder.query({
      query: () => '/profile/sessions',
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        if (!Array.isArray(data?.sessions) || data.sessions.some((row) => !row || typeof row !== 'object')) return null;
        const active = data.sessions.filter((row) => row.status === 'ACTIVE');
        return active.map((row) => ({ id: text(row.id), device: text(row.device) ?? '—', ip: text(row.ipAddress) ?? '—', location: text(row.location) ?? '—', lastActive: date(row.lastActiveAt), current: active.length === 1 ? true : null }));
      },
      providesTags: ['SettingsSessions'],
    }),
    getSettingsNotifications: builder.query({ query: () => '/profile/notification-settings', transformResponse: notificationView, providesTags: ['SettingsNotifications'] }),
    updateSettingsNotifications: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        const fields = { newJobs: 'emailNewJobs', tripUpdates: 'emailTripUpdates', payouts: 'emailPayouts', documents: 'emailDocuments', reviews: 'emailReviews' };
        const entries = Object.entries(changes);
        if (!entries.length || entries.some(([key, value]) => !Object.hasOwn(fields, key) || typeof value !== 'boolean')) return settingsUnavailable('Choose supported email preferences. Security alerts must stay on.');
        const account = api.getState().auth.account;
        const result = await baseQuery({ url: '/profile/notification-settings', method: 'PATCH', body: Object.fromEntries(entries.map(([key, value]) => [fields[key], value])) });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Please reload your preferences.');
        // Read back because older PATCH examples omit the emailCategories wrapper.
        const saved = await baseQuery('/profile/notification-settings');
        if (saved.error) return settingsUnavailable('Preferences were sent, but could not be confirmed. Reload before trying again.');
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Please reload your preferences.');
        const view = notificationView(saved.data);
        return entries.every(([key, value]) => view[key] === value) ? { data: view }
          : settingsUnavailable('The API did not confirm the saved email preferences. Reload before trying again.');
      },
      invalidatesTags: ['SettingsNotifications'],
    }),
  }),
});

export const { useUpdateSettingsBankMutation, useGetCompanySettingsQuery, useUpdateCompanySettingsMutation, useChangeSettingsPasswordMutation, useRequestSettingsPinResetMutation, useResetSettingsPinMutation, useGetSettingsSessionsQuery, useGetSettingsNotificationsQuery, useUpdateSettingsNotificationsMutation } = settingsApi;
