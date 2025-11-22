import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SchoolRepository } from '../schools/domain/repositories/school.repository';
import { CreateTimetablePeriodDto, CreateMasterScheduleDto } from './dto/create-timetable-period.dto';
import { TimetablePeriodDto, ConflictInfo } from './dto/timetable.dto';
import { DayOfWeek, PeriodType } from '@prisma/client';

/**
 * Service for managing timetables with conflict detection
 */
@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository
  ) {}

  // Access Prisma models using bracket notation for reserved keywords
  private get timetablePeriodModel() {
    return (this.prisma as any)['timetablePeriod'];
  }

  /**
   * Create a timetable period with conflict detection
   */
  async createPeriod(
    schoolId: string,
    dto: CreateTimetablePeriodDto
  ): Promise<TimetablePeriodDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate term exists and belongs to school
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      include: { academicSession: true },
    });

    if (!term || term.academicSession.schoolId !== school.id) {
      throw new NotFoundException('Term not found');
    }

    // Validate class arm exists
    const classArm = await this.prisma.classArm.findUnique({
      where: { id: dto.classArmId },
      include: { classLevel: true },
    });

    if (!classArm || classArm.classLevel.schoolId !== school.id) {
      throw new NotFoundException('Class arm not found');
    }

    // Check for conflicts
    const conflict = await this.detectConflicts(dto, school.id);
    if (conflict) {
      throw new ConflictException(conflict.message);
    }

    // Validate time format
    this.validateTimeFormat(dto.startTime);
    this.validateTimeFormat(dto.endTime);

    // Validate time range
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Create period
    const period = await this.timetablePeriodModel.create({
      data: {
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: dto.type || PeriodType.LESSON,
        subjectId: dto.subjectId || null,
        teacherId: dto.teacherId || null,
        roomId: dto.roomId || null,
        classArmId: dto.classArmId,
        termId: dto.termId,
      },
      include: {
        subject: true,
        teacher: true,
        room: true,
        classArm: {
          include: {
            classLevel: true,
          },
        },
      },
    });

    return this.mapToPeriodDto(period);
  }

  /**
   * Create master schedule (empty slots for all class arms)
   */
  async createMasterSchedule(
    schoolId: string,
    dto: CreateMasterScheduleDto
  ): Promise<{ created: number; skipped: number }> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate term
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      include: { academicSession: true },
    });

    if (!term || term.academicSession.schoolId !== school.id) {
      throw new NotFoundException('Term not found');
    }

    // Get all active class arms for the school
    const classArms = await this.prisma.classArm.findMany({
      where: {
        classLevel: {
          schoolId: school.id,
        },
        isActive: true,
      },
    });

    let created = 0;
    let skipped = 0;

    // Create periods for each class arm
    for (const classArm of classArms) {
      for (const periodDef of dto.periods) {
        // Check if period already exists
        const existing = await this.timetablePeriodModel.findFirst({
          where: {
            termId: dto.termId,
            classArmId: classArm.id,
            dayOfWeek: periodDef.dayOfWeek,
            startTime: periodDef.startTime,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.timetablePeriodModel.create({
          data: {
            dayOfWeek: periodDef.dayOfWeek,
            startTime: periodDef.startTime,
            endTime: periodDef.endTime,
            type: periodDef.type || PeriodType.LESSON,
            classArmId: classArm.id,
            termId: dto.termId,
          },
        });

        created++;
      }
    }

    return { created, skipped };
  }

  /**
   * Get timetable for a class arm
   */
  async getTimetableForClassArm(
    schoolId: string,
    classArmId: string,
    termId: string
  ): Promise<TimetablePeriodDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const periods = await this.timetablePeriodModel.findMany({
      where: {
        classArmId: classArmId,
        termId: termId,
      },
      include: {
        subject: true,
        teacher: true,
        room: true,
        classArm: {
          include: {
            classLevel: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return periods.map((p: any) => this.mapToPeriodDto(p));
  }

  /**
   * Update a timetable period
   */
  async updatePeriod(
    schoolId: string,
    periodId: string,
    dto: Partial<CreateTimetablePeriodDto>
  ): Promise<TimetablePeriodDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const period = await this.timetablePeriodModel.findUnique({
      where: { id: periodId },
      include: {
        term: {
          include: {
            academicSession: true,
          },
        },
      },
    });

    if (!period || period.term.academicSession.schoolId !== school.id) {
      throw new NotFoundException('Timetable period not found');
    }

    // Check for conflicts if teacher or room is being updated
    if (dto.teacherId || dto.roomId) {
      const conflict = await this.detectConflicts(
        {
          ...period,
          ...dto,
          dayOfWeek: dto.dayOfWeek || period.dayOfWeek,
          startTime: dto.startTime || period.startTime,
          endTime: dto.endTime || period.endTime,
          classArmId: dto.classArmId || period.classArmId,
          termId: dto.termId || period.termId,
        } as CreateTimetablePeriodDto,
        school.id,
        periodId
      );

      if (conflict) {
        throw new ConflictException(conflict.message);
      }
    }

    const updated = await this.timetablePeriodModel.update({
      where: { id: periodId },
      data: {
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: dto.type,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        roomId: dto.roomId,
      },
      include: {
        subject: true,
        teacher: true,
        room: true,
        classArm: {
          include: {
            classLevel: true,
          },
        },
      },
    });

    return this.mapToPeriodDto(updated);
  }

  /**
   * Delete a timetable period
   */
  async deletePeriod(schoolId: string, periodId: string): Promise<void> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const period = await this.timetablePeriodModel.findUnique({
      where: { id: periodId },
      include: {
        term: {
          include: {
            academicSession: true,
          },
        },
      },
    });

    if (!period || period.term.academicSession.schoolId !== school.id) {
      throw new NotFoundException('Timetable period not found');
    }

    await this.timetablePeriodModel.delete({
      where: { id: periodId },
    });
  }

  /**
   * Detect conflicts for teacher and room
   * Time overlap: periods overlap if startTime < other.endTime AND endTime > other.startTime
   * Since times are in HH:mm format, string comparison works for lexicographic ordering
   */
  private async detectConflicts(
    dto: CreateTimetablePeriodDto,
    schoolId: string,
    excludePeriodId?: string
  ): Promise<ConflictInfo | null> {
    // Only check conflicts for LESSON periods with teacher/room assigned
    if (dto.type !== PeriodType.LESSON || (!dto.teacherId && !dto.roomId)) {
      return null;
    }

    // Get all periods for the same day and term
    const allPeriods = await this.timetablePeriodModel.findMany({
      where: {
        termId: dto.termId,
        dayOfWeek: dto.dayOfWeek,
        type: PeriodType.LESSON,
        ...(excludePeriodId && { id: { not: excludePeriodId } }),
      },
      include: {
        classArm: {
          include: {
            classLevel: true,
          },
        },
        teacher: true,
        room: true,
      },
    });

    // Filter for overlapping time periods
    const overlappingPeriods = allPeriods.filter((period: any) => {
      // Periods overlap if: startTime < dto.endTime AND endTime > dto.startTime
      return period.startTime < dto.endTime && period.endTime > dto.startTime;
    });

    // Check teacher conflict
    if (dto.teacherId) {
      const teacherConflict = overlappingPeriods.find(
        (p: any) => p.teacherId === dto.teacherId
      );

      if (teacherConflict) {
        const teacherName = teacherConflict.teacher
          ? `${teacherConflict.teacher.firstName} ${teacherConflict.teacher.lastName}`
          : 'Unknown';
        const classArmName = teacherConflict.classArm
          ? `${teacherConflict.classArm.classLevel.name} ${teacherConflict.classArm.name}`
          : 'Unknown';

        return {
          type: 'TEACHER',
          message: `${teacherName} is already teaching ${classArmName} at ${teacherConflict.startTime} on ${dto.dayOfWeek}`,
          conflictingPeriodId: teacherConflict.id,
        };
      }
    }

    // Check room conflict
    if (dto.roomId) {
      const roomConflict = overlappingPeriods.find(
        (p: any) => p.roomId === dto.roomId
      );

      if (roomConflict) {
        const roomName = roomConflict.room?.name || 'Unknown';
        const classArmName = roomConflict.classArm
          ? `${roomConflict.classArm.classLevel.name} ${roomConflict.classArm.name}`
          : 'Unknown';

        return {
          type: 'ROOM',
          message: `${roomName} is already occupied by ${classArmName} at ${roomConflict.startTime} on ${dto.dayOfWeek}`,
          conflictingPeriodId: roomConflict.id,
        };
      }
    }

    return null;
  }

  /**
   * Validate time format (HH:mm)
   */
  private validateTimeFormat(time: string): void {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new BadRequestException(`Invalid time format: ${time}. Expected HH:mm format (e.g., "08:00")`);
    }
  }

  /**
   * Map Prisma period to DTO
   */
  private mapToPeriodDto(period: any): TimetablePeriodDto {
    return {
      id: period.id,
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      type: period.type,
      subjectId: period.subjectId,
      subjectName: period.subject?.name,
      teacherId: period.teacherId,
      teacherName: period.teacher
        ? `${period.teacher.firstName} ${period.teacher.lastName}`
        : undefined,
      roomId: period.roomId,
      roomName: period.room?.name,
      classArmId: period.classArmId,
      classArmName: period.classArm
        ? `${period.classArm.classLevel.name} ${period.classArm.name}`
        : '',
      termId: period.termId,
      createdAt: period.createdAt,
    };
  }
}

