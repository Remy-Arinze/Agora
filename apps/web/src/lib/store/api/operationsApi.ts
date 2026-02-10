import { apiSlice } from './apiSlice';

// Error types
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ErrorStatus = 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export interface ApplicationError {
  id: string;
  errorId: string;
  schoolId: string | null;
  userId: string | null;
  errorType: string;
  message: string;
  stackTrace: string | null;
  context: {
    method?: string;
    path?: string;
    query?: any;
    body?: any;
    headers?: Record<string, string>;
    ip?: string;
    userAgent?: string;
  } | null;
  severity: ErrorSeverity;
  status: ErrorStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  user?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  school?: {
    id: string;
    name: string;
  } | null;
}

export interface ErrorFilters {
  severity?: ErrorSeverity;
  status?: ErrorStatus;
  errorType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byStatus: Record<ErrorStatus, number>;
  recentTrends: Array<{ date: string; count: number }>;
  topErrorTypes: Array<{ errorType: string; count: number }>;
}

export interface ErrorsResponse {
  errors: ApplicationError[];
  total: number;
}

export const operationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get errors for a school
    getSchoolErrors: builder.query<ErrorsResponse, { schoolId: string; filters?: ErrorFilters }>({
      query: ({ schoolId, filters = {} }) => {
        const params = new URLSearchParams();
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.status) params.append('status', filters.status);
        if (filters.errorType) params.append('errorType', filters.errorType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());

        const queryString = params.toString();
        return {
          url: `/operations/schools/${schoolId}/errors${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        // Extract data from ResponseDto wrapper
        return response?.data || response;
      },
      providesTags: (result, error, { schoolId }) => [
        { type: 'SchoolErrors', id: schoolId },
      ],
    }),

    // Get error details
    getErrorDetails: builder.query<ApplicationError, string>({
      query: (errorId) => ({
        url: `/operations/errors/${errorId}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        // Extract data from ResponseDto wrapper
        return response?.data || response;
      },
      providesTags: (result, error, errorId) => [{ type: 'Error', id: errorId }],
    }),

    // Update error status
    updateErrorStatus: builder.mutation<
      ApplicationError,
      { errorId: string; status: ErrorStatus }
    >({
      query: ({ errorId, status }) => ({
        url: `/operations/errors/${errorId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response: any) => {
        // Extract data from ResponseDto wrapper
        return response?.data || response;
      },
      invalidatesTags: (result, error, { errorId }) => [
        { type: 'Error', id: errorId },
        { type: 'SchoolErrors', id: 'LIST' },
        { type: 'ErrorStats', id: 'LIST' },
      ],
    }),

    // Get error statistics for a school
    getSchoolErrorStats: builder.query<
      ErrorStats,
      { schoolId: string; days?: number }
    >({
      query: ({ schoolId, days = 30 }) => ({
        url: `/operations/schools/${schoolId}/errors/stats`,
        method: 'GET',
        params: days ? { days: days.toString() } : {},
      }),
      transformResponse: (response: any) => {
        // Extract data from ResponseDto wrapper
        return response?.data || response;
      },
      providesTags: (result, error, { schoolId }) => [
        { type: 'ErrorStats', id: schoolId },
      ],
    }),
  }),
});

export const {
  useGetSchoolErrorsQuery,
  useGetErrorDetailsQuery,
  useUpdateErrorStatusMutation,
  useGetSchoolErrorStatsQuery,
} = operationsApi;
