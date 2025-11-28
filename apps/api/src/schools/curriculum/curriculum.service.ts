import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SchoolRepository } from '../domain/repositories/school.repository';
import { StaffRepository } from '../domain/repositories/staff.repository';
import { CreateCurriculumDto, CreateCurriculumItemDto } from './dto/create-curriculum.dto';
import { CurriculumDto, CurriculumItemDto } from './dto/curriculum.dto';
import { UserWithContext } from '../../auth/types/user-with-context.type';

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository,
    private readonly staffRepository: StaffRepository
  ) {}

  private get curriculumModel() {
    return (this.prisma as any)['curriculum'];
  }

  private get curriculumItemModel() {
    return (this.prisma as any)['curriculumItem'];
  }

  private get classModel() {
    return (this.prisma as any)['class'];
  }

  private get classTeacherModel() {
    return (this.prisma as any)['classTeacher'];
  }

  /**
   * Create a new curriculum
   */
  async createCurriculum(
    schoolId: string,
    createDto: CreateCurriculumDto,
    user: UserWithContext
  ): Promise<CurriculumDto> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate class exists and belongs to school
    const classData = await this.classModel.findFirst({
      where: {
        id: createDto.classId,
        schoolId: school.id,
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    // Get teacher ID from JWT context
    // Note: currentProfileId contains teacherId (unique string), not the database id
    const teacherIdString = user.currentProfileId;
    if (!teacherIdString) {
      throw new ForbiddenException('Teacher ID not found in context');
    }

    // Find teacher by unique teacherId string to get database id
    const teacher = await this.staffRepository.findTeacherByTeacherId(teacherIdString);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new ForbiddenException('Teacher not found in this school');
    }

    // Verify teacher is assigned to this class using database id
    const assignment = await this.classTeacherModel.findFirst({
      where: {
        classId: createDto.classId,
        teacherId: teacher.id, // Use database id, not the unique teacherId string
        ...(createDto.subject && { subject: createDto.subject }),
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Teacher is not assigned to this class/subject');
    }

    // Check if curriculum already exists
    const existing = await this.curriculumModel.findFirst({
      where: {
        classId: createDto.classId,
        teacherId: teacher.id, // Use database id for foreign key constraint
        academicYear: createDto.academicYear,
        subject: createDto.subject || null,
        termId: createDto.termId || null,
      },
    });

    if (existing) {
      throw new BadRequestException('Curriculum already exists for this class/subject/academic year/term combination');
    }

    // Create curriculum with items
    const curriculum = await this.curriculumModel.create({
      data: {
        classId: createDto.classId,
        subject: createDto.subject || null,
        teacherId: teacher.id, // Use database id for foreign key constraint
        academicYear: createDto.academicYear,
        termId: createDto.termId || null,
        items: {
          create: createDto.items.map((item, index) => ({
            week: item.week,
            topic: item.topic,
            objectives: item.objectives,
            resources: item.resources,
            order: item.order ?? index,
          })),
        },
      },
      include: {
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return this.mapToDto(curriculum);
  }

  /**
   * Get curriculum for a class
   */
  async getCurriculumForClass(
    schoolId: string,
    classId: string,
    subject?: string,
    academicYear?: string,
    termId?: string,
    user?: UserWithContext
  ): Promise<CurriculumDto | null> {
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

    // Build where clause
    const where: any = {
      classId: classId,
      isActive: true,
    };

    if (subject) {
      where.subject = subject;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    if (termId) {
      where.termId = termId;
    }

    // If user is a teacher, only show their own curriculum
    if (user?.currentProfileId && user.role === 'TEACHER') {
      // Find teacher by unique teacherId string to get database id
      const teacher = await this.staffRepository.findTeacherByTeacherId(user.currentProfileId);
      if (teacher) {
        where.teacherId = teacher.id; // Use database id for query
      } else {
        // If teacher not found, return null (no curriculum)
        return null;
      }
    }

    const curriculum = await this.curriculumModel.findFirst({
      where,
      include: {
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!curriculum) {
      return null;
    }

    return this.mapToDto(curriculum);
  }

  /**
   * Update curriculum
   */
  async updateCurriculum(
    schoolId: string,
    curriculumId: string,
    updateData: Partial<CreateCurriculumDto>,
    user: UserWithContext
  ): Promise<CurriculumDto> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Get curriculum
    const curriculum = await this.curriculumModel.findFirst({
      where: {
        id: curriculumId,
        class: {
          schoolId: school.id,
        },
      },
      include: {
        items: true,
      },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    // Verify ownership
    // Note: currentProfileId contains teacherId (unique string), but curriculum.teacherId is database id
    const teacherIdString = user.currentProfileId;
    if (!teacherIdString) {
      throw new ForbiddenException('Teacher ID not found in context');
    }
    
    // Find teacher by unique teacherId string to get database id
    const teacher = await this.staffRepository.findTeacherByTeacherId(teacherIdString);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new ForbiddenException('Teacher not found in this school');
    }
    
    if (curriculum.teacherId !== teacher.id) {
      throw new ForbiddenException('You can only update your own curriculum');
    }

    // Update curriculum
    const updated = await this.curriculumModel.update({
      where: { id: curriculumId },
      data: {
        ...(updateData.academicYear && { academicYear: updateData.academicYear }),
        ...(updateData.termId !== undefined && { termId: updateData.termId || null }),
        ...(updateData.items && {
          items: {
            deleteMany: {},
            create: updateData.items.map((item, index) => ({
              week: item.week,
              topic: item.topic,
              objectives: item.objectives,
              resources: item.resources,
              order: item.order ?? index,
            })),
          },
        }),
      },
      include: {
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Delete curriculum
   */
  async deleteCurriculum(
    schoolId: string,
    curriculumId: string,
    user: UserWithContext
  ): Promise<void> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Get curriculum
    const curriculum = await this.curriculumModel.findFirst({
      where: {
        id: curriculumId,
        class: {
          schoolId: school.id,
        },
      },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    // Verify ownership
    // Note: currentProfileId contains teacherId (unique string), but curriculum.teacherId is database id
    const teacherIdString = user.currentProfileId;
    if (!teacherIdString) {
      throw new ForbiddenException('Teacher ID not found in context');
    }
    
    // Find teacher by unique teacherId string to get database id
    const teacher = await this.staffRepository.findTeacherByTeacherId(teacherIdString);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new ForbiddenException('Teacher not found in this school');
    }
    
    if (curriculum.teacherId !== teacher.id) {
      throw new ForbiddenException('You can only delete your own curriculum');
    }

    // Delete curriculum (items will be cascade deleted)
    await this.curriculumModel.delete({
      where: { id: curriculumId },
    });
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(curriculum: any): CurriculumDto {
    return {
      id: curriculum.id,
      classId: curriculum.classId,
      subject: curriculum.subject,
      teacherId: curriculum.teacherId,
      academicYear: curriculum.academicYear,
      termId: curriculum.termId,
      isActive: curriculum.isActive,
      createdAt: curriculum.createdAt,
      updatedAt: curriculum.updatedAt,
      items: curriculum.items?.map((item: any) => ({
        id: item.id,
        curriculumId: item.curriculumId,
        week: item.week,
        topic: item.topic,
        objectives: item.objectives,
        resources: item.resources,
        order: item.order,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) || [],
    };
  }
}

