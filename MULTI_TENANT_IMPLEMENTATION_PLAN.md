# Multi-Tenant Implementation Plan

## Executive Summary

After analyzing both `PERSONNEL_SCHOOL_MAPPING.md` and `BACKEND_ARCHITECTURE_PROPOSAL.md`, there's a **critical gap** that must be addressed before implementing the multi-tenant architecture:

**The architecture proposal has the same flaw as the current system** - it extracts `schoolId` from the first relation (`user.schoolAdmins[0]`), which breaks multi-school users.

## Critical Issues Identified

### 1. **JWT Missing School Context** (PERSONNEL_SCHOOL_MAPPING.md)
- JWT only contains `{ sub, role }` - no `schoolId` or `publicId`
- System can't determine which school context user logged in with
- **Note**: SUPER_ADMIN, STUDENT, PARENT don't need school context (they log in with email)

### 2. **Guards Use First School** (BACKEND_ARCHITECTURE_PROPOSAL.md)
- `extractSchoolIdFromUser()` just takes `user.schoolAdmins[0].schoolId`
- This breaks for users with multiple schools
- No way to know which school they actually logged in with

### 3. **No School Context Switching** (By Design)
- Users with multiple schools must log out and log in with different public ID
- This is intentional - each login session is scoped to one school
- Simpler security model - one school context per session

## Important: Super Admin Behavior

**✅ Super Admin does NOT need school context in JWT**

- Super admin logs in with **email** (not public ID)
- Super admin has role `SUPER_ADMIN` and no `schoolAdmins` or `teacherProfiles` relations
- Super admin should be able to access **any school** (no restrictions)
- Adding `schoolId` to super admin JWT would actually **restrict** them incorrectly
- Guards already handle this: `if (user.role === 'SUPER_ADMIN') return true;`

**STUDENT Behavior (Special Case):**
- Students log in with email
- **Students DO need school context** - their current/active enrollment's school
- When student logs in, find their active enrollment (`isActive: true`) and set that `schoolId` in JWT
- For current school operations (classes, assignments, current grades): scope to active enrollment's school
- For transcript operations: allow access to all enrollments (active and inactive) across all schools

## Recommended Implementation Strategy

### Phase 1: Fix Authentication & JWT (CRITICAL - Do First)

This must be done **before** implementing the architecture proposal, otherwise the guards will be broken.

#### 1.1 Update JWT Payload to Include School Context

```typescript
// apps/api/src/auth/auth.service.ts

interface JwtPayload {
  sub: string;           // userId
  role: string;           // UserRole
  schoolId?: string;      // ✅ NEW: Current school context
  publicId?: string;     // ✅ NEW: Public ID used for login
  profileId?: string;    // ✅ NEW: adminId or teacherId
}

async login(loginDto: LoginDto): Promise<AuthTokensDto> {
  // ... existing login logic ...
  
  let currentSchoolId: string | null = null;
  let currentPublicId: string | null = null;
  let currentProfileId: string | null = null;
  
  if (isEmail) {
    // Email login - determine school context based on role
    if (user.role === 'STUDENT') {
      // ✅ STUDENT: Find active enrollment and set school context
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        include: {
          enrollments: {
            where: { isActive: true },
            orderBy: { enrollmentDate: 'desc' },
            take: 1,
            include: { school: true },
          },
        },
      });

      if (student && student.enrollments.length > 0) {
        const activeEnrollment = student.enrollments[0];
        currentSchoolId = activeEnrollment.schoolId;
        // Students don't have publicId or profileId
      }
      // If no active enrollment, schoolId remains null (student not enrolled anywhere)
    }
    // ✅ SUPER_ADMIN: No school context (can access all schools)
    // schoolId, publicId, profileId remain null for super admin
  } else {
    // Public ID login - capture school context
    // ✅ Only SCHOOL_ADMIN, TEACHER, PRINCIPAL log in with public ID
    if (schoolAdmin) {
      currentSchoolId = schoolAdmin.schoolId;
      currentPublicId = schoolAdmin.publicId;
      currentProfileId = schoolAdmin.adminId;
    } else if (teacherProfile) {
      currentSchoolId = teacherProfile.schoolId;
      currentPublicId = teacherProfile.publicId;
      currentProfileId = teacherProfile.teacherId;
    }
  }

  // Generate tokens with school context
  const tokens = await this.generateTokens(
    user.id,
    user.role,
    currentSchoolId,
    currentPublicId,
    currentProfileId
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountStatus: user.accountStatus,
      profileId: currentProfileId,
      publicId: currentPublicId,
      schoolId: currentSchoolId, // ✅ Include in response
    },
  };
}

private async generateTokens(
  userId: string,
  role: string,
  schoolId?: string | null,
  publicId?: string | null,
  profileId?: string | null
) {
  const payload: JwtPayload = {
    sub: userId,
    role,
    ...(schoolId && { schoolId }),      // ✅ Include if exists
    ...(publicId && { publicId }),      // ✅ Include if exists
    ...(profileId && { profileId }),    // ✅ Include if exists
  };

  return {
    accessToken: this.jwtService.sign(payload),
    refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
  };
}
```

#### 1.2 Update JWT Strategy to Include School Context in User Object

```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts

async validate(payload: JwtPayload) {
  const user = await this.authService.validateUser(payload.sub);
  if (!user) {
    throw new UnauthorizedException();
  }
  
  // ✅ Attach school context from JWT to user object
  return {
    ...user,
    currentSchoolId: payload.schoolId,    // ✅ From JWT
    currentPublicId: payload.publicId,     // ✅ From JWT
    currentProfileId: payload.profileId,   // ✅ From JWT
  };
}
```

#### 1.3 Update TypeScript Types

```typescript
// apps/api/src/auth/types/user-with-context.type.ts

export interface UserWithContext extends User {
  currentSchoolId?: string | null;
  currentPublicId?: string | null;
  currentProfileId?: string | null;
}
```

### Phase 2: Fix Guards to Use JWT School Context

#### 2.1 Update SchoolDataAccessGuard

```typescript
// apps/api/src/common/guards/school-data-access.guard.ts

@Injectable()
export class SchoolDataAccessGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UserWithContext = request.user;
    const requestedSchoolId = request.params.schoolId || request.body.schoolId;

    // ✅ Super admin can access any school - no school context needed
    // Super admin JWT will NOT have schoolId (they log in with email)
    if (user.role === 'SUPER_ADMIN') {
      // Super admin can optionally specify schoolId in request to access specific school
      // If not specified, they can still access (for global operations)
      if (requestedSchoolId) {
        request.schoolId = requestedSchoolId;
      }
      // ✅ No schoolId restriction for super admin
      return true;
    }

    // ✅ Use schoolId from JWT (logged-in school context)
    // Note: SUPER_ADMIN won't have schoolId (they log in with email, not public ID)
    const userSchoolId = user.currentSchoolId;

    if (!userSchoolId) {
      // ✅ This is expected for SUPER_ADMIN (they log in with email, no school context)
      if (user.role === 'SUPER_ADMIN') {
        return true; // Super admin can access any school
      }

      // ✅ STUDENT: If no schoolId in JWT, try to find active enrollment
      if (user.role === 'STUDENT') {
        const student = await this.prisma.student.findUnique({
          where: { userId: user.id },
          include: {
            enrollments: {
              where: { isActive: true },
              orderBy: { enrollmentDate: 'desc' },
              take: 1,
            },
          },
        });

        if (student && student.enrollments.length > 0) {
          request.schoolId = student.enrollments[0].schoolId;
          return true;
        }
        // Student with no active enrollment - can still access transcripts
        return true;
      }

      // For SCHOOL_ADMIN/TEACHER, this means they logged in with email (legacy/backward compat)
      // Fallback: Try to extract from relations (for backward compatibility)
      const fallbackSchoolId = this.extractSchoolIdFromUser(user);
      if (!fallbackSchoolId) {
        throw new ForbiddenException('User is not associated with any school');
      }
      request.schoolId = fallbackSchoolId;
      return true;
    }

    // ✅ Verify user belongs to the school they're trying to access
    if (requestedSchoolId && requestedSchoolId !== userSchoolId) {
      throw new ForbiddenException('You can only access data from your own school');
    }

    // ✅ Verify the schoolId in JWT is valid for this user
    const isValidSchool = await this.verifyUserSchoolAccess(user.id, userSchoolId);
    if (!isValidSchool) {
      throw new ForbiddenException('Invalid school context');
    }

    // Attach school context to request
    request.schoolId = userSchoolId;
    return true;
  }

  private async verifyUserSchoolAccess(userId: string, schoolId: string): Promise<boolean> {
    // Verify user actually has access to this school
    const schoolAdmin = await this.prisma.schoolAdmin.findFirst({
      where: { userId, schoolId },
    });
    
    if (schoolAdmin) return true;

    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, schoolId },
    });

    return !!teacher;
  }

  private extractSchoolIdFromUser(user: User): string | null {
    // Fallback method - only used if JWT doesn't have schoolId
    if (user.schoolAdmins?.length > 0) {
      return user.schoolAdmins[0].schoolId;
    }
    if (user.teacherProfiles?.length > 0) {
      return user.teacherProfiles[0].schoolId;
    }
    return null;
  }
}
```

### Phase 3: Update Architecture Proposal Guards

#### 3.1 Fix extractSchoolIdFromUser in All Guards

Replace all instances of:
```typescript
// ❌ OLD - Wrong
private extractSchoolIdFromUser(user: User): string {
  if (user.schoolAdmins?.length > 0) {
    return user.schoolAdmins[0].schoolId;  // Wrong!
  }
  // ...
}
```

With:
```typescript
// ✅ NEW - Correct
private extractSchoolIdFromUser(user: UserWithContext): string {
  // ✅ First try JWT context
  if (user.currentSchoolId) {
    return user.currentSchoolId;
  }
  
  // Fallback for backward compatibility
  if (user.schoolAdmins?.length > 0) {
    return user.schoolAdmins[0].schoolId;
  }
  if (user.teacherProfiles?.length > 0) {
    return user.teacherProfiles[0].schoolId;
  }
  
  throw new ForbiddenException('User is not associated with any school');
}
```

### Phase 4: Update Repository Pattern

#### 4.1 School-Scoped Repository with Context

```typescript
// apps/api/src/schools/domain/repositories/school-scoped.repository.ts

@Injectable()
export class SchoolScopedRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * All queries automatically scoped to schoolId from request context
   * schoolId should be set by SchoolDataAccessGuard
   */
  async findEnrollmentsBySchool(schoolId: string): Promise<Enrollment[]> {
    // ✅ schoolId comes from guard, not from user relations
    return this.prisma.enrollment.findMany({
      where: { schoolId, isActive: true },
      include: {
        student: true,
        grades: true,
        attendances: true,
      },
    });
  }

  // ... other methods
}
```

#### 4.2 Service Layer Uses Request Context

```typescript
// apps/api/src/schools/school-admin/school-admin-students.service.ts

@Injectable()
export class SchoolAdminStudentsService {
  constructor(
    private schoolScopedRepository: SchoolScopedRepository,
    private prisma: PrismaService
  ) {}

  /**
   * Get all students in the school admin's school
   * schoolId comes from request context (set by guard)
   */
  async getStudentsInMySchool(
    user: UserWithContext,
    requestSchoolId: string  // ✅ From request.schoolId set by guard
  ): Promise<StudentDto[]> {
    // ✅ Use schoolId from request context, not from user relations
    const students = await this.schoolScopedRepository.findStudentsBySchool(requestSchoolId);
    return students.map(this.studentMapper.toDto);
  }
}
```

### Phase 5: Student-Specific Data Access Strategy

#### 5.1 Student Current School Operations (Scoped to Active Enrollment)

For operations related to the student's current school (classes, assignments, current grades, attendance):

```typescript
// apps/api/src/students/student/student-current-school.service.ts

@Injectable()
export class StudentCurrentSchoolService {
  constructor(
    private prisma: PrismaService,
    private schoolScopedRepository: SchoolScopedRepository
  ) {}

  /**
   * Get student's current classes (scoped to active enrollment's school)
   */
  async getMyCurrentClasses(user: UserWithContext): Promise<ClassDto[]> {
    const schoolId = user.currentSchoolId; // ✅ From JWT (active enrollment's school)
    
    if (!schoolId) {
      throw new BadRequestException('You are not enrolled in any school');
    }

    // Get active enrollment
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
      include: {
        enrollments: {
          where: { schoolId, isActive: true },
          take: 1,
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      throw new BadRequestException('No active enrollment found');
    }

    const enrollment = student.enrollments[0];
    
    // Return classes for current enrollment
    return this.schoolScopedRepository.findClassesByEnrollment(enrollment.id);
  }

  /**
   * Get current grades (only from active enrollment)
   */
  async getMyCurrentGrades(user: UserWithContext): Promise<GradeDto[]> {
    const schoolId = user.currentSchoolId;
    
    if (!schoolId) {
      throw new BadRequestException('You are not enrolled in any school');
    }

    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Get grades only from active enrollment
    return this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: student.id,
          schoolId,
          isActive: true, // ✅ Only active enrollment
        },
      },
      include: {
        enrollment: {
          include: { school: true },
        },
        teacher: true,
      },
      orderBy: [
        { academicYear: 'desc' },
        { term: 'desc' },
      ],
    });
  }
}
```

#### 5.2 Student Transcript Operations (Cross-School Access)

For transcript operations, students can access all their enrollments (active and inactive):

```typescript
// apps/api/src/students/student/student-transcript.service.ts

@Injectable()
export class StudentTranscriptService {
  constructor(
    private transcriptRepository: StudentTranscriptRepository
  ) {}

  /**
   * Get complete transcript across all schools (active and inactive enrollments)
   */
  async getMyCompleteTranscript(user: UserWithContext): Promise<CompleteTranscriptDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // ✅ Get ALL enrollments (active and inactive) across all schools
    return this.transcriptRepository.getCompleteTranscript(student.id);
  }

  /**
   * Get transcript for a specific school (can be current or previous school)
   */
  async getMyTranscriptForSchool(
    user: UserWithContext,
    schoolId: string
  ): Promise<SchoolTranscriptDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // ✅ Verify student was enrolled in this school (active or inactive)
    const enrollment = await this.transcriptRepository.getTranscriptForSchool(
      student.id,
      schoolId
    );

    if (!enrollment) {
      throw new NotFoundException('You were not enrolled in this school');
    }

    return this.transcriptMapper.toSchoolTranscriptDto(enrollment);
  }

  /**
   * Get list of all schools student has been enrolled in
   */
  async getMySchools(user: UserWithContext): Promise<SchoolEnrollmentDto[]> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
      include: {
        enrollments: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                schoolId: true,
              },
            },
          },
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Return unique schools (student may have multiple enrollments in same school)
    const schoolMap = new Map();
    for (const enrollment of student.enrollments) {
      if (!schoolMap.has(enrollment.schoolId)) {
        schoolMap.set(enrollment.schoolId, {
          schoolId: enrollment.school.id,
          schoolName: enrollment.school.name,
          isCurrentSchool: enrollment.schoolId === user.currentSchoolId,
          enrollments: [],
        });
      }
      schoolMap.get(enrollment.schoolId).enrollments.push({
        academicYear: enrollment.academicYear,
        classLevel: enrollment.classLevel,
        enrollmentDate: enrollment.enrollmentDate,
        isActive: enrollment.isActive,
      });
    }

    return Array.from(schoolMap.values());
  }
}
```

#### 5.3 Student Data Access Guard

```typescript
// apps/api/src/common/guards/student-data-access.guard.ts

@Injectable()
export class StudentDataAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UserWithContext = request.user;
    const studentId = request.params.studentId || request.params.id;

    // Super admin can access any student
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // School admin/teacher can access students from their school
    if (user.role === 'SCHOOL_ADMIN' || user.role === 'TEACHER') {
      const schoolId = user.currentSchoolId || request.schoolId;
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          schoolId,
          isActive: true,
        },
      });
      if (!enrollment) {
        throw new ForbiddenException('Student is not enrolled in your school');
      }
      return true;
    }

    // ✅ Student can only access their own data
    if (user.role === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
      });
      if (!student || student.id !== studentId) {
        throw new ForbiddenException('You can only access your own data');
      }
      return true;
    }

    return false;
  }
}
```

### Phase 6: Update Controllers

#### 6.1 School Admin Controller

```typescript
// apps/api/src/schools/school-admin/school-admin-students.controller.ts

@Controller('school-admin/students')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)  // ✅ Guard sets request.schoolId
@Roles('SCHOOL_ADMIN', 'TEACHER')
export class SchoolAdminStudentsController {
  constructor(
    private readonly schoolAdminStudentsService: SchoolAdminStudentsService
  ) {}

  @Get()
  async getStudentsInMySchool(
    @Request() req: any
  ): Promise<ResponseDto<StudentDto[]>> {
    // ✅ schoolId automatically set by SchoolDataAccessGuard
    const schoolId = req.schoolId;
    const data = await this.schoolAdminStudentsService.getStudentsInMySchool(
      req.user,
      schoolId
    );
    return ResponseDto.ok(data, 'Students retrieved successfully');
  }
}
```

#### 6.2 Student Controller

```typescript
// apps/api/src/students/student/student.controller.ts

@Controller('student')
@UseGuards(JwtAuthGuard, StudentDataAccessGuard)
@Roles('STUDENT')
export class StudentController {
  constructor(
    private readonly studentCurrentSchoolService: StudentCurrentSchoolService,
    private readonly studentTranscriptService: StudentTranscriptService
  ) {}

  // ✅ Current School Operations (scoped to active enrollment)
  @Get('classes')
  async getMyCurrentClasses(
    @Request() req: any
  ): Promise<ResponseDto<ClassDto[]>> {
    const data = await this.studentCurrentSchoolService.getMyCurrentClasses(req.user);
    return ResponseDto.ok(data, 'Current classes retrieved successfully');
  }

  @Get('grades/current')
  async getMyCurrentGrades(
    @Request() req: any
  ): Promise<ResponseDto<GradeDto[]>> {
    const data = await this.studentCurrentSchoolService.getMyCurrentGrades(req.user);
    return ResponseDto.ok(data, 'Current grades retrieved successfully');
  }

  // ✅ Transcript Operations (cross-school access)
  @Get('transcript/complete')
  async getMyCompleteTranscript(
    @Request() req: any
  ): Promise<ResponseDto<CompleteTranscriptDto>> {
    // Student can see all their enrollments across all schools (active and inactive)
    const data = await this.studentTranscriptService.getMyCompleteTranscript(req.user);
    return ResponseDto.ok(data, 'Complete transcript retrieved successfully');
  }

  @Get('transcript/school/:schoolId')
  async getMyTranscriptForSchool(
    @Request() req: any,
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<SchoolTranscriptDto>> {
    // Student can see their transcript for any school they were enrolled in (current or previous)
    const data = await this.studentTranscriptService.getMyTranscriptForSchool(
      req.user,
      schoolId
    );
    return ResponseDto.ok(data, 'School transcript retrieved successfully');
  }

  @Get('schools')
  async getMySchools(
    @Request() req: any
  ): Promise<ResponseDto<SchoolEnrollmentDto[]>> {
    // Get all schools student has been enrolled in (with current school marked)
    const data = await this.studentTranscriptService.getMySchools(req.user);
    return ResponseDto.ok(data, 'Schools retrieved successfully');
  }
}
```

## Implementation Order (Critical)

### ✅ Step 1: Fix Authentication (MUST DO FIRST)
1. Update `auth.service.ts` to include `schoolId` and `publicId` in JWT
2. Update `jwt.strategy.ts` to attach context to user object
3. Test login with public ID - verify JWT contains school context

### ✅ Step 2: Fix Guards
1. Update `SchoolDataAccessGuard` to use `user.currentSchoolId` from JWT
2. Add verification that user actually has access to that school
3. Test with multi-school users

### ✅ Step 3: Update Architecture Proposal
1. Fix all `extractSchoolIdFromUser` methods to use JWT context
2. Update repositories to use `request.schoolId` from guard
3. Update services to accept `schoolId` parameter

### ✅ Step 4: Implement Repository Pattern
1. Create `SchoolScopedRepository` that uses `schoolId` parameter
2. Update services to use repository
3. Ensure all queries are scoped to school

## Key Principles

### 1. **Single Source of Truth: JWT**
- School context comes from JWT, not from user relations
- JWT is set at login time:
  - **SCHOOL_ADMIN/TEACHER**: Based on public ID used (one school per login)
  - **STUDENT**: Based on active enrollment (`isActive: true`) at login time
  - **SUPER_ADMIN**: No school context (can access all schools)
- Guards verify JWT school context is valid (when present)

### 2. **Defense in Depth**
- JWT contains school context
- Guards verify user has access to that school
- Repositories enforce school scoping
- Services never trust client-provided school IDs

### 3. **Backward Compatibility**
- Fallback to first school if JWT doesn't have context
- Gradual migration path
- Support both old and new tokens during transition

### 4. **Multi-School Support**
- Users with multiple schools must log out and log in with different public ID
- Each login session is scoped to one school context
- Simpler security model - one school context per session

## Testing Checklist

- [ ] **Super admin logs in with email** → JWT does NOT contain `schoolId` (correct behavior)
- [ ] **Super admin can access any school** → No school context restriction
- [ ] **School admin/teacher logs in with public ID** → JWT contains `schoolId` and `publicId`
- [ ] **Student logs in with email** → JWT contains `schoolId` from active enrollment
- [ ] **Student with no active enrollment** → JWT doesn't contain `schoolId` (can still access transcripts)
- [ ] Guard enforces school isolation → User can't access other school's data
- [ ] Repository queries are scoped → Only returns data from user's school
- [ ] **Student current school operations** → Scoped to active enrollment's school
- [ ] **Student transcript operations** → Can access all enrollments (active and inactive) across all schools
- [ ] User with multiple schools → Must log out and log in with different public ID to switch

## Migration Notes

1. **Existing Tokens**: Old tokens without `schoolId` will fallback to first school
2. **Token Refresh**: When refreshing tokens, preserve school context
3. **Logout/Login**: Users should re-login to get new JWT with school context
4. **Frontend**: Update to handle school context in user object and support switching

## Proposed Folder Architecture

To implement this multi-tenant architecture, use the following folder structure:

```
apps/api/src/
├── auth/                           # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts        # ✅ Updated to include school context
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── dto/
│   │   └── login.dto.ts
│   └── types/
│       └── user-with-context.type.ts  # ✅ NEW: UserWithContext interface
│
├── common/                         # Shared utilities
│   ├── guards/
│   │   ├── school-data-access.guard.ts  # ✅ NEW: Enforces school isolation
│   │   └── student-data-access.guard.ts # ✅ NEW: Student data access
│   └── decorators/
│       └── school-context.decorator.ts  # Optional: Extract schoolId from request
│
├── schools/                        # Schools module
│   ├── domain/
│   │   ├── repositories/
│   │   │   ├── school.repository.ts
│   │   │   ├── staff.repository.ts
│   │   │   └── school-scoped.repository.ts  # ✅ NEW: School-isolated queries
│   │   └── mappers/
│   │       ├── school.mapper.ts
│   │       └── staff.mapper.ts
│   │
│   ├── super-admin/                # Super admin operations
│   │   ├── super-admin-schools.controller.ts
│   │   ├── super-admin-schools.service.ts
│   │   └── dto/
│   │
│   ├── school-admin/               # School admin operations (isolated)
│   │   ├── school-admin-schools.controller.ts
│   │   ├── school-admin-schools.service.ts
│   │   ├── school-admin-students.controller.ts  # ✅ NEW
│   │   ├── school-admin-students.service.ts     # ✅ NEW
│   │   └── dto/
│   │
│   ├── staff/                      # Staff management
│   │   ├── staff.controller.ts
│   │   ├── staff.service.ts
│   │   ├── teachers/
│   │   │   ├── teacher.service.ts
│   │   │   └── teacher.controller.ts
│   │   └── admins/
│   │       ├── admin.service.ts
│   │       └── admin.controller.ts
│   │
│   ├── shared/                     # Shared utilities
│   │   ├── id-generator.service.ts
│   │   ├── school-validator.service.ts
│   │   └── staff-validator.service.ts
│   │
│   ├── dto/
│   └── schools.module.ts
│
├── students/                       # Students module
│   ├── student/                    # Student-facing operations
│   │   ├── student.controller.ts           # ✅ NEW: Combined controller
│   │   ├── student-current-school.service.ts  # ✅ NEW: Current school operations (scoped)
│   │   └── student-transcript.service.ts     # ✅ NEW: Transcript operations (cross-school)
│   │
│   ├── school-admin/               # School admin operations (isolated)
│   │   ├── school-admin-students.controller.ts
│   │   └── school-admin-students.service.ts
│   │
│   ├── domain/
│   │   ├── repositories/
│   │   │   ├── student-transcript.repository.ts  # Cross-school queries
│   │   │   └── school-scoped.repository.ts       # School-isolated queries
│   │   └── mappers/
│   │       └── transcript.mapper.ts
│   │
│   └── students.module.ts
│
├── tenant/                         # Tenant middleware (existing)
│   ├── tenant.middleware.ts
│   └── tenant.service.ts
│
└── database/
    └── prisma.service.ts
```

### Key Files to Create/Update

#### New Files:
1. `apps/api/src/auth/types/user-with-context.type.ts` - UserWithContext interface
2. `apps/api/src/common/guards/school-data-access.guard.ts` - School isolation guard
3. `apps/api/src/common/guards/student-data-access.guard.ts` - Student data access guard
4. `apps/api/src/schools/domain/repositories/school-scoped.repository.ts` - School-scoped queries
5. `apps/api/src/students/domain/repositories/school-scoped.repository.ts` - School-scoped student queries

#### Files to Update:
1. `apps/api/src/auth/auth.service.ts` - Add school context to JWT (including student active enrollment)
2. `apps/api/src/auth/strategies/jwt.strategy.ts` - Attach context to user
3. All guards that extract schoolId - Use JWT context instead of first relation
4. All services that query by school - Use request.schoolId from guard
5. Student services - Separate current school operations from transcript operations

## Student School Context Strategy

### How It Works

1. **Login Time:**
   - Student logs in with email
   - System finds student's active enrollment (`isActive: true`)
   - Sets `schoolId` in JWT to active enrollment's school
   - If no active enrollment, `schoolId` remains `null` (student can still access transcripts)

2. **Current School Operations (Scoped):**
   - Classes, assignments, current grades, attendance
   - All scoped to active enrollment's school (`user.currentSchoolId` from JWT)
   - Uses `SchoolDataAccessGuard` to enforce isolation
   - Repository queries filter by `schoolId` and `isActive: true`

3. **Transcript Operations (Cross-School):**
   - Complete transcript, school-specific transcripts
   - Can access ALL enrollments (active and inactive) across all schools
   - Uses `StudentTranscriptRepository` which doesn't filter by `isActive`
   - Student can view historical data from previous schools

### Example Flow

```
Student logs in → Active enrollment found (School A)
  ↓
JWT contains: { sub: userId, role: 'STUDENT', schoolId: 'school-a-id' }
  ↓
GET /student/classes → Returns classes from School A only (current school)
GET /student/grades/current → Returns grades from School A active enrollment only
  ↓
GET /student/transcript/complete → Returns ALL enrollments (School A, B, C - active and inactive)
GET /student/transcript/school/school-b-id → Returns transcript from School B (previous school)
```

### Key Benefits

- ✅ Students see current school context (classes, assignments, etc.)
- ✅ Students can access historical transcripts from previous schools
- ✅ Clear separation between "current operations" and "historical data"
- ✅ Security: Current operations are isolated to active enrollment's school
- ✅ Flexibility: Transcript access allows viewing complete academic history

## Summary

The architecture proposal is solid, but **must be updated** to:
1. Use JWT school context instead of first relation
2. Include school context in JWT at login:
   - **SCHOOL_ADMIN/TEACHER**: Based on public ID used
   - **STUDENT**: Based on active enrollment (`isActive: true`)
   - **SUPER_ADMIN**: No school context (can access all schools)
3. Verify school access in guards
4. Separate student operations: current school (scoped) vs transcripts (cross-school)
5. Implement proper folder structure for multi-tenancy

Without these fixes, the multi-tenant architecture will be broken for users with multiple schools.

