import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StudentDto, StudentWithEnrollmentDto } from './dto/student.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { ClassType } from '../schools/dto/create-class.dto';
import { UserWithContext } from '../auth/types/user-with-context.type';
import { TimetableService } from '../timetable/timetable.service';
import { GradesService } from '../grades/grades.service';
import { EventService } from '../events/event.service';
import { CloudinaryService } from '../storage/cloudinary/cloudinary.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timetableService: TimetableService,
    private readonly gradesService: GradesService,
    private readonly eventService: EventService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    schoolType?: ClassType | string
  ): Promise<PaginatedResponseDto<StudentWithEnrollmentDto>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // If schoolType is provided, get classes of that type to filter enrollments
    let classIds: string[] | undefined;
    let classLevels: string[] | undefined;
    if (schoolType) {
      const classes = await this.prisma.class.findMany({
        where: {
          schoolId: tenantId,
          type: schoolType,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });
      classIds = classes.map((c) => c.id);
      classLevels = classes.map((c) => c.name);
      
      // If no classes found for this school type, return empty result
      if (classIds.length === 0 && classLevels.length === 0) {
        return new PaginatedResponseDto([], 0, page, limit);
      }
    }

    const whereClause: any = {
      enrollments: {
        some: {
          schoolId: tenantId,
          isActive: true,
          ...(schoolType && classIds && classLevels && (classIds.length > 0 || classLevels.length > 0)
            ? {
                OR: [
                  ...(classIds.length > 0 ? [{ classId: { in: classIds } }] : []),
                  ...(classLevels.length > 0 ? [{ classLevel: { in: classLevels } }] : []),
                ],
              }
            : {}),
        },
      },
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              accountStatus: true,
            },
          },
          enrollments: {
            where: {
              schoolId: tenantId,
              isActive: true,
              ...(schoolType && classIds && classLevels && (classIds.length > 0 || classLevels.length > 0)
                ? {
                    OR: [
                      ...(classIds.length > 0 ? [{ classId: { in: classIds } }] : []),
                      ...(classLevels.length > 0 ? [{ classLevel: { in: classLevels } }] : []),
                    ],
                  }
                : {}),
            },
            include: {
              school: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                },
              },
            },
            take: 1,
            orderBy: { enrollmentDate: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({
        where: whereClause,
      }),
    ]);

    return new PaginatedResponseDto(
      students.map((student) => ({
        ...this.toDto(student),
        enrollment: student.enrollments[0]
          ? {
              id: student.enrollments[0].id,
              classLevel: student.enrollments[0].classLevel,
              academicYear: student.enrollments[0].academicYear,
              enrollmentDate: student.enrollments[0].enrollmentDate.toISOString(),
              school: student.enrollments[0].school,
            }
          : undefined,
      })),
      total,
      page,
      limit
    );
  }

  async findOne(tenantId: string, id: string): Promise<StudentWithEnrollmentDto> {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        enrollments: {
          some: {
            schoolId: tenantId,
            isActive: true,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        enrollments: {
          where: {
            schoolId: tenantId,
            isActive: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
          take: 1,
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return {
      ...this.toDto(student),
      enrollment: student.enrollments[0]
        ? {
            id: student.enrollments[0].id,
            classLevel: student.enrollments[0].classLevel,
            academicYear: student.enrollments[0].academicYear,
            school: student.enrollments[0].school,
          }
        : undefined,
    };
  }

  async findByUid(tenantId: string, uid: string): Promise<StudentWithEnrollmentDto> {
    const student = await this.prisma.student.findUnique({
      where: { uid },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        enrollments: {
          where: {
            schoolId: tenantId,
            isActive: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
          take: 1,
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with UID ${uid} not found`);
    }

    // Verify student is enrolled in the tenant's school
    if (student.enrollments.length === 0) {
      throw new NotFoundException(`Student with UID ${uid} not found in this school`);
    }

    return {
      ...this.toDto(student),
      enrollment: {
        id: student.enrollments[0].id,
        classLevel: student.enrollments[0].classLevel,
        academicYear: student.enrollments[0].academicYear,
        school: student.enrollments[0].school,
      },
    };
  }

  async findByClassLevel(
    tenantId: string,
    classLevel: string
  ): Promise<StudentWithEnrollmentDto[]> {
    const students = await this.prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            schoolId: tenantId,
            classLevel: classLevel,
            isActive: true,
          },
        },
      },
      include: {
        enrollments: {
          where: {
            schoolId: tenantId,
            classLevel: classLevel,
            isActive: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
          take: 1,
          orderBy: { enrollmentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return students.map((student) => ({
      ...this.toDto(student),
      enrollment: student.enrollments[0]
        ? {
            id: student.enrollments[0].id,
            classLevel: student.enrollments[0].classLevel,
            academicYear: student.enrollments[0].academicYear,
            school: student.enrollments[0].school,
          }
        : undefined,
    }));
  }

  private toDto(student: any): StudentDto {
    // Parse healthInfo from JSON if it exists
    let healthInfo = null;
    if (student.healthInfo) {
      if (typeof student.healthInfo === 'string') {
        try {
          healthInfo = JSON.parse(student.healthInfo);
        } catch {
          healthInfo = null;
        }
      } else {
        healthInfo = student.healthInfo;
      }
    }

    return {
      id: student.id,
      uid: student.uid,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
      profileLocked: student.profileLocked,
      profileImage: student.profileImage,
      healthInfo: healthInfo,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      user: student.user ? {
        id: student.user.id,
        email: student.user.email,
        phone: student.user.phone,
        accountStatus: student.user.accountStatus,
      } : undefined,
    };
  }

  /**
   * Get current student profile
   */
  async getMyProfile(user: UserWithContext): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Find student by userId
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        enrollments: {
          where: {
            isActive: true,
            // If currentSchoolId is set, filter by it; otherwise get all active enrollments
            ...(user.currentSchoolId ? { schoolId: user.currentSchoolId } : {}),
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
                hasPrimary: true,
                hasSecondary: true,
                hasTertiary: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                type: true,
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

    // If no active enrollments, return profile without enrollments
    if (student.enrollments.length === 0) {
      return {
        ...this.toDto(student),
        enrollments: [],
        school: null,
      };
    }

    // Get the most recent active enrollment's school as the current school
    const currentEnrollment = student.enrollments[0];
    const currentSchool = currentEnrollment.school;

    return {
      ...this.toDto(student),
      enrollments: student.enrollments.map((e) => ({
        id: e.id,
        classLevel: e.classLevel,
        academicYear: e.academicYear,
        enrollmentDate: e.enrollmentDate.toISOString(),
        school: e.school,
        class: e.class,
      })),
      school: currentSchool, // Include current school for compatibility
    };
  }

  /**
   * Get all enrollments for current student
   */
  async getMyEnrollments(user: UserWithContext): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        enrollments: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                type: true,
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

    return student.enrollments.map((e) => ({
      id: e.id,
      classLevel: e.classLevel,
      academicYear: e.academicYear,
      enrollmentDate: e.enrollmentDate.toISOString(),
      isActive: e.isActive,
      school: e.school,
      class: e.class,
    }));
  }

  /**
   * Get timetable for current student
   */
  async getMyTimetable(
    user: UserWithContext,
    schoolId: string | null,
    termId?: string,
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student's active enrollments
    // If schoolId is provided, use it; otherwise get from active enrollments
    const studentWhere: any = {
      userId: user.id,
    };

    if (schoolId) {
      studentWhere.enrollments = {
        some: {
          schoolId,
          isActive: true,
        },
      };
    } else {
      studentWhere.enrollments = {
        some: {
          isActive: true,
        },
      };
    }

    const student = await this.prisma.student.findFirst({
      where: studentWhere,
      include: {
        enrollments: {
          where: {
            ...(schoolId ? { schoolId } : {}),
            isActive: true,
          },
          include: {
            class: true,
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return [];
    }

    // Get schoolId from enrollments if not provided
    const actualSchoolId = schoolId || student.enrollments[0]?.schoolId;
    if (!actualSchoolId) {
      return [];
    }

    // Get all class IDs from enrollments
    let classIds = student.enrollments
      .map((e) => e.classId)
      .filter((id): id is string => id !== null);

    // If no classIds found, try to find classes by classLevel
    if (classIds.length === 0) {
      const classLevels = student.enrollments
        .map((e) => e.classLevel)
        .filter((level): level is string => !!level);

      if (classLevels.length > 0) {
        // Find classes that match the classLevel
        const matchingClasses = await this.prisma.class.findMany({
          where: {
            schoolId: actualSchoolId,
            isActive: true,
            OR: [
              { name: { in: classLevels } },
              { classLevel: { in: classLevels } },
            ],
          },
          select: { id: true },
        });

        classIds = matchingClasses.map((c) => c.id);
      }
    }

    if (classIds.length === 0) {
      return [];
    }

    // Get active term if termId not provided
    let activeTermId = termId;
    if (!activeTermId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: {
          schoolId: actualSchoolId,
          isActive: true,
        },
        include: {
          terms: {
            where: {
              isActive: true,
            },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      });

      if (activeSession && activeSession.terms.length > 0) {
        activeTermId = activeSession.terms[0].id;
      } else {
        return [];
      }
    }

    // Get timetable periods for all enrolled classes
    // Build where clause with proper structure
    const whereClause: any = {
      termId: activeTermId,
      AND: [
        {
          OR: [
            { classId: { in: classIds } },
            // For classArms, we need to find periods where the classArm's classLevel
            // matches classes with the same name/classLevel as the enrollment
            // Since ClassLevel doesn't have a direct relation to Class, we'll just filter by classId
            // and let the school filter handle the rest
          ],
        },
      ],
    };

    // Ensure periods belong to the correct school
    if (actualSchoolId) {
      whereClause.AND.push({
        OR: [
          { class: { schoolId: actualSchoolId } },
          { classArm: { classLevel: { schoolId: actualSchoolId } } },
        ],
      });
    }

    const periods = await this.prisma.timetablePeriod.findMany({
      where: whereClause,
      include: {
        subject: true,
        course: true,
        class: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
        room: true,
        classArm: {
          include: {
            classLevel: true,
          },
        },
        term: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return periods.map((p: any) => ({
      id: p.id,
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime,
      endTime: p.endTime,
      type: p.type,
      subject: p.subject ? { id: p.subject.id, name: p.subject.name, code: p.subject.code } : null,
      course: p.course ? { id: p.course.id, name: p.course.name } : null,
      class: p.class ? { id: p.class.id, name: p.class.name } : null,
      classArm: p.classArm ? {
        id: p.classArm.id,
        name: p.classArm.name,
        classLevel: p.classArm.classLevel ? {
          id: p.classArm.classLevel.id,
          name: p.classArm.classLevel.name,
        } : null,
      } : null,
      teacher: p.teacher ? {
        id: p.teacher.id,
        firstName: p.teacher.firstName,
        lastName: p.teacher.lastName,
        subject: p.teacher.subject,
      } : null,
      room: p.room ? { id: p.room.id, name: p.room.name, code: p.room.code } : null,
      term: p.term ? { id: p.term.id, name: p.term.name } : null,
    }));
  }

  /**
   * Get published grades for current student
   */
  async getMyGrades(
    user: UserWithContext,
    schoolId: string | null,
    filters?: { classId?: string; termId?: string; subject?: string },
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Build where clause for student
    const studentWhere: any = {
      userId: user.id,
    };

    if (schoolId) {
      studentWhere.enrollments = {
        some: {
          schoolId,
          isActive: true,
        },
      };
    } else {
      studentWhere.enrollments = {
        some: {
          isActive: true,
        },
      };
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: studentWhere,
      include: {
        enrollments: {
          where: {
            ...(schoolId ? { schoolId } : {}),
            isActive: true,
            ...(filters?.classId ? { classId: filters.classId } : {}),
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return [];
    }

    const enrollmentIds = student.enrollments.map((e) => e.id);

    // Build where clause - only published grades
    const where: any = {
      enrollmentId: { in: enrollmentIds },
      isPublished: true, // Only published grades
    };

    if (filters?.subject) {
      where.subject = filters.subject;
    }

    if (filters?.termId) {
      where.termId = filters.termId;
    }

    // Get grades
    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { term: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return grades.map((grade) => ({
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      teacherId: grade.teacherId,
      subject: grade.subject,
      assessmentName: grade.assessmentName,
      score: grade.score.toNumber(),
      maxScore: grade.maxScore.toNumber(),
      percentage: grade.score.toNumber() / grade.maxScore.toNumber() * 100,
      remarks: grade.remarks,
      assessmentDate: grade.assessmentDate?.toISOString(),
      academicYear: grade.academicYear,
      term: grade.term,
      sequence: grade.sequence,
      isPublished: grade.isPublished,
      createdAt: grade.createdAt.toISOString(),
      enrollment: {
        id: grade.enrollment.id,
        classLevel: grade.enrollment.classLevel,
        class: grade.enrollment.class,
      },
      teacher: grade.teacher,
    }));
  }

  /**
   * Get attendance records for current student
   */
  async getMyAttendance(
    user: UserWithContext,
    schoolId: string | null,
    filters?: { classId?: string; termId?: string; startDate?: string; endDate?: string },
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const studentWhere: any = {
      userId: user.id,
    };

    if (schoolId) {
      studentWhere.enrollments = {
        some: {
          schoolId,
          isActive: true,
        },
      };
    }

    const student = await this.prisma.student.findFirst({
      where: studentWhere,
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Build where clause
    const where: any = {
      studentId: student.id,
    };

    if (filters?.classId) {
      where.classId = filters.classId;
    }

    if (filters?.termId) {
      where.termId = filters.termId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    // Get attendance records
    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return attendance.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      classId: a.classId,
      termId: a.termId,
      date: a.date.toISOString(),
      status: a.status,
      notes: a.notes,
      class: a.class,
      teacher: a.teacher,
    }));
  }

  /**
   * Get accessible resources for current student
   */
  async getMyResources(
    user: UserWithContext,
    schoolId: string | null,
    filters?: { classId?: string; resourceType?: string },
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student's active enrollments
    const studentWhere: any = {
      userId: user.id,
    };

    if (schoolId) {
      studentWhere.enrollments = {
        some: {
          schoolId,
          isActive: true,
        },
      };
    } else {
      studentWhere.enrollments = {
        some: {
          isActive: true,
        },
      };
    }

    const student = await this.prisma.student.findFirst({
      where: studentWhere,
      include: {
        enrollments: {
          where: {
            ...(schoolId ? { schoolId } : {}),
            isActive: true,
            ...(filters?.classId ? { classId: filters.classId } : {}),
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return [];
    }

    const classIds = student.enrollments
      .map((e) => e.classId)
      .filter((id): id is string => id !== null);

    if (classIds.length === 0) {
      return [];
    }

    // Build where clause
    const where: any = {
      classId: { in: classIds },
      isPublished: true, // Only published resources
    };

    if (filters?.resourceType) {
      where.type = filters.resourceType;
    }

    // Get resources
    const resources = await this.prisma.classResource.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return resources.map((r) => ({
      id: r.id,
      classId: r.classId,
      title: r.title || r.name,
      name: r.name,
      description: r.description,
      type: r.type,
      fileType: r.fileType,
      url: r.url,
      fileSize: r.fileSize,
      isPublished: r.isPublished,
      createdAt: r.createdAt.toISOString(),
      class: r.class,
    }));
  }

  /**
   * Get personal resources for current student
   */
  async getMyPersonalResources(
    user: UserWithContext,
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!student) {
      return [];
    }

    // Get personal resources
    const resources = await this.prisma.studentResource.findMany({
      where: {
        studentId: student.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      fileName: r.fileName,
      filePath: r.filePath,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      fileType: r.fileType,
      description: r.description,
      studentId: r.studentId,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Upload personal resource for current student
   */
  async uploadPersonalResource(
    user: UserWithContext,
    file: Express.Multer.File,
    description?: string,
  ): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 50MB');
    }

    // Validate file type - only documents and spreadsheets, no images
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed. Only documents and spreadsheets are permitted (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV). Images are not allowed.`);
    }

    // Determine file type
    const fileType = this.getFileType(file.mimetype);

    // Generate unique filename
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;

    // Get school ID for folder structure
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        isActive: true,
      },
      select: {
        schoolId: true,
      },
    });

    const schoolId = enrollment?.schoolId || 'unknown';
    
    // Upload to Cloudinary
    const folder = `schools/${schoolId}/students/${student.id}/resources`;
    const publicId = `resource-${uuidv4()}`;
    
    const { url: fileUrl } = await this.cloudinaryService.uploadRawFile(
      file,
      folder,
      publicId
    );

    // Create resource record
    const resource = await this.prisma.studentResource.create({
      data: {
        name: file.originalname,
        fileName: uniqueFileName,
        filePath: fileUrl, // Store Cloudinary URL in filePath for backward compatibility
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType: fileType,
        description: description || null,
        studentId: student.id,
        uploadedBy: user.id,
      },
    });

    return {
      id: resource.id,
      name: resource.name,
      fileName: resource.fileName,
      filePath: resource.filePath,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      fileType: resource.fileType,
      description: resource.description,
      studentId: resource.studentId,
      uploadedBy: resource.uploadedBy,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }

  /**
   * Delete personal resource for current student
   */
  async deletePersonalResource(
    user: UserWithContext,
    resourceId: string,
  ): Promise<void> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get resource and verify ownership
    const resource = await this.prisma.studentResource.findFirst({
      where: {
        id: resourceId,
        studentId: student.id,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found or access denied');
    }

    // Delete file from Cloudinary or local storage
    if (resource.filePath) {
      const isCloudinaryUrl = resource.filePath.startsWith('http://') || resource.filePath.startsWith('https://');
      
      if (isCloudinaryUrl) {
        // Delete from Cloudinary
        const publicId = this.cloudinaryService.extractPublicId(resource.filePath);
        if (publicId) {
          try {
            await this.cloudinaryService.deleteRawFile(publicId);
          } catch (error) {
            console.error('Error deleting file from Cloudinary:', error);
            // Continue with database deletion even if Cloudinary deletion fails
          }
        }
      } else {
        // Backward compatibility: Delete from local filesystem for old resources
        const fs = require('fs');
        if (fs.existsSync(resource.filePath)) {
          try {
            fs.unlinkSync(resource.filePath);
          } catch (error) {
            console.error('Error deleting file from local storage:', error);
            // Continue with database deletion even if file deletion fails
          }
        }
      }
    }

    // Delete resource record
    await this.prisma.studentResource.delete({
      where: {
        id: resourceId,
      },
    });
  }

  /**
   * Get file buffer for download
   */
  async getPersonalResourceFile(
    user: UserWithContext,
    resourceId: string,
  ): Promise<{ buffer: Buffer; resource: any }> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get resource and verify ownership
    const resource = await this.prisma.studentResource.findFirst({
      where: {
        id: resourceId,
        studentId: student.id,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found or access denied');
    }

    if (!resource.filePath) {
      throw new NotFoundException('File URL not found');
    }

    // Check if filePath is a Cloudinary URL (starts with http/https and contains cloudinary.com)
    const isCloudinaryUrl = resource.filePath.startsWith('http://') || resource.filePath.startsWith('https://');
    
    if (isCloudinaryUrl) {
      // Fetch file from Cloudinary URL
      try {
        const response = await fetch(resource.filePath);
        if (!response.ok) {
          throw new NotFoundException('File not found on Cloudinary');
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        return {
          buffer,
          resource: {
            id: resource.id,
            name: resource.name,
            fileName: resource.fileName,
            filePath: resource.filePath,
            fileSize: resource.fileSize,
            mimeType: resource.mimeType,
            fileType: resource.fileType,
            description: resource.description,
            studentId: resource.studentId,
            uploadedBy: resource.uploadedBy,
            createdAt: resource.createdAt.toISOString(),
            updatedAt: resource.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        console.error('Error fetching file from Cloudinary:', error);
        throw new NotFoundException('Failed to fetch file from Cloudinary');
      }
    } else {
      // Backward compatibility: Read from local filesystem for old resources
      const fs = require('fs');
      if (!fs.existsSync(resource.filePath)) {
        throw new NotFoundException('File not found on disk');
      }
      const buffer = fs.readFileSync(resource.filePath);
      
      return {
        buffer,
        resource: {
          id: resource.id,
          name: resource.name,
          fileName: resource.fileName,
          filePath: resource.filePath,
          fileSize: resource.fileSize,
          mimeType: resource.mimeType,
          fileType: resource.fileType,
          description: resource.description,
          studentId: resource.studentId,
          uploadedBy: resource.uploadedBy,
          createdAt: resource.createdAt.toISOString(),
          updatedAt: resource.updatedAt.toISOString(),
        },
      };
    }
  }

  /**
   * Determine file type from MIME type
   */
  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'IMAGE';
    } else if (mimeType === 'application/pdf') {
      return 'PDF';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
      return 'DOCX';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
      return 'XLSX';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || mimeType === 'application/vnd.ms-powerpoint') {
      return 'PPTX';
    } else {
      return 'OTHER';
    }
  }

  /**
   * Get calendar data for current student (events + timetable)
   */
  async getMyCalendar(
    user: UserWithContext,
    schoolId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 30); // Default to next 30 days

    // Get school to determine school type
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { hasPrimary: true, hasSecondary: true, hasTertiary: true },
    });

    let schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | undefined;
    if (school?.hasPrimary) schoolType = 'PRIMARY';
    else if (school?.hasSecondary) schoolType = 'SECONDARY';
    else if (school?.hasTertiary) schoolType = 'TERTIARY';

    // Get events
    const events = await this.eventService.getEvents(schoolId, start, end, schoolType);

    // Get timetable (for current term)
    const timetable = await this.getMyTimetable(user, schoolId);

    return {
      events,
      timetable,
    };
  }

  /**
   * Get complete transcript across all schools (via UID)
   */
  async getMyTranscript(
    user: UserWithContext,
    filters?: { startDate?: string; endDate?: string; schoolId?: string },
  ): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student by userId to get UID
    const student = await this.prisma.student.findFirst({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const uid = student.uid;

    // Get all enrollments across all schools using UID
    const allEnrollments = await this.prisma.enrollment.findMany({
      where: {
        student: { uid },
        ...(filters?.schoolId ? { schoolId: filters.schoolId } : {}),
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });

    // Get all published grades across all schools
    const enrollmentIds = allEnrollments.map((e) => e.id);
    const whereGrades: any = {
      enrollmentId: { in: enrollmentIds },
      isPublished: true,
    };

    if (filters?.startDate || filters?.endDate) {
      whereGrades.createdAt = {};
      if (filters.startDate) {
        whereGrades.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereGrades.createdAt.lte = new Date(filters.endDate);
      }
    }

    const allGrades = await this.prisma.grade.findMany({
      where: whereGrades,
      include: {
        enrollment: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { term: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Get all transfers
    const allTransfers = await this.prisma.transfer.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        fromSchool: {
          select: {
            id: true,
            name: true,
          },
        },
        toSchool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by school
    const schoolsMap = new Map();
    allEnrollments.forEach((enrollment) => {
      const schoolId = enrollment.schoolId;
      if (!schoolsMap.has(schoolId)) {
        schoolsMap.set(schoolId, {
          school: enrollment.school,
          enrollments: [],
          grades: [],
          attendance: [],
          startDate: enrollment.enrollmentDate,
          endDate: null,
        });
      }
      schoolsMap.get(schoolId).enrollments.push(enrollment);
      if (enrollment.enrollmentDate < schoolsMap.get(schoolId).startDate) {
        schoolsMap.get(schoolId).startDate = enrollment.enrollmentDate;
      }
    });

    // Add grades to schools
    allGrades.forEach((grade) => {
      const schoolId = grade.enrollment.schoolId;
      if (schoolsMap.has(schoolId)) {
        schoolsMap.get(schoolId).grades.push({
          id: grade.id,
          subject: grade.subject,
          assessmentName: grade.assessmentName,
          score: grade.score.toNumber(),
          maxScore: grade.maxScore.toNumber(),
          percentage: grade.score.toNumber() / grade.maxScore.toNumber() * 100,
          academicYear: grade.academicYear,
          term: grade.term,
          assessmentDate: grade.assessmentDate?.toISOString(),
          teacher: grade.teacher,
        });
      }
    });

    // Calculate overall GPA
    let totalScore = 0;
    let totalMaxScore = 0;
    allGrades.forEach((grade) => {
      totalScore += grade.score.toNumber();
      totalMaxScore += grade.maxScore.toNumber();
    });
    const overallGPA = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    // Build timeline
    const timeline: any[] = [];
    allEnrollments.forEach((enrollment) => {
      timeline.push({
        type: 'enrollment',
        date: enrollment.enrollmentDate,
        school: enrollment.school,
        details: {
          classLevel: enrollment.classLevel,
          academicYear: enrollment.academicYear,
        },
      });
    });
    allTransfers.forEach((transfer) => {
      timeline.push({
        type: 'transfer',
        date: transfer.createdAt,
        school: transfer.toSchool,
        details: {
          fromSchool: transfer.fromSchool,
          status: transfer.status,
        },
      });
    });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      student: {
        id: student.id,
        uid: student.uid,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        dateOfBirth: student.dateOfBirth.toISOString(),
      },
      schools: Array.from(schoolsMap.values()),
      overallGPA: Math.round(overallGPA * 100) / 100,
      totalCredits: allGrades.length,
      timeline,
    };
  }

  /**
   * Get all transfers for current student
   */
  async getMyTransfers(
    user: UserWithContext,
    filters?: { status?: string },
  ): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: { userId: user.id },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // Build where clause
    const where: any = {
      studentId: student.id,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    // Get transfers
    const transfers = await this.prisma.transfer.findMany({
      where,
      include: {
        fromSchool: {
          select: {
            id: true,
            name: true,
          },
        },
        toSchool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transfers.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      fromSchoolId: t.fromSchoolId,
      toSchoolId: t.toSchoolId,
      status: t.status,
      tac: t.tac,
      tacExpiresAt: t.tacExpiresAt?.toISOString(),
      tacUsedAt: t.tacUsedAt?.toISOString(),
      approvedAt: t.approvedAt?.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      rejectedAt: t.rejectedAt?.toISOString(),
      reason: t.reason,
      notes: t.notes,
      fromSchool: t.fromSchool,
      toSchool: t.toSchool,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Get student's current school (from active enrollment)
   */
  /**
   * Get enrolled classes for current student with full details
   */
  async getMyClasses(user: UserWithContext): Promise<any[]> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student with active enrollments
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
        enrollments: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        enrollments: {
          where: {
            isActive: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
              },
            },
            class: true,
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return [];
    }

    const classes: any[] = [];

    for (const enrollment of student.enrollments) {
      let classData = enrollment.class;

      // If no classId, try to find class by classLevel/name
      // Match by both name/classLevel AND academicYear to ensure we get the correct class
      if (!classData && enrollment.classLevel) {
        classData = await this.prisma.class.findFirst({
          where: {
            schoolId: enrollment.schoolId,
            isActive: true,
            academicYear: enrollment.academicYear, // Match academic year too
            OR: [
              { name: enrollment.classLevel },
              { classLevel: enrollment.classLevel },
            ],
          },
          orderBy: {
            createdAt: 'desc', // Get the most recently created if multiple matches
          },
        });
      }

      if (!classData) {
        // If still no class found, create a minimal class object from enrollment
        classes.push({
          id: enrollment.id,
          name: enrollment.classLevel,
          classLevel: enrollment.classLevel,
          type: null,
          academicYear: enrollment.academicYear,
          teachers: [],
          resources: [],
          studentsCount: 0,
          enrollment: {
            id: enrollment.id,
            enrollmentDate: enrollment.enrollmentDate.toISOString(),
          },
        });
        continue;
      }

      // Get full class details with teachers and resources
      const fullClass = await this.prisma.class.findUnique({
        where: { id: classData.id },
        include: {
          classTeachers: {
            include: {
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  subject: true,
                },
              },
            },
          },
          resources: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit to recent resources
          },
        },
      });

      if (fullClass) {
        classes.push({
          id: fullClass.id,
          name: fullClass.name,
          code: fullClass.code,
          classLevel: fullClass.classLevel,
          type: fullClass.type,
          academicYear: fullClass.academicYear,
          description: fullClass.description,
          teachers: fullClass.classTeachers.map((ct) => ({
            id: ct.teacher.id,
            firstName: ct.teacher.firstName,
            lastName: ct.teacher.lastName,
            email: ct.teacher.email,
            phone: ct.teacher.phone,
            subject: ct.subject || ct.teacher.subject,
            isPrimary: ct.isPrimary,
          })),
          resources: fullClass.resources.map((r) => ({
            id: r.id,
            name: r.name,
            fileName: r.fileName,
            fileType: r.fileType,
            mimeType: r.mimeType,
            description: r.description,
            createdAt: r.createdAt.toISOString(),
          })),
          enrollment: {
            id: enrollment.id,
            enrollmentDate: enrollment.enrollmentDate.toISOString(),
            school: enrollment.school,
            classArmId: enrollment.classArmId, // Include classArmId in enrollment for easier access
          },
          // Also include classArmId at top level for timetable queries
          classArmId: enrollment.classArmId,
        });
      }
    }

    return classes;
  }

  async getMySchool(user: UserWithContext): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student with active enrollment
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
        enrollments: {
          some: {
            isActive: true,
            ...(user.currentSchoolId ? { schoolId: user.currentSchoolId } : {}),
          },
        },
      },
      include: {
        enrollments: {
          where: {
            isActive: true,
          },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
                hasPrimary: true,
                hasSecondary: true,
                hasTertiary: true,
                schoolId: true,
              },
            },
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      throw new BadRequestException('You are not associated with any school');
    }

    const school = student.enrollments[0].school;

    // Compute school type info
    const availableTypes: string[] = [];
    if (school.hasPrimary) availableTypes.push('PRIMARY');
    if (school.hasSecondary) availableTypes.push('SECONDARY');
    if (school.hasTertiary) availableTypes.push('TERTIARY');

    const isMixed = availableTypes.length > 1;
    const primaryType = isMixed ? 'MIXED' : (availableTypes[0] || 'PRIMARY');

    return {
      ...school,
      schoolType: {
        hasPrimary: school.hasPrimary,
        hasSecondary: school.hasSecondary,
        hasTertiary: school.hasTertiary,
        isMixed,
        availableTypes,
        primaryType,
      },
    };
  }

  /**
   * Update student profile
   */
  async updateStudent(
    schoolId: string,
    studentId: string,
    updateData: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      phone?: string;
      bloodGroup?: string;
      allergies?: string;
      medications?: string;
      emergencyContact?: string;
      emergencyContactPhone?: string;
      medicalNotes?: string;
    }
  ): Promise<StudentWithEnrollmentDto> {
    // Verify student exists in this school
    const existingStudent = await this.findOne(schoolId, studentId);

    // Build update data
    const studentUpdateData: any = {};
    if (updateData.firstName !== undefined) studentUpdateData.firstName = updateData.firstName;
    if (updateData.middleName !== undefined) studentUpdateData.middleName = updateData.middleName || null;
    if (updateData.lastName !== undefined) studentUpdateData.lastName = updateData.lastName;

    // Build health info object
    const healthInfo: any = {};
    if (updateData.bloodGroup !== undefined) healthInfo.bloodGroup = updateData.bloodGroup || null;
    if (updateData.allergies !== undefined) healthInfo.allergies = updateData.allergies || null;
    if (updateData.medications !== undefined) healthInfo.medications = updateData.medications || null;
    if (updateData.emergencyContact !== undefined) healthInfo.emergencyContact = updateData.emergencyContact || null;
    if (updateData.emergencyContactPhone !== undefined) healthInfo.emergencyContactPhone = updateData.emergencyContactPhone || null;
    if (updateData.medicalNotes !== undefined) healthInfo.medicalNotes = updateData.medicalNotes || null;

    // Only update healthInfo if at least one health field is provided
    if (Object.keys(healthInfo).length > 0) {
      // Get existing healthInfo and merge
      const existingHealthInfo = existingStudent.healthInfo || {};
      studentUpdateData.healthInfo = { ...existingHealthInfo, ...healthInfo };
    }

    // Update user phone if provided
    if (updateData.phone !== undefined) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });

      if (student?.userId) {
        await this.prisma.user.update({
          where: { id: student.userId },
          data: { phone: updateData.phone || null },
        });
      }
    }

    // Update student
    const updatedStudent = await this.prisma.student.update({
      where: { id: studentId },
      data: studentUpdateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        enrollments: {
          where: {
            schoolId: schoolId,
            isActive: true,
          },
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
          take: 1,
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });

    return {
      ...this.toDto(updatedStudent),
      enrollment: updatedStudent.enrollments[0]
        ? {
            id: updatedStudent.enrollments[0].id,
            classLevel: updatedStudent.enrollments[0].classLevel,
            academicYear: updatedStudent.enrollments[0].academicYear,
            enrollmentDate: updatedStudent.enrollments[0].enrollmentDate.toISOString(),
            school: updatedStudent.enrollments[0].school,
          }
        : undefined,
    };
  }

  /**
   * Upload student profile image
   */
  async uploadProfileImage(
    user: UserWithContext,
    file: Express.Multer.File
  ): Promise<any> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Access denied. Student role required.');
    }

    // Get student
    const student = await this.prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 5MB');
    }

    // Get school ID from user context or from student's active enrollment
    let schoolId = user.currentSchoolId;
    if (!schoolId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: student.id,
          isActive: true,
        },
        select: {
          schoolId: true,
        },
        orderBy: {
          enrollmentDate: 'desc',
        },
      });
      if (enrollment) {
        schoolId = enrollment.schoolId;
      }
    }

    if (!schoolId) {
      throw new BadRequestException('Student is not enrolled in any school');
    }

    // Delete old image if exists
    if (student.profileImage) {
      const oldPublicId = this.cloudinaryService.extractPublicId(student.profileImage);
      if (oldPublicId) {
        try {
          await this.cloudinaryService.deleteImage(oldPublicId);
        } catch (error) {
          console.error('Error deleting old profile image:', error);
          // Continue even if deletion fails
        }
      }
    }

    // Upload to Cloudinary
    const { url } = await this.cloudinaryService.uploadImage(
      file,
      `schools/${schoolId}/students`,
      `student-${student.id}`
    );

    // Update student with new image URL
    const updatedStudent = await this.prisma.student.update({
      where: { id: student.id },
      data: { profileImage: url },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
      },
    });

    return this.toDto(updatedStudent);
  }
}

