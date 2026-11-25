'use client';

import React from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { makeStore, type AppDispatch, type RootState } from './store';
import { authApi } from './features/auth/authApi';

function tokenExpiresAt(token: string) {
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
  const dispatch = useDispatch<AppDispatch>();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);

  React.useEffect(() => {
    if (!accessToken || !refreshToken) return;
    const expiresAt = tokenExpiresAt(accessToken);
    if (!expiresAt) return;
    let cancelled = false;
    let timer: number | undefined;
    const schedule = (delay: number) => {
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = React.useState(makeStore);
  return (
    <Provider store={store}>
      <AuthRefreshManager />
      {children}
    </Provider>
  );
}
