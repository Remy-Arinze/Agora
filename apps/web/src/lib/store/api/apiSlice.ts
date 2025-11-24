import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Get tenant ID from subdomain or localStorage
const getTenantId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get from localStorage first (set after login)
  const stored = localStorage.getItem('tenantId');
  if (stored) return stored;

  // Fallback: extract from subdomain
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Ignore common non-tenant subdomains
  if (['localhost', 'www', 'api', 'app'].includes(subdomain)) {
    return null;
  }

  return subdomain;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000/api',
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state
      const state = getState() as { auth: { accessToken?: string | null; token?: string | null } };
      const token = state?.auth?.accessToken || state?.auth?.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      // Inject tenant ID from subdomain
      const tenantId = getTenantId();
      if (tenantId) {
        headers.set('x-tenant-id', tenantId);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Student', 'School', 'User', 'Timetable', 'Event', 'Session', 'ClassLevel', 'ClassArm', 'Subject', 'Room'],
  endpoints: () => ({}),
});

