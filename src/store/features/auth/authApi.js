import { baseApi, refreshSession, unwrapApiResponseData } from '../../api/baseApi.js';
import { setCredentials } from './authSlice.js';
import { companySession } from './authSession.js';

const post = (url, body) => ({ url, method: 'POST', body });
const unavailable = (message) => ({ error: { status: 'CUSTOM_ERROR', error: message } });
let pendingRegistration = null;

async function sessionFromResponse(response, baseQuery) {
  const data = unwrapApiResponseData(response);
  if (typeof data?.accessToken !== 'string' || typeof data?.refreshToken !== 'string' || !data?.user?.id) {
    return unavailable('The API did not return a complete session. Please sign in again.');
  }
  const profile = await baseQuery({ url: '/profile', headers: { authorization: `Bearer ${data.accessToken}` } });
  if (profile.error) return profile;
  try {
    return { data: companySession(data, unwrapApiResponseData(profile.data)?.user) };
  } catch (error) {
    return unavailable(error.message);
  }
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

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginAccount: builder.mutation({
      async queryFn({ email, password }, _api, _options, baseQuery) {
        const result = await baseQuery(post('/auth/login', { identifier: email.trim(), password }));
        return result.error ? result : sessionFromResponse(result.data, baseQuery);
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
      query: ({ phone }) => post('/auth/register/init', { phone: phone.replace(/\s/g, ''), countryCode: '+234', role: 'TRUCKER' }),
      transformResponse: unwrapApiResponseData,
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
      async queryFn({ name, email, password, dateOfBirth, sessionToken }, _api, _options, baseQuery) {
        const names = name.trim().split(/\s+/);
        if (names.length < 2 || !dateOfBirth || !sessionToken) {
          return unavailable('Enter your first and last name, date of birth, and verify your phone before creating an account.');
        }
        let result = pendingRegistration?.sessionToken === sessionToken ? { data: pendingRegistration.response } : null;
        if (!result) result = await baseQuery(post('/auth/register/create-account', {
          sessionToken, firstName: names[0], lastName: names[names.length - 1],
          ...(names.length > 2 ? { middleName: names.slice(1, -1).join(' ') } : {}),
          dateOfBirth, email: email.trim().toLowerCase(), password, confirmPassword: password,
        }));
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        if (typeof data?.accessToken !== 'string' || typeof data?.refreshToken !== 'string' || data.user?.role !== 'TRUCKER') {
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
        if (!session.error) pendingRegistration = null;
        return session;
      },
      onQueryStarted: storeSession,
    }),
    saveOnboardingCompany: builder.mutation({
      async queryFn({ name, rcNumber, address, state, entity, directorName }, _api, _options, baseQuery) {
        const details = await baseQuery({ url: '/profile', method: 'PATCH', body: { businessType: entity, contactName: directorName.trim() } });
        if (details.error) return details;
        const result = await baseQuery(post('/auth/register/company-profile', {
          businessName: name.trim(), cacNumber: rcNumber.trim(), businessAddress: `${address.trim()}, ${state}, Nigeria`,
        }));
        return result.error ? result : { data: unwrapApiResponseData(result.data) };
      },
    }),
    finishCompanyOnboarding: builder.mutation({
      async queryFn(_arg, _api, _options, baseQuery) {
        const profile = await baseQuery('/profile');
        if (profile.error) return profile;
        const user = unwrapApiResponseData(profile.data)?.user;
        if (user?.role !== 'TRUCKER' || user?.truckerType !== 'COMPANY') return unavailable('The API could not confirm your company profile.');
        if (user.onboarding?.nextStep !== 'SUBMIT_FOR_REVIEW') {
          return { data: { onboardingStep: user.onboarding?.nextStep ?? null, onboardingComplete: user.onboarding?.complete ?? null } };
        }
        const submitted = await baseQuery(post('/auth/register/submit'));
        if (submitted.error) return submitted;
        const data = unwrapApiResponseData(submitted.data);
        return data?.status === 'PENDING_REVIEW'
          ? { data: { onboardingStep: 'AWAITING_REVIEW', onboardingComplete: false } }
          : unavailable('The API did not confirm submission for review.');
      },
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
  useLogoutAccountMutation, useForgotAccountPasswordMutation, useResetAccountPasswordMutation,
} = authApi;
