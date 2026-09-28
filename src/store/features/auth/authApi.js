import { baseApi } from '../../api/baseApi.js';
import { setCredentials } from './authSlice.js';
import { MOCK_CREDENTIALS } from '../../../mock/fixtures/account.js';
import { checkPassword, emailTaken, registerAccount } from '../../../mock/accounts.js';
import { setActiveAccount, startCompanyWorkspace, twoFactorStatus, verifyTwoFactorCode } from '../../../mock/api.js';

// Mock-gated: no live company-facing auth endpoint has been verified against
// the API spec yet (see AGENTS.md, "Backend API reference and integration").
// Sign in with the seeded MOCK_CREDENTIALS above, or an account created via
// /signup during this session (kept in memory by mock/accounts.js). Swap these queryFns for
// real `/auth/*` calls (mirroring the retired admin authApi) once confirmed.
const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function issueMockToken(subject, ttlSeconds = 60 * 60) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${header}.${payload}.mock`;
}

function sessionFor(account) {
  setActiveAccount(account.id);
  return {
    account,
    accessToken: issueMockToken(account.id),
    refreshToken: issueMockToken(account.id, 60 * 60 * 24 * 14),
  };
}

function setSession(data) {
  return setCredentials({
    account: data.account,
    activeCompanyId: data.account.companyIds[0],
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginAccount: builder.mutation({
      async queryFn({ email, password }) {
        await delay();
        const account = await checkPassword(email, password);
        if (!account) {
          return { error: { status: 401, data: { message: 'Incorrect email or password.' } } };
        }
        const twoFactor = twoFactorStatus(account.id);
        if (twoFactor) {
          // Second factor required: no tokens are issued until the code checks out.
          return { data: { twoFactorRequired: true, challenge: { accountId: account.id, email: account.email, ...twoFactor } } };
        }
        return { data: sessionFor(account) };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data.account) dispatch(setSession(data));
      },
    }),
    verifyTwoFactorLogin: builder.mutation({
      async queryFn({ email, password, code }) {
        await delay();
        const account = await checkPassword(email, password);
        if (!account) return { error: { status: 401, data: { message: 'Your session expired. Sign in again.' } } };
        if (!(await verifyTwoFactorCode(account.id, code))) {
          return { error: { status: 401, data: { message: 'That code is incorrect or expired.' } } };
        }
        return { data: sessionFor(account) };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSession(data));
      },
    }),
    signUpAccount: builder.mutation({
      async queryFn({ name, email, phone, password, companyName }) {
        await delay(400);
        if (await emailTaken(email)) {
          return { error: { status: 409, data: { message: 'An account with this email already exists. Sign in instead.' } } };
        }
        const id = `ACCT-${Date.now().toString(36).toUpperCase()}`;
        const account = {
          id, name: name.trim(), email: email.trim().toLowerCase(), phone, role: 'Owner', roleId: 'owner', title: '',
          companyIds: [`CMP-${id.slice(5)}`], companyName: companyName || '', emailVerified: true, phoneVerified: true, isNewCompany: true,
        };
        await registerAccount(account, password);
        startCompanyWorkspace(account, { name: companyName });
        return { data: sessionFor(account) };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSession(data));
      },
    }),
    refreshAccount: builder.mutation({
      async queryFn(_arg, api) {
        await delay(120);
        const current = api.getState().auth;
        if (!current.account || !current.refreshToken) {
          return { error: { status: 401, data: { message: 'Please sign in again.' } } };
        }
        return { data: { accessToken: issueMockToken(current.account.id) } };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({ accessToken: data.accessToken }));
      },
    }),
    logoutAccount: builder.mutation({
      async queryFn() {
        await delay(120);
        return { data: { message: 'Signed out.' } };
      },
    }),
    forgotAccountPassword: builder.mutation({
      async queryFn({ email }) {
        await delay();
        if (email.trim().toLowerCase() !== MOCK_CREDENTIALS.email) {
          // Do not reveal whether an email is registered.
          return { data: { message: 'If that email is registered, a reset link has been sent.' } };
        }
        return { data: { message: 'If that email is registered, a reset link has been sent.' } };
      },
    }),
    resetAccountPassword: builder.mutation({
      async queryFn({ email, token }) {
        await delay();
        if (!token.trim()) return { error: { status: 400, data: { message: 'Enter the token from your reset email.' } } };
        if (email.trim().toLowerCase() !== MOCK_CREDENTIALS.email) {
          return { error: { status: 400, data: { message: 'This reset link is no longer valid.' } } };
        }
        return { data: { message: 'Password updated.' } };
      },
    }),
  }),
});

export const {
  useLoginAccountMutation,
  useVerifyTwoFactorLoginMutation,
  useSignUpAccountMutation,
  useRefreshAccountMutation,
  useLogoutAccountMutation,
  useForgotAccountPasswordMutation,
  useResetAccountPasswordMutation,
} = authApi;
