import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { clearSession, setCredentials } from '../features/auth/authSlice.js';
import { getApiErrorMessage } from './getApiErrorMessage.js';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://trukkas-backend.onrender.com/api/v1';
const baseUrl = configuredBaseUrl.replace(/\/+$/, '');
const apiLoggingDisabled = String(process.env.NEXT_PUBLIC_API_LOGGING ?? '').trim().toLowerCase() === 'false';
const apiLoggingEnabled = process.env.NODE_ENV !== 'production' && !apiLoggingDisabled;
const publicEndpoints = new Set([
  'loginAccount', 'signUpAccount', 'refreshAccount', 'forgotAccountPassword', 'resetAccountPassword',
  'checkAccountEmail', 'startAccountRegistration', 'resendAccountCode', 'verifyAccountPhone',
]);
const reauthExcludedPaths = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);
const retryableAfterRefresh = new Set(['markNotificationsRead', 'markAllNotificationsRead']);

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders(headers, { endpoint, getState }) {
    const token = getState().auth.accessToken;
    if (token && !publicEndpoints.has(endpoint)) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// A refresh request must not carry an expired access token.
const refreshBaseQuery = fetchBaseQuery({ baseUrl });
let activeRefresh = null;

let requestSequence = 0;

const privateLogField = /authorization|cookie|token|password|secret|credential|otp|^code$|pin|email|phone|name|address|destination|^origin$|latitude|longitude|coordinates|location|description|details|dateofbirth|\bdob\b|nin|bvn|bio|avatar|photo|content|message|attachment|^body$|reason|comment|instruction|notes?/i;
function bodyForLog(body) {
  // Never expose credentials, personal detail fields, or conversation content.
  if (body instanceof FormData || body instanceof URLSearchParams) {
    return Array.from(body.entries(), ([key, value]) => [key, privateLogField.test(key) ? '[REDACTED]' : bodyForLog(value)]);
  }
  if (typeof File !== 'undefined' && body instanceof File) return '[FILE]';
  if (Array.isArray(body)) return body.map(bodyForLog);
  if (body && typeof body === 'object') {
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, privateLogField.test(key) ? '[REDACTED]' : bodyForLog(value)]));
  }
  return body;
}

function requestUrlForLog(args) {
  const config = typeof args === 'string' ? { url: args } : args;
  const path = config.url || '';
  let url = /^[a-z][a-z\d+.-]*:|^\/\//i.test(path)
    ? path
    : baseUrl + (path.startsWith('?') ? '' : '/') + path.replace(/^\/+/, '');
  if (config.params) {
    const params = config.params instanceof URLSearchParams ? config.params
      : new URLSearchParams(Object.fromEntries(Object.entries(config.params).filter(([, value]) => value !== undefined)));
    url += (url.includes('?') ? '&' : '?') + params.toString();
  }
  return url;
}

async function runLoggedBaseQuery(query, args, api, extraOptions, label = api.endpoint) {
  if (!apiLoggingEnabled) return query(args, api, extraOptions);

  const requestId = ++requestSequence;
  const prefix = '[API #' + requestId + '] ';
  const startedAt = Date.now();
  const config = typeof args === 'string' ? { url: args } : args;
  const details = {
    requestId,
    endpoint: label,
    operation: api.type,
    method: (config.method || 'GET').toUpperCase(),
    url: requestUrlForLog(args),
    params: config.params,
    configuredHeaders: bodyForLog(Object.fromEntries(new Headers(config.headers).entries())),
    body: bodyForLog(config.body),
    startedAt: new Date(startedAt).toISOString(),
  };

  // Log immediately so requests that are pending or fail are still visible.
  console.info(prefix + 'REQUEST ' + details.method + ' ' + details.url, details);

  let result;
  try {
    result = await query(args, api, extraOptions);
  } catch (error) {
    console.error(prefix + 'FAILED ' + details.method + ' ' + details.url, {
      request: details,
      durationMs: Date.now() - startedAt,
      completedAt: new Date().toISOString(),
      error,
    });
    throw error;
  }

  const request = result.meta?.request;
  const response = result.meta?.response;
  const statusCode = response?.status
    ?? (result.error?.status === 'PARSING_ERROR' ? result.error.originalStatus
      : typeof result.error?.status === 'number' ? result.error.status : null);
  const method = request?.method || details.method;
  const url = request?.url || details.url;
  const durationMs = Date.now() - startedAt;
  const responseBody = result.error ? result.error.data : result.data;

  console.groupCollapsed(prefix + method + ' ' + url + ' → '
    + (statusCode ?? result.error?.status ?? 'complete') + ' (' + durationMs + 'ms)');
  console.info('Request:', {
    ...details,
    method,
    url,
    headers: request ? bodyForLog(Object.fromEntries(request.headers.entries())) : details.configuredHeaders,
  });
  console.info('Response:', {
    requestId,
    endpoint: label,
    statusCode,
    statusText: response?.statusText,
    ok: response?.ok,
    url: response?.url,
    headers: response ? bodyForLog(Object.fromEntries(response.headers.entries())) : undefined,
    redirected: response?.redirected,
    type: response?.type,
    durationMs,
    completedAt: new Date().toISOString(),
    body: bodyForLog(responseBody),
  });
  if (result.error) {
    const message = getApiErrorMessage(result.error);
    const transportMessage = typeof result.error.error === 'string' ? result.error.error : null;
    // RTK Query returns handled request failures as data. console.error would
    // turn these (including recoverable 401s) into Next.js development overlays.
    console.warn(prefix + method + ' ' + url + ' → '
      + (statusCode ?? result.error.status ?? 'REQUEST_ERROR') + ': ' + message
      + (transportMessage && transportMessage !== message ? ' ' + transportMessage : ''), {
      requestId,
      endpoint: label,
      method,
      url,
      status: result.error.status ?? null,
      statusCode,
      message,
      transportMessage,
      durationMs,
      body: bodyForLog(responseBody),
    });
  }
  console.groupEnd();
  return result;
}

function isTerminalRefreshError(error) {
  const status = error?.status === 'PARSING_ERROR' ? error.originalStatus : error?.status;
  return [400, 401, 403, 422].includes(status);
}

function clearExpiredSession(api, expectedRefreshToken) {
  if (expectedRefreshToken && api.getState().auth.refreshToken !== expectedRefreshToken) return;
  api.dispatch(clearSession());
  api.dispatch(baseApi.util.resetApiState());
}

export function unwrapApiResponseData(response) {
  let data = response;
  while (
    data && typeof data === 'object' && !Array.isArray(data)
    && data.data && typeof data.data === 'object' && !Array.isArray(data.data)
  ) {
    data = data.data;
  }
  return data;
}

async function performRefresh(refreshToken, api, extraOptions) {
  const result = await runLoggedBaseQuery(refreshBaseQuery, {
    url: '/auth/refresh',
    method: 'POST',
    body: { refreshToken },
  }, api, extraOptions, 'refreshAccount');

  // A logout or newer login may have happened while the request was in flight.
  if (api.getState().auth.refreshToken !== refreshToken) return { status: 'stale' };
  if (result.error) {
    if (isTerminalRefreshError(result.error)) clearExpiredSession(api, refreshToken);
    return { status: 'failed', error: result.error };
  }
  const data = unwrapApiResponseData(result.data);
  if (typeof data?.accessToken !== 'string' || !data.accessToken.trim()) {
    clearExpiredSession(api, refreshToken);
    return { status: 'failed', error: { status: 'CUSTOM_ERROR', error: 'The refresh response is missing session details.' } };
  }

  api.dispatch(setCredentials({
    accessToken: data.accessToken,
    refreshToken: typeof data.refreshToken === 'string' && data.refreshToken.trim() ? data.refreshToken : refreshToken,
  }));
  return { status: 'success' };
}

export function refreshSession(api, extraOptions) {
  const refreshToken = api.getState().auth.refreshToken;
  if (!refreshToken) return Promise.resolve({ status: 'failed', error: { status: 401, data: { message: 'Please sign in again.' } } });

  if (!activeRefresh || activeRefresh.refreshToken !== refreshToken) {
    const entry = { refreshToken, promise: performRefresh(refreshToken, api, extraOptions) };
    activeRefresh = entry;
    void entry.promise.finally(() => {
      if (activeRefresh === entry) activeRefresh = null;
    });
  }
  return activeRefresh.promise;
}

async function baseQueryWithReauth(args, api, extraOptions) {
  const requestToken = api.getState().auth.accessToken;
  let result = await runLoggedBaseQuery(rawBaseQuery, args, api, extraOptions);
  const path = (typeof args === 'string' ? args : args.url).split('?')[0];
  const method = (typeof args === 'string' ? 'GET' : args.method || 'GET').toUpperCase();
  const safeToRetry = ['GET', 'HEAD', 'OPTIONS'].includes(method) || retryableAfterRefresh.has(api.endpoint);

  // This 401 is a rejected financial approval, not an expired login session.
  if (unwrapApiResponseData(result.error?.data)?.code === 'TRANSACTION_PIN_INVALID') return result;
  if (result.error?.status !== 401 || publicEndpoints.has(api.endpoint) || reauthExcludedPaths.has(path)) return result;

  const currentToken = api.getState().auth.accessToken;
  if (safeToRetry && currentToken && currentToken !== requestToken) {
    return runLoggedBaseQuery(rawBaseQuery, args, api, extraOptions, `${api.endpoint} (retry)`);
  }
  if (!api.getState().auth.refreshToken) {
    clearExpiredSession(api);
    return result;
  }

  const refresh = await refreshSession(api, extraOptions);
  if (refresh.status === 'success' && safeToRetry) {
    result = await runLoggedBaseQuery(rawBaseQuery, args, api, extraOptions, `${api.endpoint} (retry)`);
    if (result.error?.status === 401) clearExpiredSession(api);
  }
  return result;
}

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notifications', 'AuthOnboardingDocuments', 'AuthOnboardingTrucks', 'AuthOnboardingBank', 'AuthOnboardingSecurity'],
  endpoints: () => ({}),
});
