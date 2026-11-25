import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import { authReducer } from './features/auth/authSlice';
import { persistAuth, readStoredAuth } from './features/auth/authStorage';

// The App Router renders on the server too, so create a store per layout instance.
export function makeStore() {
  const storedAuth = readStoredAuth();
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: storedAuth ? { auth: storedAuth } : undefined,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    // Keep tokens out of Redux DevTools history; persistence is handled below.
    devTools: false,
  });

  if (typeof window !== 'undefined') {
    let previousAuth = store.getState().auth;
    store.subscribe(() => {
      const nextAuth = store.getState().auth;
      if (nextAuth === previousAuth) return;
      previousAuth = nextAuth;
      persistAuth(nextAuth);
    });
  }

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
