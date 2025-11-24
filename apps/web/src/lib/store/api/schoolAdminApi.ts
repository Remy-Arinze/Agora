import { apiSlice } from './apiSlice';
import type { School } from './schoolsApi';

// Dashboard types (matching backend DTOs)
export interface DashboardStats {
  totalStudents: number;
  studentsChange: number;
  totalTeachers: number;
  teachersChange: number;
  activeCourses: number;
  coursesChange: number;
  pendingAdmissions: number;
  pendingAdmissionsChange: number;
}

export interface GrowthTrendData {
  name: string;
  students: number;
  teachers: number;
  courses: number;
}

export interface WeeklyActivityData {
  name: string;
  admissions: number;
  transfers: number;
}

export interface RecentStudent {
  id: string;
  name: string;
  classLevel: string;
  admissionNumber: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SchoolDashboard {
  stats: DashboardStats;
  growthTrends: GrowthTrendData[];
  weeklyActivity: WeeklyActivityData[];
  recentStudents: RecentStudent[];
}

// Staff list types
export interface StaffListItem {
  id: string;
  type: 'teacher' | 'admin';
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  role: string | null;
  subject: string | null;
  employeeId: string | null;
  isTemporary: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface StaffListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StaffListResponse {
  items: StaffListItem[];
  meta: StaffListMeta;
  availableRoles: string[];
}

export interface GetStaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface ResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

// School type types
export type SchoolType = 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

export interface SchoolTypeContext {
  hasPrimary: boolean;
  hasSecondary: boolean;
  hasTertiary: boolean;
  isMixed: boolean;
  availableTypes: SchoolType[];
  primaryType: SchoolType | 'MIXED';
}

// Class/Course types
export type ClassType = 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

export interface ClassTeacher {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  subject: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  code: string | null;
  classLevel: string | null;
  type: ClassType;
  academicYear: string;
  creditHours: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  teachers: ClassTeacher[];
  studentsCount: number;
}

export interface CreateClassDto {
  name: string;
  code?: string;
  classLevel?: string;
  type: ClassType;
  academicYear: string;
  creditHours?: number;
  description?: string;
}

export interface AssignTeacherToClassDto {
  teacherId: string;
  subject?: string;
  isPrimary?: boolean;
}

// Session types
export type SessionType = 'NEW_SESSION' | 'NEW_TERM';
export type SessionStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TermStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type PeriodType = 'LESSON' | 'BREAK' | 'ASSEMBLY' | 'LUNCH';

export interface Term {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  halfTermStart?: string;
  halfTermEnd?: string;
  status: TermStatus;
  academicSessionId: string;
  createdAt: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SessionStatus;
  schoolId: string;
  terms: Term[];
  createdAt: string;
}

export interface ActiveSession {
  session?: AcademicSession;
  term?: Term;
}

export interface InitializeSessionDto {
  name: string;
  startDate: string;
  endDate: string;
  type: SessionType;
}

export interface CreateTermDto {
  name: string;
  number: string;
  startDate: string;
  endDate: string;
  halfTermStart?: string;
  halfTermEnd?: string;
}

export interface StartTermDto extends InitializeSessionDto {
  termId?: string;
}

export interface StartTermResponse {
  session: AcademicSession;
  term: Term;
  migratedCount: number;
}

export interface MigrateStudentsDto {
  termId: string;
  carryOver: boolean;
}

export interface TimetablePeriod {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  type: PeriodType;
  subjectId?: string;
  subjectName?: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  classArmId: string;
  classArmName: string;
  termId: string;
  createdAt: string;
}

export interface CreateTimetablePeriodDto {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  type?: PeriodType;
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  classArmId: string;
  termId: string;
}

export interface CreateMasterScheduleDto {
  termId: string;
  periods: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    type?: PeriodType;
  }>;
}

export interface ClassLevel {
  id: string;
  name: string;
  code?: string;
  level: number;
  type: string;
  schoolId: string;
  isActive: boolean;
  nextLevelId?: string;
}

export interface ClassArm {
  id: string;
  name: string;
  capacity?: number;
  classLevelId: string;
  classLevelName: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  schoolId: string;
  isActive: boolean;
}

export interface Room {
  id: string;
  name: string;
  code?: string;
  capacity?: number;
  roomType?: string;
  schoolId: string;
  isActive: boolean;
}

export interface CreateClassArmDto {
  name: string;
  capacity?: number;
  classLevelId: string;
}

export interface CreateSubjectDto {
  name: string;
  code?: string;
}

export interface CreateRoomDto {
  name: string;
  code?: string;
  capacity?: number;
  roomType?: string;
}

export type CalendarEventType = 'ACADEMIC' | 'EVENT' | 'EXAM' | 'MEETING' | 'HOLIDAY';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  location?: string;
  roomId?: string;
  roomName?: string;
  schoolId: string;
  createdBy?: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  location?: string;
  roomId?: string;
  isAllDay?: boolean;
  schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
}

// RTK Query endpoints for school admin
export const schoolAdminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my school (for school admin)
    getMySchool: builder.query<ResponseDto<School>, void>({
      query: () => '/school-admin/school',
      providesTags: ['School'],
    }),
    // Get school admin dashboard
    getSchoolAdminDashboard: builder.query<ResponseDto<SchoolDashboard>, void>({
      query: () => '/school-admin/dashboard',
      providesTags: ['School'],
    }),
    // Get staff list with pagination, search, and filtering
    getStaffList: builder.query<ResponseDto<StaffListResponse>, GetStaffListParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.role) queryParams.append('role', params.role);
        const queryString = queryParams.toString();
        return `/school-admin/staff${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['School'],
    }),
    // Get all classes/courses for a school
    getClasses: builder.query<
      ResponseDto<Class[]>,
      { schoolId: string; academicYear?: string; type?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' }
    >({
      query: ({ schoolId, academicYear, type }) => {
        const queryParams = new URLSearchParams();
        if (academicYear) queryParams.append('academicYear', academicYear);
        if (type) queryParams.append('type', type);
        const queryString = queryParams.toString();
        return `/schools/${schoolId}/classes${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['School'],
    }),
    // Get a single class by ID
    getClassById: builder.query<ResponseDto<Class>, { schoolId: string; classId: string }>({
      query: ({ schoolId, classId }) => `/schools/${schoolId}/classes/${classId}`,
      providesTags: (result, error, { classId }) => [{ type: 'Class', id: classId }],
    }),
    // Create a new class
    createClass: builder.mutation<ResponseDto<Class>, { schoolId: string; classData: CreateClassDto }>({
      query: ({ schoolId, classData }) => ({
        url: `/schools/${schoolId}/classes`,
        method: 'POST',
        body: classData,
      }),
      invalidatesTags: ['School'],
    }),
    // Update a class
    updateClass: builder.mutation<ResponseDto<Class>, { schoolId: string; classId: string; classData: Partial<CreateClassDto> }>({
      query: ({ schoolId, classId, classData }) => ({
        url: `/schools/${schoolId}/classes/${classId}`,
        method: 'PATCH',
        body: classData,
      }),
      invalidatesTags: (result, error, { classId }) => [{ type: 'Class', id: classId }, 'School'],
    }),
    // Delete a class
    deleteClass: builder.mutation<ResponseDto<void>, { schoolId: string; classId: string }>({
      query: ({ schoolId, classId }) => ({
        url: `/schools/${schoolId}/classes/${classId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['School'],
    }),
    // Assign a teacher to a class
    assignTeacherToClass: builder.mutation<ResponseDto<Class>, { schoolId: string; classId: string; assignment: AssignTeacherToClassDto }>({
      query: ({ schoolId, classId, assignment }) => ({
        url: `/schools/${schoolId}/classes/${classId}/teachers`,
        method: 'POST',
        body: assignment,
      }),
      invalidatesTags: (result, error, { classId }) => [{ type: 'Class', id: classId }, 'School'],
    }),
    // Remove a teacher from a class
    removeTeacherFromClass: builder.mutation<ResponseDto<void>, { schoolId: string; classId: string; teacherId: string; subject?: string }>({
      query: ({ schoolId, classId, teacherId, subject }) => {
        const queryParams = new URLSearchParams();
        if (subject) queryParams.append('subject', subject);
        const queryString = queryParams.toString();
        return {
          url: `/schools/${schoolId}/classes/${classId}/teachers/${teacherId}${queryString ? `?${queryString}` : ''}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: (result, error, { classId }) => [{ type: 'Class', id: classId }, 'School'],
    }),
    // Session Management
    getSessions: builder.query<ResponseDto<AcademicSession[]>, { schoolId: string }>({
      query: ({ schoolId }) => `/schools/${schoolId}/sessions`,
      providesTags: ['Session'],
    }),
    getActiveSession: builder.query<ResponseDto<ActiveSession>, { schoolId: string }>({
      query: ({ schoolId }) => `/schools/${schoolId}/sessions/active`,
      providesTags: ['Session'],
    }),
    initializeSession: builder.mutation<ResponseDto<AcademicSession>, { schoolId: string; data: InitializeSessionDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/sessions/initialize`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Session'],
    }),
    createTerm: builder.mutation<ResponseDto<Term>, { schoolId: string; sessionId: string; data: CreateTermDto }>({
      query: ({ schoolId, sessionId, data }) => ({
        url: `/schools/${schoolId}/sessions/${sessionId}/terms`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Session'],
    }),
    startNewTerm: builder.mutation<ResponseDto<StartTermResponse>, { schoolId: string; data: StartTermDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/sessions/start-term`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Session', 'School'],
    }),
    migrateStudents: builder.mutation<ResponseDto<{ migratedCount: number }>, { schoolId: string; data: MigrateStudentsDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/sessions/migrate-students`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Session', 'School'],
    }),
    endTerm: builder.mutation<ResponseDto<{ term: Term }>, { schoolId: string }>({
      query: ({ schoolId }) => ({
        url: `/schools/${schoolId}/sessions/end-term`,
        method: 'POST',
      }),
      invalidatesTags: ['Session', 'School'],
    }),
    // Timetable Management
    getTimetableForClassArm: builder.query<ResponseDto<TimetablePeriod[]>, { schoolId: string; classArmId: string; termId: string }>({
      query: ({ schoolId, classArmId, termId }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('termId', termId);
        return `/schools/${schoolId}/timetable/class-arm/${classArmId}?${queryParams.toString()}`;
      },
      providesTags: (result, error, { classArmId }) => [{ type: 'Timetable', id: classArmId }],
    }),
    createTimetablePeriod: builder.mutation<ResponseDto<TimetablePeriod>, { schoolId: string; data: CreateTimetablePeriodDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/timetable/periods`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    updateTimetablePeriod: builder.mutation<ResponseDto<TimetablePeriod>, { schoolId: string; periodId: string; data: Partial<CreateTimetablePeriodDto> }>({
      query: ({ schoolId, periodId, data }) => ({
        url: `/schools/${schoolId}/timetable/periods/${periodId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    deleteTimetablePeriod: builder.mutation<ResponseDto<void>, { schoolId: string; periodId: string }>({
      query: ({ schoolId, periodId }) => ({
        url: `/schools/${schoolId}/timetable/periods/${periodId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Timetable'],
    }),
    createMasterSchedule: builder.mutation<ResponseDto<{ created: number; skipped: number }>, { schoolId: string; data: CreateMasterScheduleDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/timetable/master-schedule`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    // Resource endpoints
    getClassLevels: builder.query<ResponseDto<ClassLevel[]>, { schoolId: string }>({
      query: ({ schoolId }) => `/schools/${schoolId}/timetable/class-levels`,
      providesTags: ['Timetable'],
    }),
    getClassArms: builder.query<ResponseDto<ClassArm[]>, { schoolId: string; classLevelId?: string; schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' }>({
      query: ({ schoolId, classLevelId, schoolType }) => {
        const queryParams = new URLSearchParams();
        if (classLevelId) queryParams.append('classLevelId', classLevelId);
        if (schoolType) queryParams.append('schoolType', schoolType);
        const queryString = queryParams.toString();
        return `/schools/${schoolId}/timetable/class-arms${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Timetable'],
    }),
    createClassArm: builder.mutation<ResponseDto<ClassArm>, { schoolId: string; data: CreateClassArmDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/timetable/class-arms`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    getSubjects: builder.query<ResponseDto<Subject[]>, { schoolId: string }>({
      query: ({ schoolId }) => `/schools/${schoolId}/timetable/subjects`,
      providesTags: ['Timetable'],
    }),
    createSubject: builder.mutation<ResponseDto<Subject>, { schoolId: string; data: CreateSubjectDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/timetable/subjects`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    getRooms: builder.query<ResponseDto<Room[]>, { schoolId: string }>({
      query: ({ schoolId }) => `/schools/${schoolId}/timetable/rooms`,
      providesTags: ['Timetable'],
    }),
    createRoom: builder.mutation<ResponseDto<Room>, { schoolId: string; data: CreateRoomDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/timetable/rooms`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Timetable'],
    }),
    // Event Management
    getEvents: builder.query<ResponseDto<CalendarEvent[]>, { schoolId: string; startDate: string; endDate: string; schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' }>({
      query: ({ schoolId, startDate, endDate, schoolType }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('startDate', startDate);
        queryParams.append('endDate', endDate);
        if (schoolType) queryParams.append('schoolType', schoolType);
        return `/schools/${schoolId}/events?${queryParams.toString()}`;
      },
      providesTags: ['Event'],
    }),
    getUpcomingEvents: builder.query<ResponseDto<CalendarEvent[]>, { schoolId: string; days?: number; schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' }>({
      query: ({ schoolId, days, schoolType }) => {
        const queryParams = new URLSearchParams();
        if (days) queryParams.append('days', days.toString());
        if (schoolType) queryParams.append('schoolType', schoolType);
        return `/schools/${schoolId}/events/upcoming?${queryParams.toString()}`;
      },
      providesTags: ['Event'],
    }),
    createEvent: builder.mutation<ResponseDto<CalendarEvent>, { schoolId: string; data: CreateEventDto }>({
      query: ({ schoolId, data }) => ({
        url: `/schools/${schoolId}/events`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Event'],
    }),
    updateEvent: builder.mutation<ResponseDto<CalendarEvent>, { schoolId: string; eventId: string; data: Partial<CreateEventDto> }>({
      query: ({ schoolId, eventId, data }) => ({
        url: `/schools/${schoolId}/events/${eventId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Event'],
    }),
    deleteEvent: builder.mutation<ResponseDto<void>, { schoolId: string; eventId: string }>({
      query: ({ schoolId, eventId }) => ({
        url: `/schools/${schoolId}/events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event'],
    }),
  }),
});

export const { 
  useGetMySchoolQuery,
  useGetSchoolAdminDashboardQuery, 
  useGetStaffListQuery,
  useGetClassesQuery,
  useGetClassByIdQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useAssignTeacherToClassMutation,
  useRemoveTeacherFromClassMutation,
  // Session hooks
  useGetSessionsQuery,
  useGetActiveSessionQuery,
  useInitializeSessionMutation,
  useCreateTermMutation,
  useStartNewTermMutation,
  useMigrateStudentsMutation,
  useEndTermMutation,
  // Timetable hooks
  useGetTimetableForClassArmQuery,
  useCreateTimetablePeriodMutation,
  useUpdateTimetablePeriodMutation,
  useDeleteTimetablePeriodMutation,
  useCreateMasterScheduleMutation,
  // Resource hooks
  useGetClassLevelsQuery,
  useGetClassArmsQuery,
  useCreateClassArmMutation,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useGetRoomsQuery,
  useCreateRoomMutation,
  // Event hooks
  useGetEventsQuery,
  useGetUpcomingEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = schoolAdminApi;

