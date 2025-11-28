import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SchoolRepository } from '../schools/domain/repositories/school.repository';
import { StaffRepository } from '../schools/domain/repositories/staff.repository';
import { UserWithContext } from '../auth/types/user-with-context.type';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository,
    private readonly staffRepository: StaffRepository
  ) {}

  /**
   * Create a new grade
   */
  async createGrade(schoolId: string, dto: CreateGradeDto, user: UserWithContext): Promise<any> {
    const teacherId = user.currentProfileId;
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile not found');
    }

    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate teacher exists and belongs to school
    // Note: currentProfileId contains teacherId (unique string), not the database id
    const teacher = await this.staffRepository.findTeacherByTeacherId(teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new ForbiddenException('Teacher not found in this school');
    }

    // Validate enrollment exists and belongs to school
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        student: true,
        school: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.schoolId !== school.id) {
      throw new ForbiddenException('Enrollment does not belong to this school');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('Cannot add grade to inactive enrollment');
    }

    // Validate score
    if (dto.score < 0 || dto.score > dto.maxScore) {
      throw new BadRequestException(`Score must be between 0 and ${dto.maxScore}`);
    }

    // Validate assessment date is not in the future
    let assessmentDate: Date | null = null;
    if (dto.assessmentDate) {
      assessmentDate = new Date(dto.assessmentDate);
      if (assessmentDate > new Date()) {
        throw new BadRequestException('Assessment date cannot be in the future');
      }
    }

    // For secondary schools, validate teacher is assigned to class/subject
    if (dto.subject) {
      const classAssignment = await this.prisma.classTeacher.findFirst({
        where: {
          teacherId: teacherId,
          class: {
            id: enrollment.classId || undefined,
            schoolId: school.id,
          },
          subject: dto.subject,
        },
      });

      if (!classAssignment) {
        // Check if teacher is primary teacher (for primary schools)
        const isPrimaryTeacher = await this.prisma.classTeacher.findFirst({
          where: {
            teacherId: teacherId,
            class: {
              id: enrollment.classId || undefined,
              schoolId: school.id,
            },
            isPrimary: true,
          },
        });

        if (!isPrimaryTeacher) {
          throw new ForbiddenException('You are not assigned to teach this subject in this class');
        }
      }
    }

    // Get term info if termId provided
    let termName = dto.term;
    let academicYear = dto.academicYear || enrollment.academicYear;
    
    if (dto.termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: dto.termId },
        include: { academicSession: true },
      });
      
      if (term) {
        termName = term.name;
        academicYear = term.academicSession?.academicYear || academicYear;
      }
    }

    // Create grade
    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        teacherId: teacherId,
        subject: dto.subject || '',
        gradeType: dto.gradeType,
        assessmentName: dto.assessmentName || null,
        assessmentDate: assessmentDate,
        sequence: dto.sequence || null,
        score: dto.score,
        maxScore: dto.maxScore,
        term: termName,
        academicYear: academicYear,
        termId: dto.termId || null,
        remarks: dto.remarks || null,
        isPublished: dto.isPublished || false,
        signedAt: new Date(),
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                  },
                },
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
    });

    return {
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      teacherId: grade.teacherId,
      subject: grade.subject,
      gradeType: grade.gradeType,
      assessmentName: grade.assessmentName,
      assessmentDate: grade.assessmentDate,
      sequence: grade.sequence,
      score: grade.score.toNumber(),
      maxScore: grade.maxScore.toNumber(),
      term: grade.term,
      academicYear: grade.academicYear,
      remarks: grade.remarks,
      isPublished: grade.isPublished,
      signedAt: grade.signedAt,
      createdAt: grade.createdAt,
      student: {
        id: grade.enrollment.student.id,
        firstName: grade.enrollment.student.firstName,
        lastName: grade.enrollment.student.lastName,
        uid: grade.enrollment.student.uid,
      },
      teacher: grade.teacher,
    };
  }

  /**
   * Update a grade
   */
  async updateGrade(schoolId: string, gradeId: string, dto: UpdateGradeDto, user: UserWithContext): Promise<any> {
    const teacherId = user.currentProfileId;
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile not found');
    }

    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get grade
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            school: true,
          },
        },
        teacher: true,
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.enrollment.schoolId !== school.id) {
      throw new ForbiddenException('Grade does not belong to this school');
    }

    // Only the teacher who created the grade can update it
    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException('You can only update grades you created');
    }

    // Validate score if provided
    const newScore = dto.score !== undefined ? dto.score : grade.score.toNumber();
    const newMaxScore = dto.maxScore !== undefined ? dto.maxScore : grade.maxScore.toNumber();

    if (newScore < 0 || newScore > newMaxScore) {
      throw new BadRequestException(`Score must be between 0 and ${newMaxScore}`);
    }

    // Validate assessment date if provided
    let assessmentDate: Date | null = undefined;
    if (dto.assessmentDate !== undefined) {
      if (dto.assessmentDate) {
        assessmentDate = new Date(dto.assessmentDate);
        if (assessmentDate > new Date()) {
          throw new BadRequestException('Assessment date cannot be in the future');
        }
      } else {
        assessmentDate = null;
      }
    }

    // Update grade
    const updatedGrade = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        ...(dto.score !== undefined && { score: dto.score }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.assessmentName !== undefined && { assessmentName: dto.assessmentName }),
        ...(assessmentDate !== undefined && { assessmentDate }),
        ...(dto.sequence !== undefined && { sequence: dto.sequence }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                  },
                },
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
    });

    return {
      id: updatedGrade.id,
      enrollmentId: updatedGrade.enrollmentId,
      teacherId: updatedGrade.teacherId,
      subject: updatedGrade.subject,
      gradeType: updatedGrade.gradeType,
      assessmentName: updatedGrade.assessmentName,
      assessmentDate: updatedGrade.assessmentDate,
      sequence: updatedGrade.sequence,
      score: updatedGrade.score.toNumber(),
      maxScore: updatedGrade.maxScore.toNumber(),
      term: updatedGrade.term,
      academicYear: updatedGrade.academicYear,
      remarks: updatedGrade.remarks,
      isPublished: updatedGrade.isPublished,
      signedAt: updatedGrade.signedAt,
      createdAt: updatedGrade.createdAt,
      student: {
        id: updatedGrade.enrollment.student.id,
        firstName: updatedGrade.enrollment.student.firstName,
        lastName: updatedGrade.enrollment.student.lastName,
        uid: updatedGrade.enrollment.student.uid,
      },
      teacher: updatedGrade.teacher,
    };
  }

  /**
   * Delete a grade
   */
  async deleteGrade(schoolId: string, gradeId: string, user: UserWithContext): Promise<void> {
    const teacherId = user.currentProfileId;
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile not found');
    }

    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get grade
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        enrollment: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.enrollment.schoolId !== school.id) {
      throw new ForbiddenException('Grade does not belong to this school');
    }

    // Only the teacher who created the grade can delete it
    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException('You can only delete grades you created');
    }

    await this.prisma.grade.delete({
      where: { id: gradeId },
    });
  }

  /**
   * Get grades for a class
   */
  async getClassGrades(
    schoolId: string,
    classId: string,
    subject?: string,
    termId?: string,
    gradeType?: string,
    user?: UserWithContext
  ): Promise<any[]> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate class exists
    const classData = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Get enrollments for this class
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
      select: { id: true },
    });

    const enrollmentIds = enrollments.map((e) => e.id);

    // Build where clause for grades
    const where: any = {
      enrollmentId: { in: enrollmentIds },
    };

    // Filter by subject if provided
    if (subject) {
      where.subject = subject;
    }

    // Filter by term if provided
    if (termId) {
      where.termId = termId;
    }

    // Filter by grade type if provided
    if (gradeType) {
      where.gradeType = gradeType;
    }

    // If teacher context provided, filter by teacher's subjects
    if (user?.currentProfileId) {
      // Note: currentProfileId contains teacherId (unique string), not the database id
      const teacherIdString = user.currentProfileId;
      const teacher = await this.staffRepository.findTeacherByTeacherId(teacherIdString);
      
      if (teacher) {
        // Get teacher's assigned subjects for this class
        // Use teacher.id (database ID) for ClassTeacher.teacherId
        const assignments = await this.prisma.classTeacher.findMany({
          where: {
            teacherId: teacher.id,
            classId: classId,
          },
        });

        if (assignments.length > 0) {
          // If teacher has specific subject assignments, only show those subjects
          const assignedSubjects = assignments.map((a) => a.subject).filter(Boolean);
          if (assignedSubjects.length > 0 && !subject) {
            where.subject = { in: assignedSubjects };
          }
        }
        
        // Also filter by teacherId to only show grades entered by this teacher
        // Use teacher.id (database ID) for Grade.teacherId
        where.teacherId = teacher.id;
      }
    }

    // Get grades
    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                  },
                },
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
      gradeType: grade.gradeType,
      assessmentName: grade.assessmentName,
      assessmentDate: grade.assessmentDate,
      sequence: grade.sequence,
      score: grade.score.toNumber(),
      maxScore: grade.maxScore.toNumber(),
      term: grade.term,
      academicYear: grade.academicYear,
      remarks: grade.remarks,
      isPublished: grade.isPublished,
      signedAt: grade.signedAt,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt,
      student: {
        id: grade.enrollment.student.id,
        firstName: grade.enrollment.student.firstName,
        lastName: grade.enrollment.student.lastName,
        uid: grade.enrollment.student.uid,
        publicId: grade.enrollment.student.publicId,
      },
      teacher: grade.teacher,
    }));
  }

  /**
   * Get grades for a student
   */
  async getStudentGrades(
    schoolId: string,
    studentId: string,
    subject?: string,
    user?: UserWithContext
  ): Promise<any[]> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: {
            schoolId: school.id,
            isActive: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.enrollments.length === 0) {
      throw new BadRequestException('Student is not enrolled in this school');
    }

    const enrollmentIds = student.enrollments.map((e) => e.id);

    // Build where clause
    const where: any = {
      enrollmentId: { in: enrollmentIds },
    };

    if (subject) {
      where.subject = subject;
    }

    // If teacher context provided, filter by teacher's subjects
    if (user?.currentProfileId) {
      // Note: currentProfileId contains teacherId (unique string), not the database id
      const teacherIdString = user.currentProfileId;
      const teacher = await this.staffRepository.findTeacherByTeacherId(teacherIdString);
      
      if (teacher) {
        // Use teacher.id (database ID) for Grade.teacherId
        where.teacherId = teacher.id;
        
        if (!subject) {
          // Get teacher's subjects from their class assignments
          // Use teacher.id (database ID) for ClassTeacher.teacherId
          const assignments = await this.prisma.classTeacher.findMany({
            where: {
              teacherId: teacher.id,
              class: {
                schoolId: school.id,
              },
            },
            select: { subject: true },
          });

          const assignedSubjects = assignments.map((a) => a.subject).filter(Boolean);
          if (assignedSubjects.length > 0) {
            where.subject = { in: assignedSubjects };
          }
        }
      }
    }

    // Get grades
    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
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
      gradeType: grade.gradeType,
      assessmentName: grade.assessmentName,
      assessmentDate: grade.assessmentDate,
      sequence: grade.sequence,
      score: grade.score.toNumber(),
      maxScore: grade.maxScore.toNumber(),
      term: grade.term,
      academicYear: grade.academicYear,
      remarks: grade.remarks,
      isPublished: grade.isPublished,
      signedAt: grade.signedAt,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt,
      percentage: grade.maxScore.toNumber() > 0 
        ? (grade.score.toNumber() / grade.maxScore.toNumber()) * 100 
        : 0,
      enrollment: {
        id: grade.enrollment.id,
        classLevel: grade.enrollment.classLevel,
        academicYear: grade.enrollment.academicYear,
      },
      student: {
        id: grade.enrollment.student.id,
        firstName: grade.enrollment.student.firstName,
        lastName: grade.enrollment.student.lastName,
        uid: grade.enrollment.student.uid,
        publicId: grade.enrollment.student.publicId,
      },
      teacher: grade.teacher,
    }));
  }

  /**
   * Bulk create grades for a class
   */
  async bulkCreateGrades(schoolId: string, dto: any, user: UserWithContext): Promise<any[]> {
    const teacherId = user.currentProfileId;
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile not found');
    }

    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate teacher exists and belongs to school
    // Note: currentProfileId contains teacherId (unique string), not the database id
    const teacher = await this.staffRepository.findTeacherByTeacherId(teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new ForbiddenException('Teacher not found in this school');
    }

    // Validate class exists
    const classData = await this.prisma.class.findFirst({
      where: {
        id: dto.classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Validate teacher is assigned to this class/subject
    // Note: Use teacher.id (database ID) for ClassTeacher queries
    if (dto.subject) {
      const assignment = await this.prisma.classTeacher.findFirst({
        where: {
          classId: dto.classId,
          teacherId: teacher.id,
          subject: dto.subject,
        },
      });

      if (!assignment) {
        // Check if teacher is primary teacher (for primary schools)
        const isPrimaryTeacher = await this.prisma.classTeacher.findFirst({
          where: {
            classId: dto.classId,
            teacherId: teacher.id,
            isPrimary: true,
          },
        });

        if (!isPrimaryTeacher) {
          throw new ForbiddenException('You are not assigned to teach this subject in this class');
        }
      }
    } else {
      // For primary schools, check if teacher is assigned
      const assignment = await this.prisma.classTeacher.findFirst({
        where: {
          classId: dto.classId,
          teacherId: teacher.id,
        },
      });

      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this class');
      }
    }

    // Get term info if termId provided
    let termName = '';
    let academicYear = classData.academicYear;
    
    if (dto.termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: dto.termId },
        include: { academicSession: true },
      });
      
      if (term) {
        termName = term.name;
        academicYear = term.academicSession?.academicYear || academicYear;
      }
    }

    // Validate assessment date
    let assessmentDate: Date | null = null;
    if (dto.assessmentDate) {
      assessmentDate = new Date(dto.assessmentDate);
      if (assessmentDate > new Date()) {
        throw new BadRequestException('Assessment date cannot be in the future');
      }
    }

    // Validate all enrollments exist and belong to school
    const enrollmentIds = dto.grades.map((g: any) => g.enrollmentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        id: { in: enrollmentIds },
        schoolId: school.id,
        isActive: true,
      },
    });

    if (enrollments.length !== enrollmentIds.length) {
      throw new BadRequestException('Some enrollments are invalid or inactive');
    }

    // Validate all scores
    for (const gradeEntry of dto.grades) {
      if (gradeEntry.score < 0 || gradeEntry.score > dto.maxScore) {
        throw new BadRequestException(`Score must be between 0 and ${dto.maxScore} for enrollment ${gradeEntry.enrollmentId}`);
      }
    }

    // Create grades in bulk
    // Note: Use teacher.id (database ID) for Grade.teacherId
    const grades = await Promise.all(
      dto.grades.map((gradeEntry: any) =>
        this.prisma.grade.create({
          data: {
            enrollmentId: gradeEntry.enrollmentId,
            teacherId: teacher.id,
            subject: dto.subject || '',
            gradeType: dto.gradeType,
            assessmentName: dto.assessmentName,
            assessmentDate: assessmentDate,
            sequence: dto.sequence || null,
            score: gradeEntry.score,
            maxScore: dto.maxScore,
            term: termName,
            academicYear: dto.academicYear || academicYear,
            termId: dto.termId || null,
            remarks: gradeEntry.remarks || null,
            isPublished: false,
            signedAt: new Date(),
          },
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        phone: true,
                      },
                    },
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
        })
      )
    );

    return grades.map((grade) => ({
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      teacherId: grade.teacherId,
      subject: grade.subject,
      gradeType: grade.gradeType,
      assessmentName: grade.assessmentName,
      assessmentDate: grade.assessmentDate,
      sequence: grade.sequence,
      score: grade.score.toNumber(),
      maxScore: grade.maxScore.toNumber(),
      term: grade.term,
      academicYear: grade.academicYear,
      remarks: grade.remarks,
      isPublished: grade.isPublished,
      signedAt: grade.signedAt,
      createdAt: grade.createdAt,
      student: {
        id: grade.enrollment.student.id,
        firstName: grade.enrollment.student.firstName,
        lastName: grade.enrollment.student.lastName,
        uid: grade.enrollment.student.uid,
      },
      teacher: grade.teacher,
    }));
  }
}

