import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { clearSession, setCredentials } from '../features/auth/authSlice.js';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://trukkas-backend.onrender.com/api/v1';
const baseUrl = configuredBaseUrl.replace(/\/+$/, '');
const apiLoggingDisabled = String(process.env.NEXT_PUBLIC_API_LOGGING ?? '').trim().toLowerCase() === 'false';
const apiLoggingEnabled = process.env.NODE_ENV !== 'production' && !apiLoggingDisabled;
const publicEndpoints = new Set(['loginAccount', 'refreshAccount', 'forgotAccountPassword', 'resetAccountPassword']);
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

const REDACTED = '[REDACTED]';
const sensitiveField = /authorization|cookie|password|passcode|secret|token|credential|otp|email|phone|mobile|contact|name|actor|recipient|address|birth|\bdob\b|gender|location|latitude|longitude|coordinates|avatar|photo|\bbio\b|ip[_-]?address|device[_-]?id|nin|bvn|ssn|passport|license|iban|bank[_-]?(account|number)|card[_-]?(number|cvv)|national[_-]?id|tax[_-]?id|^(body|title|message)$|(^|[_-])search($|[_-])|(^|[_-])query($|[_-])|^q$/i;
const identityCollection = new Set([
  'users', 'admins', 'drivers', 'forwarders', 'customers', 'profiles',
  'companies', 'accounts', 'recipients', 'contacts', 'verification',
]);

function redactInlineText(value) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(/(?<![\w])\+?(?:\d[\s().-]?){9,14}(?!\w)/g, REDACTED);
}

function sanitizeForLog(value, key = '', parents = [], seen = new WeakSet()) {
  if (sensitiveField.test(key)) return REDACTED;
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return redactInlineText(value);
  if (typeof value !== 'object') return String(value);

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (typeof Headers !== 'undefined' && value instanceof Headers) {
    return Object.fromEntries(Array.from(value.entries(), ([header, content]) => [
      header,
      sanitizeForLog(content, header, parents, seen),
    ]));
  }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return Object.fromEntries(Array.from(value.entries(), ([field, content]) => [
      field,
      content instanceof Blob ? '[File omitted]' : sanitizeForLog(content, field, parents, seen),
    ]));
  }
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return Object.fromEntries(Array.from(value.entries(), ([field, content]) => [
      field,
      sanitizeForLog(content, field, parents, seen),
    ]));
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) return `[Binary data omitted; ${value.size} bytes]`;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return '[Binary data omitted]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, '', parents, seen));

  const keys = Object.keys(value);
  const containsIdentityFields = keys.some((field) => /email|phone|mobile|first[_-]?name|last[_-]?name|full[_-]?name|(^|[_-])name($|[_-])/i.test(field));
  const nextParents = [...parents, key.toLowerCase()];
  return Object.fromEntries(keys.map((field) => {
    const isIdentity = containsIdentityFields && /^id$/i.test(field);
    const isNestedIdentityId = /^((user|admin|driver|customer|profile|account|recipient|contact)[_-]?id)$/i.test(field);
    const inIdentityCollection = parents.some((parent) => identityCollection.has(parent));
    return [field, isIdentity || isNestedIdentityId || (inIdentityCollection && /^id$/i.test(field))
      ? REDACTED
      : sanitizeForLog(value[field], field, nextParents, seen)];
  }));
}

function sanitizeUrl(rawUrl) {
  try {
    const value = String(rawUrl);
    const url = /^[a-z][a-z\d+.-]*:/i.test(value)
      ? new URL(value)
      : new URL(value.replace(/^\/+/, ''), `${baseUrl}/`);
    const segments = url.pathname.split('/');
    let redactNextSegment = false;
    const safeSegments = segments.map((segment) => {
      if (redactNextSegment) {
        redactNextSegment = false;
        return REDACTED;
      }
      if (identityCollection.has(segment.toLowerCase())) redactNextSegment = true;
      return segment;
    });
    url.searchParams.forEach((value, key) => {
      url.searchParams.set(key, sanitizeForLog(value, key));
    });
    return `${url.origin}${safeSegments.join('/')}${url.search}`;
  } catch {
    return redactInlineText(String(rawUrl));
  }
}

async function runLoggedBaseQuery(query, args, api, extraOptions, label = api.endpoint) {
  const startedAt = Date.now();
  const result = await query(args, api, extraOptions);
  if (!apiLoggingEnabled) return result;

  const request = result.meta?.request;
  const response = result.meta?.response;
  const method = (request?.method || (typeof args === 'string' ? 'GET' : args.method || 'GET')).toUpperCase();
  const url = sanitizeUrl(request?.url || (typeof args === 'string' ? args : args.url));
  const requestBody = typeof args === 'string' ? undefined : args.body;
  const responseBody = result.error
    ? (result.error.data ?? { error: result.error.error ?? result.error.status })
    : result.data;

  console.groupCollapsed(`[API] ${method} ${url} → ${response?.status ?? result.error?.status ?? 'complete'} (${Date.now() - startedAt}ms)`);
  console.info('Endpoint:', label);
  console.info('Request:', {
    method,
    url,
    headers: request?.headers,
    body: requestBody,
  });
  console.info('Response body:', responseBody);
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

// Not yet exercised — auth stays mock-gated (see authApi.js) until a
// company-facing auth endpoint is confirmed against the live API spec.
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
  if (!data?.accessToken) {
    clearExpiredSession(api, refreshToken);
    return { status: 'failed', error: { status: 'CUSTOM_ERROR', error: 'The refresh response is missing session details.' } };
  }

  api.dispatch(setCredentials({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
    account: data.account,
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

  if (result.error?.status !== 401 || reauthExcludedPaths.has(path)) return result;

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
  tagTypes: ['Notifications'],
  endpoints: () => ({}),
});
