# Backend Architecture Refactoring Proposal

## Current Issues

1. **Monolithic Service Files**: `schools.service.ts` is 1702 lines handling:
   - School CRUD operations
   - Admin management (add, update, delete, make principal)
   - Teacher management (add, update, delete, convert to admin)
   - Principal management
   - ID generation utilities
   - Email notifications
   - Validation logic
   - Data transformation

2. **Mixed Concerns**: Business logic, data access, and presentation logic are intertwined

3. **No Role-Based Separation**: Super admin and school admin operations are in the same service

4. **Hard to Test**: Large services make unit testing difficult

5. **Hard to Maintain**: Finding and modifying specific functionality is challenging

## Proposed Architecture

### 1. Feature-Based Module Structure

```
apps/api/src/
├── schools/
│   ├── domain/                    # Core domain logic
│   │   ├── entities/              # Domain entities (if needed)
│   │   ├── repositories/          # Data access layer
│   │   │   ├── school.repository.ts
│   │   │   ├── staff.repository.ts
│   │   │   └── principal.repository.ts
│   │   └── mappers/               # Entity to DTO mappers
│   │       ├── school.mapper.ts
│   │       └── staff.mapper.ts
│   │
│   ├── super-admin/               # Super admin specific operations
│   │   ├── super-admin-schools.controller.ts
│   │   ├── super-admin-schools.service.ts
│   │   └── dto/
│   │
│   ├── school-admin/              # School admin specific operations
│   │   ├── school-admin-schools.controller.ts
│   │   ├── school-admin-schools.service.ts
│   │   └── dto/
│   │
│   ├── staff/                     # Staff management (shared)
│   │   ├── staff.controller.ts
│   │   ├── staff.service.ts
│   │   ├── teachers/
│   │   │   ├── teacher.service.ts
│   │   │   └── teacher.controller.ts
│   │   └── admins/
│   │       ├── admin.service.ts
│   │       └── admin.controller.ts
│   │
│   ├── shared/                    # Shared utilities and services
│   │   ├── id-generator.service.ts
│   │   ├── school-validator.service.ts
│   │   └── staff-validator.service.ts
│   │
│   ├── dto/                       # Shared DTOs
│   └── schools.module.ts
│
├── analytics/
│   ├── super-admin/               # Super admin analytics
│   │   └── super-admin-analytics.service.ts
│   ├── school-admin/             # School admin analytics
│   │   └── school-admin-analytics.service.ts
│   ├── shared/                    # Shared analytics logic
│   │   ├── analytics.repository.ts
│   │   └── analytics-calculator.service.ts
│   └── analytics.module.ts
```

### 2. Repository Pattern

**Purpose**: Separate data access from business logic

```typescript
// apps/api/src/schools/domain/repositories/school.repository.ts
@Injectable()
export class SchoolRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<School | null> {
    return this.prisma.school.findUnique({ where: { id } });
  }

  async findBySubdomain(subdomain: string): Promise<School | null> {
    return this.prisma.school.findUnique({ where: { subdomain } });
  }

  async findByIdOrSubdomain(identifier: string): Promise<School | null> {
    return this.prisma.school.findFirst({
      where: {
        OR: [{ id: identifier }, { subdomain: identifier }],
      },
    });
  }

  async create(data: Prisma.SchoolCreateInput): Promise<School> {
    return this.prisma.school.create({ data });
  }

  async update(id: string, data: Prisma.SchoolUpdateInput): Promise<School> {
    return this.prisma.school.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.school.delete({ where: { id } });
  }

  async findAll(): Promise<School[]> {
    return this.prisma.school.findMany({
      where: { isActive: true },
      include: {
        admins: { include: { user: true } },
        teachers: true,
      },
    });
  }
}
```

### 3. Mapper Pattern

**Purpose**: Transform entities to DTOs and vice versa

```typescript
// apps/api/src/schools/domain/mappers/school.mapper.ts
@Injectable()
export class SchoolMapper {
  toDto(school: School & { admins?: SchoolAdmin[]; teachers?: Teacher[] }): SchoolDto {
    return {
      id: school.id,
      schoolId: school.schoolId,
      name: school.name,
      subdomain: school.subdomain,
      domain: school.domain,
      address: school.address,
      city: school.city,
      state: school.state,
      country: school.country,
      phone: school.phone,
      email: school.email,
      isActive: school.isActive,
      hasPrimary: school.hasPrimary,
      hasSecondary: school.hasSecondary,
      hasTertiary: school.hasTertiary,
      createdAt: school.createdAt,
      admins: school.admins?.map(this.adminToDto) || [],
      teachers: school.teachers?.map(this.teacherToDto) || [],
      teachersCount: school.teachers?.length || 0,
    };
  }

  private adminToDto(admin: SchoolAdmin): SchoolAdminDto {
    return {
      id: admin.id,
      adminId: admin.adminId,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      createdAt: admin.createdAt,
    };
  }

  private teacherToDto(teacher: Teacher): TeacherDto {
    return {
      id: teacher.id,
      teacherId: teacher.teacherId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      employeeId: teacher.employeeId,
      subject: teacher.subject,
      isTemporary: teacher.isTemporary,
      createdAt: teacher.createdAt,
    };
  }
}
```

### 4. Service Separation by Role

**Super Admin Service** (only super admin operations):
```typescript
// apps/api/src/schools/super-admin/super-admin-schools.service.ts
@Injectable()
export class SuperAdminSchoolsService {
  constructor(
    private schoolRepository: SchoolRepository,
    private schoolMapper: SchoolMapper,
    private idGenerator: IdGeneratorService,
    private schoolValidator: SchoolValidatorService,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  async createSchool(dto: CreateSchoolDto): Promise<SchoolDto> {
    // Validation
    await this.schoolValidator.validateCreate(dto);
    
    // Generate IDs
    const schoolId = await this.idGenerator.generateSchoolId();
    
    // Create school
    const school = await this.schoolRepository.create({
      // ... school data
    });
    
    // Handle principal if provided
    if (dto.principal) {
      await this.createPrincipal(school.id, dto.principal);
    }
    
    // Send emails
    await this.sendWelcomeEmails(school);
    
    return this.schoolMapper.toDto(school);
  }

  async findAll(): Promise<SchoolDto[]> {
    const schools = await this.schoolRepository.findAll();
    return schools.map(school => this.schoolMapper.toDto(school));
  }

  async updateSchool(id: string, dto: UpdateSchoolDto): Promise<SchoolDto> {
    await this.schoolValidator.validateUpdate(id, dto);
    const school = await this.schoolRepository.update(id, dto);
    return this.schoolMapper.toDto(school);
  }

  async deleteSchool(id: string): Promise<void> {
    await this.schoolValidator.validateDelete(id);
    await this.schoolRepository.delete(id);
  }
}
```

**School Admin Service** (school admin operations):
```typescript
// apps/api/src/schools/school-admin/school-admin-schools.service.ts
@Injectable()
export class SchoolAdminSchoolsService {
  constructor(
    private schoolRepository: SchoolRepository,
    private staffService: StaffService,
    private schoolMapper: SchoolMapper
  ) {}

  async getMySchool(user: User): Promise<SchoolDto> {
    const schoolId = this.extractSchoolIdFromUser(user);
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }
    return this.schoolMapper.toDto(school);
  }

  async addStaff(schoolId: string, staffData: AddStaffDto): Promise<StaffDto> {
    // Delegate to staff service
    return this.staffService.addStaff(schoolId, staffData);
  }

  private extractSchoolIdFromUser(user: User): string {
    // Extract school ID from user's relations
    if (user.schoolAdmins?.length > 0) {
      return user.schoolAdmins[0].schoolId;
    }
    if (user.teacherProfiles?.length > 0) {
      return user.teacherProfiles[0].schoolId;
    }
    throw new BadRequestException('School not found for user');
  }
}
```

### 5. Staff Management Service

```typescript
// apps/api/src/schools/staff/staff.service.ts
@Injectable()
export class StaffService {
  constructor(
    private staffRepository: StaffRepository,
    private idGenerator: IdGeneratorService,
    private staffValidator: StaffValidatorService,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  async addAdmin(schoolId: string, dto: AddAdminDto): Promise<AdminDto> {
    await this.staffValidator.validateAddAdmin(schoolId, dto);
    
    const adminId = await this.idGenerator.generateAdminId();
    const publicId = await this.idGenerator.generatePublicId(schoolId, 'admin');
    
    const admin = await this.staffRepository.createAdmin({
      schoolId,
      adminId,
      publicId,
      ...dto,
    });
    
    await this.sendWelcomeEmail(admin);
    
    return this.staffMapper.adminToDto(admin);
  }

  async addTeacher(schoolId: string, dto: AddTeacherDto): Promise<TeacherDto> {
    await this.staffValidator.validateAddTeacher(schoolId, dto);
    
    const teacherId = await this.idGenerator.generateTeacherId();
    const publicId = await this.idGenerator.generatePublicId(schoolId, 'teacher');
    
    const teacher = await this.staffRepository.createTeacher({
      schoolId,
      teacherId,
      publicId,
      ...dto,
    });
    
    await this.sendWelcomeEmail(teacher);
    
    return this.staffMapper.teacherToDto(teacher);
  }

  async updateAdmin(schoolId: string, adminId: string, dto: UpdateAdminDto): Promise<AdminDto> {
    await this.staffValidator.validateUpdateAdmin(schoolId, adminId, dto);
    const admin = await this.staffRepository.updateAdmin(adminId, dto);
    return this.staffMapper.adminToDto(admin);
  }

  async deleteAdmin(schoolId: string, adminId: string): Promise<void> {
    await this.staffValidator.validateDeleteAdmin(schoolId, adminId);
    await this.staffRepository.deleteAdmin(adminId);
  }

  async makePrincipal(schoolId: string, adminId: string): Promise<void> {
    await this.staffValidator.validateMakePrincipal(schoolId, adminId);
    
    // Get current principal
    const currentPrincipal = await this.staffRepository.findPrincipal(schoolId);
    
    // Update current principal to admin
    if (currentPrincipal) {
      await this.staffRepository.updateAdmin(currentPrincipal.id, { role: 'Administrator' });
    }
    
    // Make new principal
    await this.staffRepository.updateAdmin(adminId, { role: 'Principal' });
    
    // Send notification emails
    await this.sendRoleChangeEmails(schoolId, adminId, 'Principal');
  }
}
```

### 6. Utility Services

```typescript
// apps/api/src/schools/shared/id-generator.service.ts
@Injectable()
export class IdGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generateSchoolId(): Promise<string> {
    let schoolId: string;
    let exists = true;
    
    while (exists) {
      const uuid = uuidv4().replace(/-/g, '').toUpperCase();
      schoolId = `AG-SCH-${uuid}`;
      exists = !!(await this.prisma.school.findFirst({ where: { schoolId } }));
    }
    
    return schoolId;
  }

  async generateAdminId(): Promise<string> {
    // Similar pattern
  }

  async generateTeacherId(): Promise<string> {
    // Similar pattern
  }

  async generatePublicId(schoolId: string, type: 'admin' | 'teacher' | 'principal'): Promise<string> {
    // Generate public ID with school prefix
  }
}
```

### 7. Validation Services

```typescript
// apps/api/src/schools/shared/school-validator.service.ts
@Injectable()
export class SchoolValidatorService {
  constructor(private schoolRepository: SchoolRepository) {}

  async validateCreate(dto: CreateSchoolDto): Promise<void> {
    // Check subdomain uniqueness
    const existing = await this.schoolRepository.findBySubdomain(dto.subdomain);
    if (existing) {
      throw new ConflictException('School with subdomain already exists');
    }
    
    // Other validations
  }

  async validateUpdate(id: string, dto: UpdateSchoolDto): Promise<void> {
    const school = await this.schoolRepository.findByIdOrSubdomain(id);
    if (!school) {
      throw new BadRequestException('School not found');
    }
    
    // Check subdomain uniqueness if changed
    if (dto.subdomain && dto.subdomain !== school.subdomain) {
      const existing = await this.schoolRepository.findBySubdomain(dto.subdomain);
      if (existing) {
        throw new ConflictException('Subdomain already exists');
      }
    }
  }
}
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each service has a single responsibility
2. **Testability**: Smaller, focused services are easier to unit test
3. **Maintainability**: Easy to find and modify specific functionality
4. **Scalability**: Easy to add new features without touching existing code
5. **Role-Based Access**: Clear separation between super admin and school admin operations
6. **Reusability**: Shared utilities and repositories can be reused
7. **Type Safety**: Better TypeScript support with clear interfaces

## Migration Strategy

1. **Phase 1**: Create repository and mapper classes
2. **Phase 2**: Extract utility services (ID generator, validators)
3. **Phase 3**: Create staff service and separate from school service
4. **Phase 4**: Split super admin and school admin services
5. **Phase 5**: Update controllers to use new services
6. **Phase 6**: Remove old monolithic service

## Example: Refactored Controller

```typescript
// apps/api/src/schools/super-admin/super-admin-schools.controller.ts
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminSchoolsController {
  constructor(
    private readonly superAdminSchoolsService: SuperAdminSchoolsService
  ) {}

  @Post()
  async createSchool(@Body() dto: CreateSchoolDto): Promise<ResponseDto<SchoolDto>> {
    const data = await this.superAdminSchoolsService.createSchool(dto);
    return ResponseDto.ok(data, 'School created successfully');
  }

  @Get()
  async findAll(): Promise<ResponseDto<SchoolDto[]>> {
    const data = await this.superAdminSchoolsService.findAll();
    return ResponseDto.ok(data, 'Schools retrieved successfully');
  }
}

// apps/api/src/schools/school-admin/school-admin-schools.controller.ts
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'PRINCIPAL')
export class SchoolAdminSchoolsController {
  constructor(
    private readonly schoolAdminSchoolsService: SchoolAdminSchoolsService,
    private readonly staffService: StaffService
  ) {}

  @Get('me')
  async getMySchool(@Request() req: any): Promise<ResponseDto<SchoolDto>> {
    const data = await this.schoolAdminSchoolsService.getMySchool(req.user);
    return ResponseDto.ok(data, 'School retrieved successfully');
  }

  @Post('me/staff')
  async addStaff(
    @Request() req: any,
    @Body() dto: AddStaffDto
  ): Promise<ResponseDto<StaffDto>> {
    const schoolId = await this.schoolAdminSchoolsService.extractSchoolId(req.user);
    const data = await this.staffService.addStaff(schoolId, dto);
    return ResponseDto.ok(data, 'Staff added successfully');
  }
}
```

## Multi-Tenancy & Data Isolation Architecture

### Current Data Model

Based on the Prisma schema:
- **Student**: Global entity (not tied to a single school)
- **Enrollment**: Links students to schools (one student can have multiple enrollments)
- **Grade**: Tied to Enrollment (school-specific academic records)
- **Transfer**: Allows students to move between schools
- **School**: Tenant boundary (each school is isolated)

### Data Isolation Strategy

#### 1. School-Level Isolation (School Admins/Teachers)

**Principle**: School admins and teachers can ONLY access data from their own school.

```typescript
// apps/api/src/schools/domain/repositories/school-scoped.repository.ts
@Injectable()
export class SchoolScopedRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * All queries automatically scoped to schoolId
   */
  async findEnrollmentsBySchool(schoolId: string): Promise<Enrollment[]> {
    return this.prisma.enrollment.findMany({
      where: { schoolId, isActive: true },
      include: {
        student: true,
        grades: true,
        attendances: true,
      },
    });
  }

  async findStudentsBySchool(schoolId: string): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            schoolId,
            isActive: true,
          },
        },
      },
      include: {
        enrollments: {
          where: { schoolId, isActive: true },
        },
      },
    });
  }

  async findGradesBySchool(schoolId: string): Promise<Grade[]> {
    return this.prisma.grade.findMany({
      where: {
        enrollment: {
          schoolId,
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
      },
    });
  }
}
```

#### 2. Student Cross-School Access

**Principle**: Students can access their own data across ALL schools they've been enrolled in.

```typescript
// apps/api/src/students/domain/repositories/student-transcript.repository.ts
@Injectable()
export class StudentTranscriptRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all enrollments for a student across all schools
   * Used for building complete transcript
   */
  async findAllEnrollmentsForStudent(studentId: string): Promise<Enrollment[]> {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            schoolId: true,
            hasPrimary: true,
            hasSecondary: true,
            hasTertiary: true,
          },
        },
        grades: {
          orderBy: [
            { academicYear: 'desc' },
            { term: 'desc' },
          ],
        },
        attendances: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { enrollmentDate: 'desc' },
      ],
    });
  }

  /**
   * Get transcript for a specific school
   */
  async getTranscriptForSchool(
    studentId: string,
    schoolId: string
  ): Promise<Enrollment | null> {
    return this.prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolId,
      },
      include: {
        school: true,
        grades: {
          orderBy: [
            { academicYear: 'desc' },
            { term: 'desc' },
          ],
        },
        attendances: {
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  /**
   * Get complete academic history across all schools
   */
  async getCompleteTranscript(studentId: string): Promise<CompleteTranscriptDto> {
    const enrollments = await this.findAllEnrollmentsForStudent(studentId);
    
    return {
      studentId,
      enrollments: enrollments.map(enrollment => ({
        school: {
          id: enrollment.school.id,
          name: enrollment.school.name,
          schoolId: enrollment.school.schoolId,
          level: this.determineLevel(enrollment.school),
        },
        academicYear: enrollment.academicYear,
        classLevel: enrollment.classLevel,
        enrollmentDate: enrollment.enrollmentDate,
        isActive: enrollment.isActive,
        grades: enrollment.grades.map(grade => ({
          subject: grade.subject,
          score: grade.score,
          maxScore: grade.maxScore,
          term: grade.term,
          academicYear: grade.academicYear,
          remarks: grade.remarks,
        })),
        attendance: {
          totalDays: enrollment.attendances.length,
          present: enrollment.attendances.filter(a => a.status === 'PRESENT').length,
          absent: enrollment.attendances.filter(a => a.status === 'ABSENT').length,
        },
      })),
    };
  }

  private determineLevel(school: School): 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'MIXED' {
    const levels = [];
    if (school.hasPrimary) levels.push('PRIMARY');
    if (school.hasSecondary) levels.push('SECONDARY');
    if (school.hasTertiary) levels.push('TERTIARY');
    return levels.length > 1 ? 'MIXED' : (levels[0] as any);
  }
}
```

### Security Guards & Middleware

#### 1. School Data Access Guard

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
    const user = request.user;
    const schoolId = request.params.schoolId || request.body.schoolId;

    // Super admin can access any school
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Extract school ID from user's relations
    const userSchoolId = this.extractSchoolIdFromUser(user);
    
    // Verify user belongs to the school they're trying to access
    if (schoolId && schoolId !== userSchoolId) {
      throw new ForbiddenException('You can only access data from your own school');
    }

    // Attach school context to request
    request.schoolId = userSchoolId;
    return true;
  }

  private extractSchoolIdFromUser(user: User): string {
    if (user.schoolAdmins?.length > 0) {
      return user.schoolAdmins[0].schoolId;
    }
    if (user.teacherProfiles?.length > 0) {
      return user.teacherProfiles[0].schoolId;
    }
    throw new ForbiddenException('User is not associated with any school');
  }
}
```

#### 2. Student Data Access Guard

```typescript
// apps/api/src/common/guards/student-data-access.guard.ts
@Injectable()
export class StudentDataAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const studentId = request.params.studentId || request.params.id;

    // Super admin can access any student
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // School admin/teacher can access students from their school
    if (user.role === 'SCHOOL_ADMIN' || user.role === 'TEACHER') {
      const schoolId = this.extractSchoolIdFromUser(user);
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

    // Student can only access their own data
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

  private extractSchoolIdFromUser(user: User): string {
    // Same as above
  }
}
```

### Service Architecture for Multi-Tenancy

#### 1. School Admin Services (Isolated)

```typescript
// apps/api/src/schools/school-admin/school-admin-students.service.ts
@Injectable()
export class SchoolAdminStudentsService {
  constructor(
    private schoolScopedRepository: SchoolScopedRepository,
    private schoolDataAccessGuard: SchoolDataAccessGuard
  ) {}

  /**
   * Get all students in the school admin's school
   * Automatically scoped to their school
   */
  async getStudentsInMySchool(user: User): Promise<StudentDto[]> {
    const schoolId = this.extractSchoolIdFromUser(user);
    const students = await this.schoolScopedRepository.findStudentsBySchool(schoolId);
    return students.map(this.studentMapper.toDto);
  }

  /**
   * Get a specific student's data (only if enrolled in their school)
   */
  async getStudentInMySchool(
    user: User,
    studentId: string
  ): Promise<StudentDto> {
    const schoolId = this.extractSchoolIdFromUser(user);
    
    // Verify student is enrolled in this school
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolId,
        isActive: true,
      },
      include: {
        student: true,
        grades: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Student is not enrolled in your school');
    }

    return this.studentMapper.toDto(enrollment.student, {
      currentSchool: enrollment.school,
      currentEnrollment: enrollment,
    });
  }
}
```

#### 2. Student Services (Cross-School)

```typescript
// apps/api/src/students/student/student-transcript.service.ts
@Injectable()
export class StudentTranscriptService {
  constructor(
    private transcriptRepository: StudentTranscriptRepository,
    private studentDataAccessGuard: StudentDataAccessGuard
  ) {}

  /**
   * Get complete transcript across all schools
   * Only accessible by the student themselves
   */
  async getMyCompleteTranscript(user: User): Promise<CompleteTranscriptDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.transcriptRepository.getCompleteTranscript(student.id);
  }

  /**
   * Get transcript for a specific school
   */
  async getMyTranscriptForSchool(
    user: User,
    schoolId: string
  ): Promise<SchoolTranscriptDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

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
   * Get current school enrollment
   */
  async getMyCurrentSchool(user: User): Promise<CurrentSchoolDto> {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            school: true,
          },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          // Get most recent active enrollment
        },
      },
    });

    if (!student || !student.enrollments.length) {
      throw new NotFoundException('No active enrollment found');
    }

    const enrollment = student.enrollments[0];
    return {
      school: {
        id: enrollment.school.id,
        name: enrollment.school.name,
        schoolId: enrollment.school.schoolId,
      },
      classLevel: enrollment.classLevel,
      academicYear: enrollment.academicYear,
      enrollmentDate: enrollment.enrollmentDate,
    };
  }
}
```

### Controller Examples

#### School Admin Controller (Isolated)

```typescript
// apps/api/src/schools/school-admin/school-admin-students.controller.ts
@Controller('school-admin/students')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@Roles('SCHOOL_ADMIN', 'TEACHER')
export class SchoolAdminStudentsController {
  constructor(
    private readonly schoolAdminStudentsService: SchoolAdminStudentsService
  ) {}

  @Get()
  async getStudentsInMySchool(@Request() req: any): Promise<ResponseDto<StudentDto[]>> {
    // schoolId automatically set by SchoolDataAccessGuard
    const data = await this.schoolAdminStudentsService.getStudentsInMySchool(req.user);
    return ResponseDto.ok(data, 'Students retrieved successfully');
  }

  @Get(':studentId')
  async getStudentInMySchool(
    @Request() req: any,
    @Param('studentId') studentId: string
  ): Promise<ResponseDto<StudentDto>> {
    // Guard ensures student is enrolled in admin's school
    const data = await this.schoolAdminStudentsService.getStudentInMySchool(
      req.user,
      studentId
    );
    return ResponseDto.ok(data, 'Student retrieved successfully');
  }
}
```

#### Student Controller (Cross-School)

```typescript
// apps/api/src/students/student/student-transcript.controller.ts
@Controller('student/transcript')
@UseGuards(JwtAuthGuard, StudentDataAccessGuard)
@Roles('STUDENT')
export class StudentTranscriptController {
  constructor(
    private readonly studentTranscriptService: StudentTranscriptService
  ) {}

  @Get('complete')
  async getMyCompleteTranscript(
    @Request() req: any
  ): Promise<ResponseDto<CompleteTranscriptDto>> {
    // Student can see all their enrollments across all schools
    const data = await this.studentTranscriptService.getMyCompleteTranscript(req.user);
    return ResponseDto.ok(data, 'Complete transcript retrieved successfully');
  }

  @Get('school/:schoolId')
  async getMyTranscriptForSchool(
    @Request() req: any,
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<SchoolTranscriptDto>> {
    // Student can see their transcript for any school they were enrolled in
    const data = await this.studentTranscriptService.getMyTranscriptForSchool(
      req.user,
      schoolId
    );
    return ResponseDto.ok(data, 'School transcript retrieved successfully');
  }

  @Get('current-school')
  async getMyCurrentSchool(
    @Request() req: any
  ): Promise<ResponseDto<CurrentSchoolDto>> {
    const data = await this.studentTranscriptService.getMyCurrentSchool(req.user);
    return ResponseDto.ok(data, 'Current school retrieved successfully');
  }
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Student Login                            │
│              (Role: STUDENT)                                │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         StudentTranscriptService.getMyCompleteTranscript()  │
│                                                             │
│  1. Verify user is STUDENT                                  │
│  2. Find student profile                                    │
│  3. Query ALL enrollments (across all schools)              │
│  4. Include grades, attendance from each enrollment         │
│  5. Return aggregated transcript                           │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Complete Transcript Response                   │
│                                                             │
│  - Primary School (2020-2023)                               │
│    - JSS1, JSS2, JSS3                                       │
│    - All grades, attendance                                 │
│                                                             │
│  - Secondary School (2023-2026)                             │
│    - SS1, SS2, SS3                                          │
│    - All grades, attendance                                 │
│                                                             │
│  - Tertiary (2026-present)                                  │
│    - Year 1, Year 2                                         │
│    - All grades, attendance                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              School Admin Login                             │
│              (Role: SCHOOL_ADMIN, schoolId: "school-123")   │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│    SchoolAdminStudentsService.getStudentsInMySchool()       │
│                                                             │
│  1. Extract schoolId from user (school-123)                 │
│  2. Query enrollments WHERE schoolId = "school-123"         │
│  3. Return ONLY students from their school                  │
│  4. Cannot see students from other schools                  │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Students List Response                         │
│                                                             │
│  - Only students enrolled in school-123                     │
│  - Only grades/attendance from school-123                   │
│  - Cannot see student's history from other schools          │
└─────────────────────────────────────────────────────────────┘
```

### Key Security Principles

1. **School Isolation**: 
   - All school admin/teacher queries MUST include `WHERE schoolId = user.schoolId`
   - Guards enforce this at the controller level
   - Repositories automatically scope queries

2. **Student Cross-School Access**:
   - Students can query their own data across ALL schools
   - Queries use `WHERE studentId = user.studentId` (no school filter)
   - Guards ensure students can only access their own data

3. **Super Admin Override**:
   - Super admin can access any school's data
   - Guards check role and allow cross-school access

4. **Data Validation**:
   - Always verify ownership before returning data
   - Use Prisma's relation filters for automatic scoping
   - Never trust client-provided school IDs

## Updated Module Structure

```
apps/api/src/
├── students/
│   ├── student/                    # Student-facing operations
│   │   ├── student-transcript.controller.ts
│   │   ├── student-transcript.service.ts
│   │   └── student-current-school.service.ts
│   ├── school-admin/               # School admin operations (isolated)
│   │   ├── school-admin-students.controller.ts
│   │   └── school-admin-students.service.ts
│   ├── domain/
│   │   ├── repositories/
│   │   │   ├── student-transcript.repository.ts  # Cross-school queries
│   │   │   └── school-scoped.repository.ts       # School-isolated queries
│   │   └── mappers/
│   │       └── transcript.mapper.ts
│   └── students.module.ts
```

## Next Steps

1. Review and approve this architecture
2. Start with Phase 1 (repositories and mappers)
3. Implement security guards for data access
4. Gradually refactor existing code
5. Write tests for each new service
6. Update documentation

