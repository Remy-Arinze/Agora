# Session & Timetable Implementation Summary

## Overview
This document summarizes the implementation of the core operational heartbeat of the school system: Session Management and Timetable Engine.

## ✅ Completed Backend Implementation

### 1. Database Schema (Prisma)
**Location:** `packages/database/prisma/schema.prisma`

**New Models Added:**
- `AcademicSession`: Represents a full academic year (e.g., "2025/2026")
- `Term`: Represents term subdivisions (1st, 2nd, 3rd Term)
- `ClassLevel`: The definition (e.g., "JSS 1", "SS 2")
- `ClassArm`: The physical group (e.g., "JSS 1 Gold", "SS 2 Blue")
- `Room`: Physical rooms/locations (e.g., "Science Lab", "Room 101")
- `Subject`: Subjects taught (e.g., "Mathematics", "English Language")
- `TimetablePeriod`: Represents a slot in the timetable grid

**Updated Models:**
- `Enrollment`: Now links to `Term` and `ClassArm`
- `Grade`: Now links to `Term`
- `School`: Added relations to new models
- `Teacher`: Added relation to `TimetablePeriod`

**Enums Added:**
- `DayOfWeek`: MONDAY through SUNDAY
- `PeriodType`: LESSON, BREAK, ASSEMBLY, LUNCH
- `SessionStatus`: DRAFT, ACTIVE, COMPLETED, ARCHIVED
- `TermStatus`: DRAFT, ACTIVE, COMPLETED, ARCHIVED

### 2. Session Module (Backend)
**Location:** `apps/api/src/sessions/`

**Files Created:**
- `session.service.ts`: Core business logic for session management
- `session.controller.ts`: API endpoints
- `sessions.module.ts`: NestJS module
- `dto/initialize-session.dto.ts`: DTOs for session initialization
- `dto/session.dto.ts`: Response DTOs

**Key Features:**
- ✅ `initializeSession()`: Create new academic session
- ✅ `createTerm()`: Create terms within a session
- ✅ `startNewTerm()`: **Core wizard logic** - handles promotion vs carry-over
- ✅ `migrateStudents()`: Explicit student migration endpoint
- ✅ `getActiveSession()`: Get current active session and term
- ✅ `getSessions()`: List all sessions

**Promotion Logic (NEW_SESSION):**
- Moves students from current level to next level (JSS1 → JSS2)
- SS3 students are marked as ALUMNI (enrollment deactivated)
- Creates new enrollments in next level's class arms

**Carry Over Logic (NEW_TERM):**
- Clones all active enrollments from previous term
- Keeps students in the exact same ClassArm
- Preserves debt balance

### 3. Timetable Module (Backend)
**Location:** `apps/api/src/timetable/`

**Files Created:**
- `timetable.service.ts`: Core business logic with conflict detection
- `timetable.controller.ts`: API endpoints
- `timetable.module.ts`: NestJS module
- `dto/create-timetable-period.dto.ts`: DTOs for timetable operations
- `dto/timetable.dto.ts`: Response DTOs

**Key Features:**
- ✅ `createPeriod()`: Create timetable period with conflict detection
- ✅ `createMasterSchedule()`: Generate empty slots for all class arms
- ✅ `getTimetableForClassArm()`: Get timetable for a specific class
- ✅ `updatePeriod()`: Update period with conflict checking
- ✅ `deletePeriod()`: Delete a period

**Conflict Detection:**
- ✅ **Teacher Conflict**: Checks if teacher is already booked at same day + time
- ✅ **Room Conflict**: Checks if room is already occupied at same day + time
- ✅ Returns clear error messages: "Mr. Obi is teaching SS2 Physics at 8:00 AM"
- ✅ Time overlap detection: Periods overlap if `startTime < other.endTime AND endTime > other.startTime`

### 4. API Endpoints

**Session Endpoints:**
- `POST /api/schools/:schoolId/sessions/initialize` - Initialize session
- `POST /api/schools/:schoolId/sessions/:sessionId/terms` - Create term
- `POST /api/schools/:schoolId/sessions/start-term` - Start new term (wizard)
- `POST /api/schools/:schoolId/sessions/migrate-students` - Migrate students
- `GET /api/schools/:schoolId/sessions/active` - Get active session
- `GET /api/schools/:schoolId/sessions` - List all sessions

**Timetable Endpoints:**
- `POST /api/schools/:schoolId/timetable/periods` - Create period
- `POST /api/schools/:schoolId/timetable/master-schedule` - Create master schedule
- `GET /api/schools/:schoolId/timetable/class-arm/:classArmId?termId=...` - Get timetable
- `PATCH /api/schools/:schoolId/timetable/periods/:periodId` - Update period
- `DELETE /api/schools/:schoolId/timetable/periods/:periodId` - Delete period

### 5. Frontend RTK Query Hooks
**Location:** `apps/web/src/lib/store/api/schoolAdminApi.ts`

**Session Hooks:**
- `useGetSessionsQuery`
- `useGetActiveSessionQuery`
- `useInitializeSessionMutation`
- `useCreateTermMutation`
- `useStartNewTermMutation`
- `useMigrateStudentsMutation`

**Timetable Hooks:**
- `useGetTimetableForClassArmQuery`
- `useCreateTimetablePeriodMutation`
- `useUpdateTimetablePeriodMutation`
- `useDeleteTimetablePeriodMutation`
- `useCreateMasterScheduleMutation`

## 📋 Next Steps

### 1. Run Database Migration
```bash
cd packages/database
npx prisma migrate dev --name add_sessions_and_timetable
npx prisma generate
```

### 2. Frontend UI Components (To Be Created)

**Session Wizard UI:**
- Location: `/dashboard/school/settings/session` or `/admin/settings/session`
- Multi-step stepper:
  1. Select Session & Term
  2. Date Pickers (Start, End, Half-Term)
  3. Logic Gate: "Carry over students?" (Yes/No)
- Uses: `useStartNewTermMutation`, `useMigrateStudentsMutation`

**Timetable Builder UI:**
- Location: `/dashboard/school/academics/timetable` or `/admin/academics/timetable`
- Matrix Grid (Rows = Days, Cols = Periods)
- Click slot → Dialog with Subject/Teacher dropdowns
- Conflict handling: Show error toast and highlight slot in red
- Uses: `useCreateTimetablePeriodMutation`, `useGetTimetableForClassArmQuery`

### 3. Additional Features to Consider

**ClassLevel & ClassArm Management:**
- UI to create/manage ClassLevels
- UI to create/manage ClassArms for each ClassLevel
- Automatic ClassArm creation when initializing sessions

**Room & Subject Management:**
- UI to create/manage Rooms
- UI to create/manage Subjects
- These are referenced in timetable but need CRUD interfaces

**Master Schedule Template:**
- UI to define bell schedule template
- Save/load templates for reuse across terms

## 🎯 Architecture Highlights

1. **Type Safety**: Strict TypeScript throughout, Prisma enums for type safety
2. **DRY Principle**: Shared services (SchoolRepository) reused
3. **Conflict Detection**: In-memory time overlap checking (works with HH:mm string format)
4. **Nigerian Academic Calendar**: Designed for 3-term structure
5. **Backward Compatibility**: Enrollment model keeps `academicYear` and `classLevel` fields

## 🔍 Testing Checklist

- [ ] Test session initialization (NEW_SESSION)
- [ ] Test term creation (NEW_TERM)
- [ ] Test promotion logic (JSS1 → JSS2, SS3 → ALUMNI)
- [ ] Test carry-over logic (same ClassArm)
- [ ] Test timetable conflict detection (teacher)
- [ ] Test timetable conflict detection (room)
- [ ] Test master schedule creation
- [ ] Test time overlap edge cases

## 📝 Notes

- Time format: All times stored as `HH:mm` strings (e.g., "08:00", "14:30")
- Date handling: Uses native JavaScript `Date` objects (no date-fns dependency)
- Conflict messages: User-friendly, includes teacher/room name and conflicting class
- Migration: Enrollment model updated but maintains backward compatibility

