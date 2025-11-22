import { configureStore } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';

const persistConfig = {
  key: 'auth', // Key for localStorage
  storage,
  // No whitelist needed when persisting a single reducer
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: persistedAuthReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }).concat(apiSlice.middleware) as ReturnType<typeof getDefaultMiddleware>,
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

