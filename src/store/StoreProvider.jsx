'use client';

import React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { makeStore } from './store.js';
import { authApi } from './features/auth/authApi.js';

function tokenExpiresAt(token) {
  try {
    const encoded = token.split('.')[1];
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function AuthRefreshManager() {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const refreshToken = useSelector((state) => state.auth.refreshToken);

  React.useEffect(() => {
    if (!accessToken || !refreshToken) return;
    const expiresAt = tokenExpiresAt(accessToken);
    if (!expiresAt) return;
    let cancelled = false;
    let timer;
    const schedule = (delay) => {
      timer = window.setTimeout(async () => {
        const result = dispatch(authApi.endpoints.refreshAccount.initiate());
        try {
          await result.unwrap();
        } catch {
          // Transient failures retain the session. A protected request may retry too.
          if (!cancelled) schedule(60_000);
        } finally {
          result.reset();
        }
      }, delay);
    };
    schedule(Math.max(1000, Math.min(expiresAt - Date.now() - 60_000, 2_147_000_000)));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accessToken, refreshToken, dispatch]);

  return null;
}

export function StoreProvider({ children }) {
  const [store] = React.useState(makeStore);
  return (
    <Provider store={store}>
      <AuthRefreshManager />
      {children}
    </Provider>
  );
}
