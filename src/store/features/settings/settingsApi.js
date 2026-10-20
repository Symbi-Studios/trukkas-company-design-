import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { clearSession, setCredentials } from '../auth/authSlice.js';
import { profileApi } from '../profile/profileApi.js';
import { companyFormView } from '../auth/onboardingContracts.js';
import { bankRequestResult, syncOnboardingBank } from '../auth/onboardingApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const bool = (value) => typeof value === 'boolean' ? value : null;
export const settingsUnavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const epoch = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export function settingsAccess(api, owner = false) {
  const account = api.getState().auth.account;
  const result = profileApi.endpoints.getMyProfileAccess.select()(api.getState());
  const access = result.data;
  if (!account || result.isError || access?.companyId !== account.id || (owner ? access.isOwner !== true : access.canEdit !== true)) {
    return settingsUnavailable(owner ? 'Only the company owner can manage the team and roles.' : 'You need settings.edit permission to change company settings.');
  }
  return null;
}

function settingsBankAccess(api) {
  const result = profileApi.endpoints.getMyProfileAccess.select()(api.getState());
  return result.isError || result.data?.companyId !== api.getState().auth.account?.id || result.data?.canManageBank !== true
    ? settingsUnavailable('You need finance.withdraw permission to change the payout account.') : null;
}

export function settingsCompanyQuery(api, baseQuery) {
  const identity = () => {
    const { account, activeCompanyId } = api.getState().auth;
    return JSON.stringify([account?.id, account?.actualUserId, activeCompanyId]);
  };
  const company = identity();
  return async (args) => {
    if (!api.getState().auth.account || identity() !== company) return settingsUnavailable('Your company session changed. Reload settings.');
    const result = await baseQuery(args);
    return identity() === company ? result : settingsUnavailable('Your company session changed. Reload settings.');
  };
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
      founded: Number.isInteger(details?.yearFounded) && details.yearFounded >= 1900 && details.yearFounded <= new Date().getUTCFullYear() ? String(details.yearFounded) : '—',
      industry: text(details?.industry) ?? '—',
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
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    updateSettingsBank: builder.mutation({
      async queryFn({ bankName, accountNumber, transactionPin }, api, _options, baseQuery) {
        const blocked = settingsBankAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
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
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const result = await baseQuery('/profile');
        return result.error ? result : companyResult(result.data, api);
      },
      onQueryStarted: syncCompany,
      providesTags: ['CompanySettings', 'Profile'],
    }),
    updateCompanySettings: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const fields = { name: 'businessName', rcNumber: 'cacNumber', address: 'businessAddress', email: 'companyEmail', phone: 'companyPhone', founded: 'yearFounded', industry: 'industry' };
        if (Object.keys(changes).some((key) => !Object.hasOwn(fields, key))) return settingsUnavailable('The company form contains an unsupported field.');
        const body = {};
        for (const [key, value] of Object.entries(changes)) {
          if (typeof value !== 'string') return settingsUnavailable('Enter valid company details.');
          const next = value.trim();
          if (['name', 'rcNumber', 'address'].includes(key) && !next) return settingsUnavailable('Company name, RC number and address cannot be blank.');
          if ((key === 'name' && next.length > 150) || (key === 'rcNumber' && next.length > 30) || (key === 'address' && next.length > 300)) return settingsUnavailable('Company name, RC number or address exceeds the supported length.');
          if (key === 'email' && next && !/^\S+@\S+\.\S+$/.test(next)) return settingsUnavailable('Enter a valid company email.');
          if (key === 'phone' && next && !/^\+?\d{10,15}$/.test(next.replace(/\s/g, ''))) return settingsUnavailable('Enter a valid company phone.');
          if (key === 'founded' && next && (!/^\d{4}$/.test(next) || Number(next) < 1900 || Number(next) > new Date().getUTCFullYear())) return settingsUnavailable('Enter a year founded between 1900 and this year.');
          if (key === 'industry' && next.length > 80) return settingsUnavailable('Industry must be 80 characters or fewer.');
          body[fields[key]] = key === 'founded' ? (next ? Number(next) : null) : key === 'phone' ? next.replace(/\s/g, '') || null : ['email', 'industry'].includes(key) ? next || null : next;
        }
        if (!Object.keys(body).length) return settingsUnavailable('There are no company changes to save.');
        const account = api.getState().auth.account;
        const result = await baseQuery({ url: '/profile', method: 'PATCH', body });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload company settings.');
        const saved = companyResult(result.data, api);
        if (saved.error) return saved;
        const user = unwrapApiResponseData(result.data).user;
        const nested = ['companyEmail', 'companyPhone', 'yearFounded', 'industry'];
        const confirmed = Object.entries(body).every(([key, expected]) => {
          const actual = nested.includes(key) ? user.companyProfile?.[key] : user[key];
          if (key === 'yearFounded') return expected === null ? actual == null : actual === expected;
          if (expected === null) return actual == null || actual === '';
          if (typeof actual !== 'string') return false;
          return key === 'companyEmail' ? actual.trim().toLowerCase() === expected.toLowerCase()
            : key === 'companyPhone' ? actual.replace(/\s/g, '') === expected : actual.trim() === expected;
        });
        return confirmed ? saved : settingsUnavailable('The API did not confirm the saved company changes. Reload company settings before retrying.');
      },
      onQueryStarted: syncCompany,
      invalidatesTags: (_data, error) => error ? [] : ['CompanySettings', 'Profile'],
    }),
    changeSettingsPassword: builder.mutation({
      async queryFn({ currentPassword, newPassword, confirmPassword }, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
        if (!text(currentPassword) || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword !== confirmPassword) return settingsUnavailable('Enter your current password and matching new passwords of at least 8 characters.');
        const result = await baseQuery({ url: '/profile/password', method: 'PATCH', body: { currentPassword, newPassword, confirmPassword } });
        if (result.error) return result;
        return text(unwrapApiResponseData(result.data)?.message) ? { data: { changed: true } } : settingsUnavailable('The API did not confirm the password change. Please sign in again before retrying.');
      },
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const accountId = getState().auth.account?.id, token = getState().auth.refreshToken;
        try {
          await queryFulfilled;
          if (getState().auth.account?.id === accountId && getState().auth.refreshToken === token) { dispatch(clearSession()); dispatch(baseApi.util.resetApiState()); }
        } catch { /* The form shows the error. */ }
      },
    }),
    requestSettingsPinReset: builder.mutation({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const result = await baseQuery({ url: '/profile/transaction-pin/forgot', method: 'POST' });
        if (result.error) {
          const seconds = unwrapApiResponseData(result.error.data)?.retryAfterSeconds;
          return { error: { ...result.error, retryAt: Number.isFinite(seconds) && seconds > 0 ? Date.now() + seconds * 1000 : null } };
        }
        const data = unwrapApiResponseData(result.data);
        const expiresAt = epoch(data?.expiresAt), resendAt = epoch(data?.resendAvailableAt);
        if (!text(data?.message) || expiresAt === null || resendAt === null || expiresAt <= Date.now() || resendAt > expiresAt) return settingsUnavailable('The API did not confirm the PIN reset code expiry and resend time.');
        return { data: { expiresAt, resendAt } };
      },
    }),
    resetSettingsPin: builder.mutation({
      async queryFn({ code, newPin, confirmPin }, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
        if (typeof code !== 'string' || !/^\d{6}$/.test(code) || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin) || newPin !== confirmPin) return settingsUnavailable('Enter the reset code and matching four-digit PINs.');
        const result = await baseQuery({ url: '/profile/transaction-pin/reset', method: 'POST', body: { code, newPin, confirmPin } });
        if (result.error) return result;
        return unwrapApiResponseData(result.data)?.transactionPinSet === true ? { data: { transactionPinSet: true } } : settingsUnavailable('The API did not confirm your new PIN.');
      },
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingSecurity'],
    }),
    getSettingsSessions: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const result = await settingsCompanyQuery(api, baseQuery)('/profile/sessions');
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        if (!Array.isArray(data?.sessions) || data.sessions.some((row) => !row || typeof row !== 'object' || Array.isArray(row) || !text(row.id)) || new Set(data.sessions.map((row) => row.id)).size !== data.sessions.length) return settingsUnavailable('The API did not return valid sessions.');
        const active = data.sessions.filter((row) => row.status === 'ACTIVE');
        return { data: active.map((row) => ({ id: text(row.id), device: text(row.device) ?? '—', ip: text(row.ipAddress) ?? '—', location: text(row.location) ?? '—', lastActive: date(row.lastActiveAt), current: active.length === 1 ? true : null })) };
      },
      providesTags: ['SettingsSessions'],
    }),
    getSettingsNotifications: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const result = await settingsCompanyQuery(api, baseQuery)('/profile/notification-settings');
        return result.error ? result : { data: notificationView(result.data) };
      },
      providesTags: ['SettingsNotifications'],
    }),
    updateSettingsNotifications: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = settingsAccess(api); if (blocked) return blocked;
        baseQuery = settingsCompanyQuery(api, baseQuery);
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
