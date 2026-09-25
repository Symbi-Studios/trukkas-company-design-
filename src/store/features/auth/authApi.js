import { baseApi } from '../../api/baseApi.js';
import { setCredentials } from './authSlice.js';
import { account, MOCK_CREDENTIALS } from '../../../mock/fixtures/account.js';

// Mock-gated: no live company-facing auth endpoint has been verified against
// the API spec yet (see AGENTS.md, "Backend API reference and integration").
// Sign in with the seeded MOCK_CREDENTIALS above. Swap these queryFns for
// real `/auth/*` calls (mirroring the retired admin authApi) once confirmed.
const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

function issueMockToken(subject, ttlSeconds = 60 * 60) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${header}.${payload}.mock`;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginAccount: builder.mutation({
      async queryFn({ email, password }) {
        await delay();
        if (email.trim().toLowerCase() !== MOCK_CREDENTIALS.email || password !== MOCK_CREDENTIALS.password) {
          return { error: { status: 401, data: { message: 'Incorrect email or password.' } } };
        }
        return {
          data: {
            account,
            accessToken: issueMockToken(account.id),
            refreshToken: issueMockToken(account.id, 60 * 60 * 24 * 14),
          },
        };
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({
          account: data.account,
          activeCompanyId: data.account.companyIds[0],
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }));
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
  useRefreshAccountMutation,
  useLogoutAccountMutation,
  useForgotAccountPasswordMutation,
  useResetAccountPasswordMutation,
} = authApi;
