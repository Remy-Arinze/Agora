import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    accountStatus: string;
  } | null;
  tenantId: string | null;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  tenantId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user: AuthState['user'];
        tenantId?: string;
      }>
    ) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      if (action.payload.tenantId) {
        state.tenantId = action.payload.tenantId;
        if (typeof window !== 'undefined') {
          localStorage.setItem('tenantId', action.payload.tenantId);
        }
      }
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.tenantId = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tenantId');
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

