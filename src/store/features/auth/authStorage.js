const AUTH_STORAGE_KEY = 'trukkas-company-auth';

const emptyAuth = {
  account: null,
  activeCompanyId: null,
  accessToken: null,
  refreshToken: null,
};

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readStoredAuth() {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) return null;

    const parsed = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid auth data');

    const account = parsed.account && typeof parsed.account === 'object' && !Array.isArray(parsed.account)
      ? parsed.account
      : null;
    const activeCompanyId = nonEmptyString(parsed.activeCompanyId);
    const accessToken = nonEmptyString(parsed.accessToken);
    const refreshToken = nonEmptyString(parsed.refreshToken);

    if (!account || !accessToken || !refreshToken) throw new Error('Incomplete auth data');
    return { account, activeCompanyId, accessToken, refreshToken };
  } catch {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the in-memory session still works.
    }
    return null;
  }
}

export function persistAuth(auth = emptyAuth) {
  if (typeof window === 'undefined') return;

  try {
    if (!auth.account || !auth.accessToken || !auth.refreshToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      account: auth.account,
      activeCompanyId: auth.activeCompanyId,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    }));
  } catch {
    // Authentication remains available in memory if storage is unavailable.
  }
}
