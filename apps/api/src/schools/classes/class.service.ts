import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../email/email.service';
import { SchoolRepository } from '../domain/repositories/school.repository';
import { StaffRepository } from '../domain/repositories/staff.repository';
import { CreateClassDto, ClassType } from '../dto/create-class.dto';
import { AssignTeacherToClassDto } from '../dto/assign-teacher-to-class.dto';
import { ClassDto } from '../dto/class.dto';

/**
 * Service for managing classes/courses and teacher assignments
 */
@Injectable()
export class ClassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository,
    private readonly staffRepository: StaffRepository,
    private readonly emailService: EmailService
  ) {}

  // Access Prisma models using bracket notation for reserved keywords
  private get classModel() {
    return (this.prisma as any)['class'];
  }

  private get classTeacherModel() {
    return (this.prisma as any)['classTeacher'];
  }

  /**
   * Create a new class/course
   */
  async createClass(schoolId: string, classData: CreateClassDto): Promise<ClassDto> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate school type matches class type
    this.validateSchoolTypeForClass(school, classData.type);

    // Create class
    const newClass = await this.classModel.create({
      data: {
        name: classData.name,
        code: classData.code || null,
        classLevel: classData.classLevel || null,
        type: classData.type,
        academicYear: classData.academicYear,
        creditHours: classData.creditHours || null,
        description: classData.description || null,
        schoolId: school.id,
      },
      include: {
        classTeachers: {
          include: {
            teacher: true,
          },
        },
      },
    });

    return this.mapToClassDto(newClass);
  }

  /**
   * Get current academic year (e.g., "2024/2025")
   */
  private getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    // Academic year typically starts in September (month 8)
    // If we're before September, use previous year as start
    if (month < 8) {
      return `${currentYear - 1}/${currentYear}`;
    } else {
      return `${currentYear}/${currentYear + 1}`;
    }
  }

  /**
   * Initialize default classes for a school based on school type
   * @param typeFilter - Optional filter to only initialize classes for a specific type
   */
  private async initializeDefaultClasses(
    school: any,
    academicYear: string,
    typeFilter?: ClassType
  ): Promise<void> {
    const defaultClasses: Array<{ name: string; classLevel: string; type: ClassType }> = [];

    // Primary classes - only if typeFilter is PRIMARY or undefined
    if (school.hasPrimary && (!typeFilter || typeFilter === ClassType.PRIMARY)) {
      for (let i = 1; i <= 6; i++) {
        defaultClasses.push({
          name: `Class ${i}`,
          classLevel: `Class ${i}`,
          type: ClassType.PRIMARY,
        });
      }
    }

    // Secondary classes - only if typeFilter is SECONDARY or undefined
    if (school.hasSecondary && (!typeFilter || typeFilter === ClassType.SECONDARY)) {
      // JSS classes
      for (let i = 1; i <= 3; i++) {
        defaultClasses.push({
          name: `JSS${i}`,
          classLevel: `JSS${i}`,
          type: ClassType.SECONDARY,
        });
      }
      // SS classes
      for (let i = 1; i <= 3; i++) {
        defaultClasses.push({
          name: `SS${i}`,
          classLevel: `SS${i}`,
          type: ClassType.SECONDARY,
        });
      }
    }

    // Check which classes already exist
    const existingClasses = await this.classModel.findMany({
      where: {
        schoolId: school.id,
        academicYear: academicYear,
      },
      select: {
        name: true,
        type: true,
      },
    });

    const existingClassKeys = new Set(
      existingClasses.map((c: any) => `${c.type}-${c.name}`)
    );

    // Create missing default classes
    const classesToCreate = defaultClasses.filter(
      (cls) => !existingClassKeys.has(`${cls.type}-${cls.name}`)
    );

    if (classesToCreate.length > 0) {
      await this.classModel.createMany({
        data: classesToCreate.map((cls) => ({
          name: cls.name,
          classLevel: cls.classLevel,
          type: cls.type,
          academicYear: academicYear,
          schoolId: school.id,
          isActive: true,
        })),
      });
    }
  }

  /**
   * Get classes assigned to a teacher
   */
  async getTeacherClasses(schoolId: string, teacherId: string): Promise<ClassDto[]> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate teacher exists in school
    const teacher = await this.staffRepository.findTeacherById(teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new NotFoundException('Teacher not found in this school');
    }

    // Get all class assignments for this teacher
    // Filter by active classes in the same school
    const assignments = await this.classTeacherModel.findMany({
      where: {
        teacherId: teacherId, // This should be Teacher.id (database ID)
        class: {
          schoolId: school.id,
          isActive: true, // Only get active classes
        },
      },
      include: {
        class: {
          include: {
            classTeachers: {
              include: {
                teacher: true,
              },
            },
          },
        },
      },
    });

    // Get unique classes and map to DTOs
    const classMap = new Map<string, any>();
    assignments.forEach((assignment: any) => {
      const classData = assignment.class;
      if (!classMap.has(classData.id)) {
        classMap.set(classData.id, classData);
      }
    });

    // Count students for each class
    const classes = Array.from(classMap.values());
    const classesWithCounts = await Promise.all(
      classes.map(async (classData) => {
        const studentsCount = await this.prisma.enrollment.count({
          where: {
            schoolId: school.id,
            OR: [
              { classId: classData.id },
              {
                AND: [
                  { classLevel: classData.classLevel },
                  { academicYear: classData.academicYear },
                ],
              },
            ],
          },
        });

        return this.mapToClassDto(classData, studentsCount);
      })
    );

    return classesWithCounts;
  }

  /**
   * Get all classes for a school
   * @param typeFilter - Optional filter to only get classes of a specific type (PRIMARY, SECONDARY, TERTIARY)
   */
  async getClasses(
    schoolId: string,
    academicYear?: string,
    typeFilter?: ClassType
  ): Promise<ClassDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Use provided academic year or default to current
    const targetAcademicYear = academicYear || this.getCurrentAcademicYear();

    // Initialize default classes if they don't exist (only for the filtered type if provided)
    await this.initializeDefaultClasses(school, targetAcademicYear, typeFilter);

    const where: any = {
      schoolId: school.id,
      academicYear: targetAcademicYear,
    };

    // Filter by type if provided
    if (typeFilter) {
      where.type = typeFilter;
    }

    const classes = await this.classModel.findMany({
      where,
      include: {
        classTeachers: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get student counts for all classes
    const classesWithCounts = await Promise.all(
      classes.map(async (cls: any) => {
        // Count enrollments that match by classId OR by classLevel and academicYear
        const studentsCount = await this.prisma.enrollment.count({
          where: {
            schoolId: school.id,
            isActive: true,
            academicYear: targetAcademicYear,
            OR: [
              { classId: cls.id },
              {
                AND: [
                  { classId: null },
                  { classLevel: cls.classLevel },
                ],
              },
            ],
          },
        });

        return {
          ...cls,
          studentsCount,
        };
      })
    );

    return classesWithCounts.map((cls: any) => this.mapToClassDto(cls));
  }

  /**
   * Get a single class by ID
   */
  async getClassById(schoolId: string, classId: string): Promise<ClassDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
      include: {
        classTeachers: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Count enrollments that match by classId OR by classLevel and academicYear
    const studentsCount = await this.prisma.enrollment.count({
      where: {
        schoolId: school.id,
        isActive: true,
        academicYear: classData.academicYear,
        OR: [
          { classId: classData.id },
          {
            AND: [
              { classId: null },
              { classLevel: classData.classLevel },
            ],
          },
        ],
      },
    });

    return this.mapToClassDto({
      ...classData,
      studentsCount,
    });
  }

  /**
   * Assign a teacher to a class
   */
  async assignTeacherToClass(
    schoolId: string,
    classId: string,
    assignmentData: AssignTeacherToClassDto
  ): Promise<ClassDto> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists
    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
      include: {
        classTeachers: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Validate teacher exists in school
    const teacher = await this.staffRepository.findTeacherById(assignmentData.teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new NotFoundException('Teacher not found in this school');
    }

    // Validate based on school type
    await this.validateTeacherAssignment(classData, teacher.id, assignmentData);

    // Check if assignment already exists
    const existingAssignment = await this.classTeacherModel.findFirst({
      where: {
        classId: classId,
        teacherId: assignmentData.teacherId,
        subject: assignmentData.subject || null,
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Teacher is already assigned to this class with this subject');
    }

    // For primary schools, if this is the primary teacher, unset other primary teachers
    if (classData.type === ClassType.PRIMARY && assignmentData.isPrimary) {
      await this.classTeacherModel.updateMany({
        where: {
          classId: classId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Create assignment
    await this.classTeacherModel.create({
      data: {
        classId: classId,
        teacherId: assignmentData.teacherId,
        subject: assignmentData.subject || null,
        isPrimary: assignmentData.isPrimary || false,
      },
    });

    // Send email to teacher if email exists
    const teacherEmail = (teacher as any).user?.email || teacher.email;
    if (teacherEmail && school) {
      try {
        await this.emailService.sendTeacherClassAssignmentEmail(
          teacherEmail,
          `${teacher.firstName} ${teacher.lastName}`,
          classData.name,
          classData.classLevel,
          assignmentData.subject || null,
          assignmentData.isPrimary || false,
          school.name,
          classData.academicYear
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send teacher class assignment email:', error);
      }
    } else if (!teacherEmail) {
      console.warn(`Teacher ${teacher.id} does not have an email address. Cannot send class assignment notification.`);
    }

    // Return updated class
    return this.getClassById(schoolId, classId);
  }

  /**
   * Remove a teacher from a class
   */
  async removeTeacherFromClass(
    schoolId: string,
    classId: string,
    teacherId: string,
    subject?: string
  ): Promise<void> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists
    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Find and delete assignment
    const where: any = {
      classId: classId,
      teacherId: teacherId,
    };

    if (subject) {
      where.subject = subject;
    }

    const assignment = await this.classTeacherModel.findFirst({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher assignment not found');
    }

    // Get teacher email before deleting
    const teacherEmail = assignment.teacher?.user?.email || assignment.teacher?.email;

    await this.classTeacherModel.delete({
      where: {
        id: assignment.id,
      },
    });

    // Send email to teacher if email exists
    if (teacherEmail && school && assignment.teacher) {
      try {
        await this.emailService.sendTeacherClassRemovalEmail(
          teacherEmail,
          `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
          classData.name,
          classData.classLevel,
          assignment.subject || null,
          school.name
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send teacher class removal email:', error);
      }
    }
  }

  /**
   * Update a class
   */
  async updateClass(
    schoolId: string,
    classId: string,
    updateData: Partial<CreateClassDto>
  ): Promise<ClassDto> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists
    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Validate school type if type is being updated
    if (updateData.type) {
      this.validateSchoolTypeForClass(school, updateData.type);
    }

    // Update class
    const updated = await this.classModel.update({
      where: {
        id: classId,
      },
      data: {
        name: updateData.name,
        code: updateData.code,
        classLevel: updateData.classLevel,
        type: updateData.type,
        academicYear: updateData.academicYear,
        creditHours: updateData.creditHours,
        description: updateData.description,
      },
      include: {
        classTeachers: {
          include: {
            teacher: true,
          },
        },
        enrollments: {
          where: {
            isActive: true,
          },
        },
      },
    });

    return this.mapToClassDto(updated);
  }

  /**
   * Delete a class
   */
  async deleteClass(schoolId: string, classId: string): Promise<void> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists
    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Delete class (cascade will handle related records)
    await this.classModel.delete({
      where: {
        id: classId,
      },
    });
  }

  /**
   * Validate school type matches class type
   */
  private validateSchoolTypeForClass(school: any, classType: ClassType): void {
    if (classType === ClassType.PRIMARY && !school.hasPrimary) {
      throw new BadRequestException('School does not have primary level');
    }
    if (classType === ClassType.SECONDARY && !school.hasSecondary) {
      throw new BadRequestException('School does not have secondary level');
    }
    if (classType === ClassType.TERTIARY && !school.hasTertiary) {
      throw new BadRequestException('School does not have tertiary level');
    }
  }

  /**
   * Get students enrolled in a class
   */
  async getClassStudents(schoolId: string, classId: string): Promise<any[]> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists
    const classData = await this.classModel.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Get enrollments for this class
    // Students can be linked via classId OR by classLevel and academicYear
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
        academicYear: classData.academicYear,
        OR: [
          { classId: classId },
          {
            AND: [
              { classLevel: classData.classLevel },
              { classId: null },
            ],
          },
        ],
      },
      include: {
        student: {
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
        },
      },
      orderBy: {
        student: {
          lastName: 'asc',
        },
      },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      uid: enrollment.student.uid,
      publicId: enrollment.student.publicId,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      middleName: enrollment.student.middleName,
      dateOfBirth: enrollment.student.dateOfBirth,
      email: enrollment.student.user?.email || null,
      phone: enrollment.student.user?.phone || null,
      enrollment: {
        id: enrollment.id,
        classLevel: enrollment.classLevel,
        academicYear: enrollment.academicYear,
        enrollmentDate: enrollment.enrollmentDate,
      },
      user: enrollment.student.user,
    }));
  }

  /**
   * Validate teacher assignment based on school type
   */
  private async validateTeacherAssignment(
    classData: any,
    teacherId: string,
    assignmentData: AssignTeacherToClassDto
  ): Promise<void> {
    // For primary schools: only one teacher allowed per class, and teacher can only be assigned to one class
    if (classData.type === ClassType.PRIMARY) {
      // Check if this teacher is already assigned to another PRIMARY class
      const teacherOtherAssignments = await this.classTeacherModel.findMany({
        where: {
          teacherId: teacherId,
        },
        include: {
          class: true,
        },
      });

      // Filter to only PRIMARY school classes
      const primaryClassAssignments = teacherOtherAssignments.filter(
        (assignment: any) => assignment.class.type === ClassType.PRIMARY && assignment.class.id !== classData.id
      );

      if (primaryClassAssignments.length > 0) {
        const otherClass = primaryClassAssignments[0].class;
        throw new ConflictException(
          `This teacher is already assigned to ${otherClass.name}. Please remove them from that class before assigning to this class.`
        );
      }

      // Check if this class already has a teacher
      const existingTeachers = await this.classTeacherModel.findMany({
        where: {
          classId: classData.id,
        },
      });

      // If there's already a primary teacher and we're not setting this one as primary, reject
      const hasPrimaryTeacher = existingTeachers.some((t: any) => t.isPrimary);
      if (hasPrimaryTeacher && !assignmentData.isPrimary) {
        throw new BadRequestException(
          'Primary schools can only have one teacher per class. Set isPrimary to true to replace the current teacher.'
        );
      }

      // If subject is provided, it should be "Class Teacher" or similar
      if (assignmentData.subject && !assignmentData.subject.toLowerCase().includes('class teacher')) {
        // Allow it but warn - we'll accept it
      }
    }

    // For secondary schools: 
    // - Form teachers (isPrimary: true) don't need a subject
    // - Subject teachers (isPrimary: false/undefined) require a subject
    if (classData.type === ClassType.SECONDARY) {
      // If this is a form teacher assignment (isPrimary: true), subject is optional
      if (assignmentData.isPrimary) {
        // Form teacher - no subject required
        // Check if there's already a form teacher for this class
        const existingFormTeacher = await this.classTeacherModel.findFirst({
          where: {
            classId: classData.id,
            isPrimary: true,
          },
        });

        if (existingFormTeacher && existingFormTeacher.teacherId !== teacherId) {
          throw new ConflictException(
            'Another teacher is already assigned as the form teacher for this class'
          );
        }
      } else {
        // Subject teacher - subject is required
        if (!assignmentData.subject) {
          throw new BadRequestException('Subject is required for subject teacher assignments in secondary schools');
        }

        // Check if another teacher is already assigned to this subject
        const existingSubjectTeacher = await this.classTeacherModel.findFirst({
          where: {
            classId: classData.id,
            subject: assignmentData.subject,
          },
        });

        if (existingSubjectTeacher && existingSubjectTeacher.teacherId !== teacherId) {
          throw new ConflictException(
            `Another teacher is already assigned to teach ${assignmentData.subject} in this class`
          );
        }
      }
    }

    // For tertiary schools: subject is optional but recommended (can represent course module/topic)
    if (classData.type === ClassType.TERTIARY) {
      // Multiple teachers can teach the same course, each handling different modules/topics
      // No strict validation needed
    }
  }

  /**
   * Map Prisma class to DTO
   */
  private mapToClassDto(classData: any): ClassDto {
    return {
      id: classData.id,
      name: classData.name,
      code: classData.code,
      classLevel: classData.classLevel,
      type: classData.type as ClassType,
      academicYear: classData.academicYear,
      creditHours: classData.creditHours,
      description: classData.description,
      isActive: classData.isActive,
      createdAt: classData.createdAt,
      teachers: classData.classTeachers.map((ct: any) => ({
        id: ct.id,
        teacherId: ct.teacher.id,
        firstName: ct.teacher.firstName,
        lastName: ct.teacher.lastName,
        email: ct.teacher.email,
        subject: ct.subject,
        isPrimary: ct.isPrimary,
        createdAt: ct.createdAt,
      })),
      studentsCount: classData.studentsCount ?? 0,
    };
  }
}

