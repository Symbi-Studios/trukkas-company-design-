import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  account: null,
  activeCompanyId: null,
  accessToken: null,
  refreshToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { account, activeCompanyId, accessToken, refreshToken } = action.payload;
      if (account !== undefined) state.account = account;
      if (activeCompanyId) state.activeCompanyId = activeCompanyId;
      if (accessToken) state.accessToken = accessToken;
      if (refreshToken) state.refreshToken = refreshToken;
    },
    setActiveCompany(state, action) {
      state.activeCompanyId = action.payload;
    },
    clearSession() {
      return initialState;
    },
  },
});

export const { setCredentials, setActiveCompany, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
