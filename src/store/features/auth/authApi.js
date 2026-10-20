import { baseApi, refreshSession, unwrapApiResponseData } from '../../api/baseApi.js';
import { setCredentials } from './authSlice.js';
import { companySession } from './authSession.js';
import { companyFormBody, companyFormView, isAdultDate, registrationTermsConsent } from './onboardingContracts.js';

const post = (url, body) => ({ url, method: 'POST', body });
const unavailable = (message) => ({ error: { status: 'CUSTOM_ERROR', error: message } });
let pendingRegistration = null;

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
  endpoints: (builder) => ({
    loginAccount: builder.mutation({
      async queryFn({ email, password }, _api, _options, baseQuery) {
        const result = await baseQuery(post('/auth/login', { identifier: email.trim(), password }));
        return result.error ? result : sessionFromResponse(result.data, baseQuery, true);
      },
      onQueryStarted: storeSession,
    }),
    verifyTwoFactorLogin: builder.mutation({
      queryFn: () => unavailable('Two-factor company sign-in is not supported by the documented API. Please contact support.'),
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
        if (checked.error) return checked;
        const available = unwrapApiResponseData(checked.data)?.available;
        if (available === false) return unavailable('An account with this phone number already exists. Sign in instead.');
        if (available !== true) return unavailable('Phone availability could not be confirmed. Try again.');
        const result = await baseQuery(post('/auth/register/init', { phone: number, countryCode: '+234', role: 'TRUCKER' }));
        return result.error ? result : { data: unwrapApiResponseData(result.data) };
      },
    }),
    resendAccountCode: builder.mutation({
      query: ({ sessionToken }) => post('/auth/resend-otp', { sessionToken }),
      transformResponse: unwrapApiResponseData,
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
        if (result.error) return result;
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
        const details = await baseQuery({ url: '/profile', method: 'PATCH', body: { businessType: form.entity } });
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
  useLoginAccountMutation, useVerifyTwoFactorLoginMutation, useCheckAccountEmailMutation,
  useStartAccountRegistrationMutation, useResendAccountCodeMutation, useVerifyAccountPhoneMutation,
  useSignUpAccountMutation, useSaveOnboardingCompanyMutation, useFinishCompanyOnboardingMutation, useRefreshAccountMutation,
  useLazyGetOnboardingStatusQuery,
  useLogoutAccountMutation, useForgotAccountPasswordMutation, useResetAccountPasswordMutation,
} = authApi;
