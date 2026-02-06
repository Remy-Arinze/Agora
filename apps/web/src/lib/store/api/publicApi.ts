import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PublicSchool {
  id: string;
  name: string;
  logo: string | null;
  type: string;
  state: string | null;
}

export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  totalRecords: number;
  totalTeachers: number;
}

interface ResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
}

export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (() => {
      const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
      const baseUrl = envUrl || 'http://localhost:4000';
      // Routes are directly accessible without /api prefix
      return baseUrl;
    })(),
  }),
  endpoints: (builder) => ({
    getPublicSchools: builder.query<PublicSchool[], void>({
      query: () => '/public/schools',
      transformResponse: (response: ResponseDto<PublicSchool[]>) => response.data,
    }),
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => '/public/stats',
      transformResponse: (response: ResponseDto<PlatformStats>) => response.data,
    }),
  }),
});

export const { useGetPublicSchoolsQuery, useGetPlatformStatsQuery } = publicApi;

