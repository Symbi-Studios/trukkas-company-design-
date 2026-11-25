import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CompanyAccount {
  id: string;
  apiRole: string;
  truckerType: string;
  companyIds: string[];
  actualUserId?: string | null;
  [key: string]: unknown;
}

export interface AuthState {
  account: CompanyAccount | null;
  activeCompanyId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = {
  account: null,
  activeCompanyId: null,
  accessToken: null,
  refreshToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<Partial<AuthState>>) {
      const { account, activeCompanyId, accessToken, refreshToken } = action.payload;
      if (account !== undefined) state.account = account;
      if (activeCompanyId !== undefined) state.activeCompanyId = activeCompanyId;
      if (accessToken !== undefined) state.accessToken = accessToken;
      if (refreshToken !== undefined) state.refreshToken = refreshToken;
    },
    setActiveCompany(state, action: PayloadAction<string | null>) {
      state.activeCompanyId = action.payload;
    },
    clearSession(): AuthState {
      return initialState;
    },
  },
});

export const { setCredentials, setActiveCompany, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
