import { baseApi, refreshSession, unwrapApiResponseData } from '../../api/baseApi.js';
import { setCredentials } from './authSlice.js';
import { companySession } from './authSession.js';
import { companyFormBody, companyFormView, isAdultDate, registrationTermsConsent } from './onboardingContracts.js';

const post = (url, body) => ({ url, method: 'POST', body });
const unavailable = (message) => ({ error: { status: 'CUSTOM_ERROR', error: message } });
const timestamp = (value) => typeof value === 'string' && /T/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const safeCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;

function registrationOtp(response) {
  const data = unwrapApiResponseData(response);
  const otp = data?.otp;
  const expiresAt = timestamp(otp?.expiresAt);
  const resendAvailableAt = timestamp(otp?.resendAvailableAt);
  const sessionExpiresAt = timestamp(data?.sessionExpiresAt);
  const remainingResends = safeCount(otp?.remainingResends);
  const remainingAttempts = safeCount(otp?.remainingAttempts);
  if (typeof data?.sessionToken !== 'string' || !data.sessionToken.trim()
    || !Number.isSafeInteger(otp?.length) || otp.length < 4 || otp.length > 10
    || expiresAt === null || resendAvailableAt === null || sessionExpiresAt === null
    || !Number.isSafeInteger(otp?.retryAfterSeconds) || otp.retryAfterSeconds < 0
    || remainingResends === null || remainingAttempts === null
    || expiresAt <= Date.now() || sessionExpiresAt <= Date.now() || resendAvailableAt > expiresAt) {
    return unavailable('The API did not return valid OTP expiry, resend, and attempt details. Request a new code.');
  }
  return { data: {
    sessionToken: data.sessionToken, sessionExpiresAt,
    otp: { length: otp.length, expiresAt, resendAvailableAt, retryAfterSeconds: otp.retryAfterSeconds,
      remainingResends, remainingAttempts },
  } };
}

function resentOtp(response) {
  const data = unwrapApiResponseData(response);
  const otp = data?.otp;
  const expiresAt = timestamp(otp?.expiresAt);
  const resendAvailableAt = timestamp(otp?.resendAvailableAt);
  const remainingResends = safeCount(otp?.remainingResends);
  const remainingAttempts = safeCount(otp?.remainingAttempts);
  if (!Number.isSafeInteger(otp?.length) || otp.length < 4 || otp.length > 10
    || expiresAt === null || resendAvailableAt === null
    || !Number.isSafeInteger(otp?.retryAfterSeconds) || otp.retryAfterSeconds < 0
    || remainingResends === null || remainingAttempts === null
    || expiresAt <= Date.now() || resendAvailableAt > expiresAt) {
    return unavailable('The API did not return valid OTP expiry, resend, and attempt details. Request a new code.');
  }
  return { data: { otp: { length: otp.length, expiresAt, resendAvailableAt, retryAfterSeconds: otp.retryAfterSeconds,
    remainingResends, remainingAttempts } } };
}
let pendingRegistration = null;

export const authFailureCode = (error) => error?.data?.code ?? unwrapApiResponseData(error?.data)?.code;
const existingRegistration = (result) => ['EMAIL_ALREADY_REGISTERED', 'PHONE_ALREADY_REGISTERED'].includes(authFailureCode(result.error))
  ? { data: { companyAccountRequired: true } } : result;

function loginChallenge(response, purpose) {
  const data = unwrapApiResponseData(response);
  if (data?.twoFactorRequired !== true) return null;
  if (typeof data.challengeId !== 'string' || !data.challengeId.trim() || data.method !== 'TOTP'
    || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) {
    return unavailable('The API did not return a valid sign-in challenge. Please sign in again.');
  }
  return { data: { twoFactorRequired: true, challenge: { id: data.challengeId, method: 'app', expiresAt: data.expiresAt, purpose } } };
}

function twoFactorBody({ challengeId, code, backupCode }) {
  if (typeof challengeId !== 'string' || !challengeId.trim()) return null;
  if (typeof backupCode === 'string' && /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(backupCode.trim())) return { challengeId, backupCode: backupCode.trim().toUpperCase() };
  return typeof code === 'string' && /^\d{6}$/.test(code) ? { challengeId, code } : null;
}

async function companyLoginResult(response, baseQuery) {
  return loginChallenge(response, 'companyLogin') ?? sessionFromResponse(response, baseQuery, true);
}

async function addCompanyFromSession(response, password, identifier, baseQuery) {
  const session = unwrapApiResponseData(response);
  if (session?.user?.role === 'TRUCKER') return companyLoginResult(response, baseQuery);
  if (!['FORWARDER', 'DRIVER'].includes(session?.user?.role) || !session.user.id
    || typeof session.accessToken !== 'string' || !session.accessToken.trim()
    || typeof session.refreshToken !== 'string' || !session.refreshToken.trim()) {
    return unavailable('The API did not confirm your existing account. Please sign in again.');
  }
  // The existing account's tokens remain inside this request. Only a confirmed
  // company session may enter the company app's auth state or storage.
  const added = await baseQuery({ ...post('/auth/accounts', { role: 'TRUCKER', password }), headers: { authorization: 'Bearer ' + session.accessToken } });
  if (added.error) {
    if (authFailureCode(added.error) === 'ACCOUNT_ROLE_EXISTS') {
      const login = await baseQuery(post('/auth/login', { identifier, password, accountRole: 'TRUCKER' }));
      return login.error ? login : companyLoginResult(login.data, baseQuery);
    }
    return added;
  }
  if (unwrapApiResponseData(added.data)?.user?.role !== 'TRUCKER') return unavailable('The API did not confirm the new trucking account. Sign in to resume company setup.');
  return companyLoginResult(added.data, baseQuery);
}

async function sessionFromResponse(response, baseQuery, resumeCompanySelection = false) {
  const data = unwrapApiResponseData(response);
  if (typeof data?.accessToken !== 'string' || !data.accessToken.trim()
    || typeof data?.refreshToken !== 'string' || !data.refreshToken.trim() || !data?.user?.id) {
    return unavailable('The API did not return a complete session. Please sign in again.');
  }
  const headers = { authorization: `Bearer ${data.accessToken}` };
  let profile = await baseQuery({ url: '/profile', headers });
  if (profile.error) return profile;
  const user = unwrapApiResponseData(profile.data)?.user;
  // Resume an interrupted company signup without recreating the account. Never
  // change an existing INDIVIDUAL account or a team member's account type.
  if (resumeCompanySelection && user?.id === data.user.id && user.role === 'TRUCKER'
    && user.truckerType === null && user.onboarding?.complete === false) {
    const selected = await baseQuery({ ...post('/auth/register/trucker-type', { truckerType: 'COMPANY' }), headers });
    if (selected.error) return selected;
    profile = await baseQuery({ url: '/profile', headers });
    if (profile.error) return profile;
  }
  const access = await baseQuery({ url: '/team/me', headers: { authorization: `Bearer ${data.accessToken}` } });
  if (access.error) return access;
  try {
    return { data: companySession(data, unwrapApiResponseData(profile.data)?.user, unwrapApiResponseData(access.data)) };
  } catch (error) {
    return unavailable(error.message);
  }
}

function onboardingAccount(user, companyId, companyProfile) {
  if (!companyId || user?.id !== companyId || user.role !== 'TRUCKER' || user.truckerType !== 'COMPANY'
    || typeof user.onboarding?.complete !== 'boolean'
    || (user.onboarding.complete === false && (typeof user.onboarding.nextStep !== 'string' || !user.onboarding.nextStep.trim()))) {
    throw new Error('The API could not confirm your company registration progress. Please try again.');
  }
  return {
    companyName: typeof user.businessName === 'string' && user.businessName.trim() ? user.businessName : '—',
    cacNumber: typeof user.cacNumber === 'string' ? user.cacNumber : null,
    businessAddress: typeof user.businessAddress === 'string' ? user.businessAddress : null,
    businessType: typeof user.businessType === 'string' ? user.businessType : null,
    phoneVerified: typeof user.phoneVerified === 'boolean' ? user.phoneVerified : null,
    kycStatus: typeof user.kycStatus === 'string' ? user.kycStatus : null,
    kycRejectionReason: typeof user.kyc?.rejectionReason === 'string' && user.kyc.rejectionReason.trim() ? user.kyc.rejectionReason.trim() : null,
    registrationTermsConsent: registrationTermsConsent(user),
    onboardingCompany: companyFormView(user, companyProfile),
    onboardingStep: user.onboarding.nextStep ?? null,
    onboardingComplete: user.onboarding.complete,
  };
}

async function storeSession(_arg, { dispatch, getState, queryFulfilled }) {
  const previousToken = getState().auth.refreshToken;
  try {
    const { data } = await queryFulfilled;
    if (getState().auth.refreshToken !== previousToken) return;
    if (!data?.account || !data.accessToken || !data.refreshToken) return;
    dispatch(setCredentials(data));
  } catch {
    // The form owns the request error; never create a partial local session.
  }
}

function companyRequestAccount(api) {
  const account = api.getState().auth.account;
  return account?.id && account.apiRole === 'TRUCKER' && account.truckerType === 'COMPANY' ? account : null;
}

const changedSession = () => unavailable('Your company session changed while this request was running. Please reload before continuing.');

async function syncOnboardingAccount(_arg, { dispatch, getState, queryFulfilled }) {
  const account = getState().auth.account;
  try {
    const { data } = await queryFulfilled;
    if (!account || getState().auth.account !== account) return;
    dispatch(setCredentials({ account: { ...account, ...data } }));
  } catch {
    // The form owns the error. Only confirmed responses update registration progress.
  }
}

export const authApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    loginAccount: builder.mutation({
      async queryFn({ email, password }, _api, _options, baseQuery) {
        const result = await baseQuery(post('/auth/login', { identifier: email.trim(), password, accountRole: 'TRUCKER' }));
        if (authFailureCode(result.error) === 'NO_ACCOUNT_FOR_ROLE') {
          const roles = unwrapApiResponseData(result.error.data)?.availableRoles;
          return { data: { companyAccountRequired: true, availableRoles: Array.isArray(roles) ? roles.filter((role) => ['FORWARDER', 'DRIVER'].includes(role)) : [] } };
        }
        return result.error ? result : companyLoginResult(result.data, baseQuery);
      },
      onQueryStarted: storeSession,
    }),
    verifyTwoFactorLogin: builder.mutation({
      async queryFn(values, _api, _options, baseQuery) {
        const body = twoFactorBody(values);
        if (!body) return unavailable('Enter a six-digit authenticator code or an eight-character backup code.');
        const result = await baseQuery(post('/auth/2fa/verify', body));
        return result.error ? result : sessionFromResponse(result.data, baseQuery, true);
      },
      onQueryStarted: storeSession,
    }),
    addCompanyAccount: builder.mutation({
      async queryFn({ email, password, challengeId, challengePurpose, code, backupCode }, _api, _options, baseQuery) {
        if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim()) || typeof password !== 'string' || !password) return unavailable('Enter your existing Trukkas email and current password.');
        const identifier = email.trim();
        if (challengeId) {
          const body = twoFactorBody({ challengeId, code, backupCode });
          if (!body) return unavailable('Enter a six-digit authenticator code or an eight-character backup code.');
          const verified = await baseQuery(post('/auth/2fa/verify', body));
          if (verified.error) return verified;
          return challengePurpose === 'companyLogin' ? sessionFromResponse(verified.data, baseQuery, true) : addCompanyFromSession(verified.data, password, identifier, baseQuery);
        }
        // A retry after a partial success resumes the account already created.
        const company = await baseQuery(post('/auth/login', { identifier, password, accountRole: 'TRUCKER' }));
        if (!company.error) return companyLoginResult(company.data, baseQuery);
        if (authFailureCode(company.error) !== 'NO_ACCOUNT_FOR_ROLE') return company;
        const roles = unwrapApiResponseData(company.error.data)?.availableRoles;
        let existing = await baseQuery(post('/auth/login', { identifier, password }));
        if (authFailureCode(existing.error) === 'ACCOUNT_SELECTION_REQUIRED') {
          // Either existing role can authorize adding the missing company role.
          const role = Array.isArray(roles) ? ['FORWARDER', 'DRIVER'].find((item) => roles.includes(item)) : null;
          if (!role) return existing;
          existing = await baseQuery(post('/auth/login', { identifier, password, accountRole: role }));
        }
        if (existing.error) return existing;
        return loginChallenge(existing.data, 'addCompanyAccount') ?? addCompanyFromSession(existing.data, password, identifier, baseQuery);
      },
      onQueryStarted: storeSession,
    }),
    checkAccountEmail: builder.mutation({
      query: ({ email }) => post('/auth/check-email', { email: email.trim() }),
      transformResponse: unwrapApiResponseData,
    }),
    startAccountRegistration: builder.mutation({
      async queryFn({ phone }, _api, _options, baseQuery) {
        const number = typeof phone === 'string' ? phone.replace(/\s/g, '') : '';
        if (!/^\+234\d{10}$/.test(number)) return unavailable('Enter a valid Nigerian mobile number.');
        const checked = await baseQuery(post('/auth/check-phone', { phone: number }));
        if (checked.error) return existingRegistration(checked);
        const available = unwrapApiResponseData(checked.data)?.available;
        if (available === false) return { data: { companyAccountRequired: true } };
        if (available !== true) return unavailable('Phone availability could not be confirmed. Try again.');
        const result = await baseQuery(post('/auth/register/init', { phone: number, countryCode: '+234', role: 'TRUCKER' }));
        return result.error ? existingRegistration(result) : registrationOtp(result.data);
      },
    }),
    resendAccountCode: builder.mutation({
      async queryFn({ sessionToken }, _api, _options, baseQuery) {
        if (typeof sessionToken !== 'string' || !sessionToken.trim()) return unavailable('Start phone verification again to request a new code.');
        const result = await baseQuery(post('/auth/resend-otp', { sessionToken }));
        return result.error ? result : resentOtp(result.data);
      },
    }),
    verifyAccountPhone: builder.mutation({
      query: ({ sessionToken, code }) => post('/auth/register/verify-otp', { sessionToken, code }),
      transformResponse: unwrapApiResponseData,
    }),
    signUpAccount: builder.mutation({
      async queryFn({ name, email, password, dateOfBirth, sessionToken, acceptedTerms }, _api, _options, baseQuery) {
        const names = name.trim().split(/\s+/);
        if (acceptedTerms !== true) return unavailable('Accept the terms to continue.');
        if (names.length < 2 || !dateOfBirth || !sessionToken) {
          return unavailable('Enter your first and last name, date of birth, and verify your phone before creating an account.');
        }
        if (!isAdultDate(dateOfBirth)) return unavailable('You must be at least 18 years old to register.');
        if (!/^\S+@\S+\.\S+$/.test(email.trim()) || typeof password !== 'string' || password.length < 8) {
          return unavailable('Enter a valid email and a password with at least 8 characters.');
        }
        let result = pendingRegistration?.sessionToken === sessionToken ? { data: pendingRegistration.response } : null;
        if (!result) result = await baseQuery(post('/auth/register/create-account', {
          sessionToken, firstName: names[0], lastName: names[names.length - 1],
          ...(names.length > 2 ? { middleName: names.slice(1, -1).join(' ') } : {}),
          dateOfBirth, email: email.trim().toLowerCase(), password, confirmPassword: password, acceptedTerms,
        }));
        if (result.error) return existingRegistration(result);
        const data = unwrapApiResponseData(result.data);
        if (typeof data?.accessToken !== 'string' || !data.accessToken.trim()
          || typeof data?.refreshToken !== 'string' || !data.refreshToken.trim() || data.user?.role !== 'TRUCKER') {
          return unavailable('The API did not return a trucking account session. Please sign in again.');
        }
        pendingRegistration = { sessionToken, response: result.data, selected: pendingRegistration?.sessionToken === sessionToken && pendingRegistration.selected };
        const selected = pendingRegistration.selected ? { data: {} } : await baseQuery({
          ...post('/auth/register/trucker-type', { truckerType: 'COMPANY' }),
          headers: { authorization: `Bearer ${data.accessToken}` },
        });
        if (selected.error) return unavailable('Your account was created, but company setup could not be completed. Retry verification to continue company setup; do not register again.');
        pendingRegistration.selected = true;
        const session = await sessionFromResponse(result.data, baseQuery);
        if (!session.error) {
          session.data.account.registrationTermsConsent = true;
          pendingRegistration = null;
        }
        return session;
      },
      onQueryStarted: storeSession,
    }),
    saveOnboardingCompany: builder.mutation({
      async queryFn(form, api, _options, baseQuery) {
        const account = companyRequestAccount(api);
        if (!account) return unavailable('Sign in with your company account to save registration details.');
        let body;
        try { body = companyFormBody(form); }
        catch (error) { return unavailable(error.message); }
        if (typeof form.entity !== 'string' || !form.entity.trim()) return unavailable('Choose a business type.');
        const details = await baseQuery({ url: '/profile', method: 'PATCH', body: {
          businessType: form.entity, directorName: form.directorName.trim(),
          directorDateOfBirth: form.directorDob, ...(form.role?.trim() ? { directorRole: form.role.trim() } : {}),
        } });
        if (details.error) return details;
        if (api.getState().auth.account !== account) return changedSession();
        const result = await baseQuery(post('/auth/register/company-profile', body));
        if (result.error) return result;
        if (api.getState().auth.account !== account) return changedSession();
        const data = unwrapApiResponseData(result.data);
        const resultProfile = await baseQuery('/profile');
        if (resultProfile.error) return unavailable('Company details were saved, but the updated profile could not be loaded. Sign in again to resume setup.');
        if (api.getState().auth.account !== account) return changedSession();
        const user = unwrapApiResponseData(resultProfile.data)?.user;
        try { return { data: onboardingAccount(user, account.id, data?.companyProfile) }; }
        catch (error) { return unavailable(error.message); }
      },
      onQueryStarted: syncOnboardingAccount,
      invalidatesTags: (_data, error) => error ? [] : ['AuthDirectorVerification'],
    }),
    retryCompanyVerification: builder.mutation({
      async queryFn(_arg, api, _options, baseQuery) {
        const account = companyRequestAccount(api);
        if (!account) return unavailable('Sign in with your company account to retry business verification.');
        const current = await baseQuery('/profile');
        if (current.error) return current;
        if (api.getState().auth.account !== account) return changedSession();
        const user = unwrapApiResponseData(current.data)?.user;
        if (user?.id !== account.id || user.role !== 'TRUCKER' || user.truckerType !== 'COMPANY') return unavailable('The API did not confirm this company profile.');
        if (user.kycStatus !== 'REJECTED') return unavailable('Company verification can only be retried after a rejection.');
        if (![user.businessName, user.cacNumber, user.businessAddress].every((value) => typeof value === 'string' && value.trim())) return unavailable('Save the company name, RC/BN number and business address before retrying.');
        const submitted = await baseQuery(post('/auth/register/verify-business'));
        if (submitted.error) return submitted;
        const response = unwrapApiResponseData(submitted.data);
        if (response?.kycStatus !== 'IN_REVIEW') return unavailable('The API did not confirm that the company verification was resubmitted.');
        const readback = await baseQuery('/profile');
        if (readback.error) return unavailable('The retry was submitted, but the company status could not be reloaded. Refresh the page before trying again.');
        if (api.getState().auth.account !== account) return changedSession();
        try {
          const progress = onboardingAccount(unwrapApiResponseData(readback.data)?.user, account.id);
          return progress.kycStatus === 'IN_REVIEW' ? { data: progress } : unavailable('The API did not confirm the updated company verification status.');
        } catch (error) { return unavailable(error.message); }
      },
      onQueryStarted: syncOnboardingAccount,
      invalidatesTags: (_data, error) => error ? [] : ['AuthOnboardingStatus', 'CompanyDashboard'],
    }),
    getOnboardingStatus: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const account = companyRequestAccount(api);
        if (!account) return unavailable('Sign in with your company account to resume registration.');
        const result = await baseQuery('/profile');
        if (result.error) return result;
        if (api.getState().auth.account !== account) return changedSession();
        try { return { data: onboardingAccount(unwrapApiResponseData(result.data)?.user, account.id) }; }
        catch (error) { return unavailable(error.message); }
      },
      onQueryStarted: syncOnboardingAccount,
      providesTags: ['AuthOnboardingStatus'],
    }),
    finishCompanyOnboarding: builder.mutation({
      async queryFn({ acceptedTerms } = {}, api, _options, baseQuery) {
        const account = companyRequestAccount(api);
        if (!account) return unavailable('Sign in with your company account to finish registration.');
        const profile = await baseQuery('/profile');
        if (profile.error) return profile;
        if (api.getState().auth.account !== account) return changedSession();
        const user = unwrapApiResponseData(profile.data)?.user;
        let progress;
        try { progress = onboardingAccount(user, account.id); }
        catch (error) { return unavailable(error.message); }
        if (user.onboarding?.nextStep !== 'SUBMIT_FOR_REVIEW') {
          return { data: progress };
        }
        const submitted = await baseQuery(post('/auth/register/submit', acceptedTerms === true ? { acceptedTerms: true } : undefined));
        if (submitted.error) return submitted;
        if (api.getState().auth.account !== account) return changedSession();
        const data = unwrapApiResponseData(submitted.data);
        return data?.status === 'PENDING_REVIEW'
          ? { data: { ...progress, onboardingStep: 'AWAITING_REVIEW', onboardingComplete: false } }
          : unavailable('The API did not confirm submission for review.');
      },
      onQueryStarted: syncOnboardingAccount,
    }),
    refreshAccount: builder.mutation({
      async queryFn(_arg, api, options) {
        const result = await refreshSession(api, options);
        return result.status === 'success' ? { data: { refreshed: true } }
          : { error: result.error || { status: 'CUSTOM_ERROR', error: 'The session changed. Please try again.' } };
      },
    }),
    logoutAccount: builder.mutation({
      query: () => post('/auth/logout'),
      transformResponse: unwrapApiResponseData,
    }),
    forgotAccountPassword: builder.mutation({
      query: ({ email }) => post('/auth/forgot-password', { email: email.trim() }),
      transformResponse: unwrapApiResponseData,
    }),
    resetAccountPassword: builder.mutation({
      query: ({ email, token, newPassword }) => post('/auth/reset-password', { email: email.trim(), otp: token.trim(), newPassword }),
      transformResponse: unwrapApiResponseData,
    }),
  }),
});

export const {
  useLoginAccountMutation, useVerifyTwoFactorLoginMutation, useAddCompanyAccountMutation, useCheckAccountEmailMutation,
  useStartAccountRegistrationMutation, useResendAccountCodeMutation, useVerifyAccountPhoneMutation,
  useSignUpAccountMutation, useSaveOnboardingCompanyMutation, useFinishCompanyOnboardingMutation, useRefreshAccountMutation,
  useLazyGetOnboardingStatusQuery, useRetryCompanyVerificationMutation,
  useLogoutAccountMutation, useForgotAccountPasswordMutation, useResetAccountPasswordMutation,
} = authApi;
