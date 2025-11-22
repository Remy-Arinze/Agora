import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SchoolRepository } from '../schools/domain/repositories/school.repository';
import { InitializeSessionDto, CreateTermDto, MigrateStudentsDto, SessionType } from './dto/initialize-session.dto';
import { AcademicSessionDto, TermDto, ActiveSessionDto } from './dto/session.dto';
import { SessionStatus, TermStatus } from '@prisma/client';

/**
 * Service for managing academic sessions and terms
 * Handles the "Start Term" wizard and student migration logic
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository
  ) {}

  /**
   * Initialize a new academic session
   */
  async initializeSession(schoolId: string, dto: InitializeSessionDto): Promise<AcademicSessionDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if session name already exists
    const existingSession = await this.prisma.academicSession.findFirst({
      where: {
        schoolId: school.id,
        name: dto.name,
      },
    });

    if (existingSession) {
      throw new ConflictException(`Session ${dto.name} already exists`);
    }

    // Create session
    const session = await this.prisma.academicSession.create({
      data: {
        name: dto.name,
        startDate: startDate,
        endDate: endDate,
        status: SessionStatus.DRAFT,
        schoolId: school.id,
      },
      include: {
        terms: true,
      },
    });

    return this.mapToSessionDto(session);
  }

  /**
   * Create a term for an academic session
   */
  async createTerm(schoolId: string, sessionId: string, dto: CreateTermDto): Promise<TermDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const session = await this.prisma.academicSession.findFirst({
      where: {
        id: sessionId,
        schoolId: school.id,
      },
    });

    if (!session) {
      throw new NotFoundException('Academic session not found');
    }

    const termNumber = parseInt(dto.number);
    if (termNumber < 1 || termNumber > 3) {
      throw new BadRequestException('Term number must be between 1 and 3');
    }

    // Check if term number already exists
    const existingTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: sessionId,
        number: termNumber,
      },
    });

    if (existingTerm) {
      throw new ConflictException(`Term ${termNumber} already exists for this session`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates are within session dates
    if (startDate < session.startDate || endDate > session.endDate) {
      throw new BadRequestException('Term dates must be within session dates');
    }

    const term = await this.prisma.term.create({
      data: {
        name: dto.name,
        number: termNumber,
        startDate: startDate,
        endDate: endDate,
        halfTermStart: dto.halfTermStart ? new Date(dto.halfTermStart) : null,
        halfTermEnd: dto.halfTermEnd ? new Date(dto.halfTermEnd) : null,
        status: TermStatus.DRAFT,
        academicSessionId: sessionId,
      },
    });

    return this.mapToTermDto(term);
  }

  /**
   * Get active session and term for a school
   */
  async getActiveSession(schoolId: string): Promise<ActiveSessionDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Find active session
    const session = await this.prisma.academicSession.findFirst({
      where: {
        schoolId: school.id,
        status: SessionStatus.ACTIVE,
      },
      include: {
        terms: {
          where: {
            status: TermStatus.ACTIVE,
          },
          orderBy: {
            number: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!session) {
      return { session: undefined, term: undefined };
    }

    return {
      session: this.mapToSessionDto(session),
      term: session.terms.length > 0 ? this.mapToTermDto(session.terms[0]) : undefined,
    };
  }

  /**
   * Start a new term (the core "Start Term" wizard logic)
   */
  async startNewTerm(schoolId: string, dto: InitializeSessionDto & { termId?: string }): Promise<{
    session: AcademicSessionDto;
    term: TermDto;
    migratedCount: number;
  }> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    let session: any;
    let term: any;

    if (dto.type === SessionType.NEW_SESSION) {
      // Create new session
      session = await this.prisma.academicSession.create({
        data: {
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: SessionStatus.ACTIVE,
          schoolId: school.id,
        },
      });

      // Deactivate previous session
      await this.prisma.academicSession.updateMany({
        where: {
          schoolId: school.id,
          status: SessionStatus.ACTIVE,
          id: { not: session.id },
        },
        data: {
          status: SessionStatus.COMPLETED,
        },
      });

      // Create first term (approximately 3 months from start)
      const termStartDate = new Date(dto.startDate);
      const termEndDate = new Date(termStartDate);
      termEndDate.setMonth(termEndDate.getMonth() + 3);

      term = await this.prisma.term.create({
        data: {
          name: '1st Term',
          number: 1,
          startDate: termStartDate,
          endDate: termEndDate,
          status: TermStatus.ACTIVE,
          academicSessionId: session.id,
        },
      });

      // Deactivate previous terms
      await this.prisma.term.updateMany({
        where: {
          academicSession: {
            schoolId: school.id,
          },
          status: TermStatus.ACTIVE,
          id: { not: term.id },
        },
        data: {
          status: TermStatus.COMPLETED,
        },
      });

      // Trigger promotion logic
      const migratedCount = await this.promoteStudents(school.id, term.id);
      return {
        session: this.mapToSessionDto(session),
        term: this.mapToTermDto(term),
        migratedCount,
      };
    } else {
      // NEW_TERM - Create new term in existing session
      if (!dto.termId) {
        throw new BadRequestException('termId is required for NEW_TERM type');
      }

      const existingTerm = await this.prisma.term.findUnique({
        where: { id: dto.termId },
        include: { academicSession: true },
      });

      if (!existingTerm || existingTerm.academicSession.schoolId !== school.id) {
        throw new NotFoundException('Term not found');
      }

      // Find previous active term
      const previousTerm = await this.prisma.term.findFirst({
        where: {
          academicSessionId: existingTerm.academicSessionId,
          status: TermStatus.ACTIVE,
          id: { not: dto.termId },
        },
        orderBy: {
          number: 'desc',
        },
      });

      // Activate the new term
      term = await this.prisma.term.update({
        where: { id: dto.termId },
        data: {
          status: TermStatus.ACTIVE,
        },
      });

      // Deactivate previous term
      if (previousTerm) {
        await this.prisma.term.update({
          where: { id: previousTerm.id },
          data: {
            status: TermStatus.COMPLETED,
          },
        });
      }

      session = await this.prisma.academicSession.findUnique({
        where: { id: existingTerm.academicSessionId },
      });

      // Trigger carry over logic
      const migratedCount = await this.carryOverStudents(school.id, term.id, previousTerm?.id);
      return {
        session: this.mapToSessionDto(session),
        term: this.mapToTermDto(term),
        migratedCount,
      };
    }
  }

  /**
   * Migrate students (promote or carry over)
   */
  async migrateStudents(schoolId: string, dto: MigrateStudentsDto): Promise<{ migratedCount: number }> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      include: { academicSession: true },
    });

    if (!term || term.academicSession.schoolId !== school.id) {
      throw new NotFoundException('Term not found');
    }

    if (dto.carryOver) {
      // Find previous term
      const previousTerm = await this.prisma.term.findFirst({
        where: {
          academicSessionId: term.academicSessionId,
          number: { lt: term.number },
        },
        orderBy: {
          number: 'desc',
        },
      });

      if (!previousTerm) {
        throw new BadRequestException('No previous term found for carry over');
      }

      const migratedCount = await this.carryOverStudents(school.id, term.id, previousTerm.id);
      return { migratedCount };
    } else {
      const migratedCount = await this.promoteStudents(school.id, term.id);
      return { migratedCount };
    }
  }

  /**
   * Promotion Logic: Move students from currentLevel to nextLevel
   * JSS1 -> JSS2, SS3 -> ALUMNI
   */
  private async promoteStudents(schoolId: string, termId: string): Promise<number> {
    // Get all active enrollments from previous term
    const previousTerm = await this.prisma.term.findFirst({
      where: {
        academicSession: {
          schoolId: schoolId,
        },
        id: { not: termId },
      },
      orderBy: {
        number: 'desc',
      },
    });

    if (!previousTerm) {
      return 0; // No previous term to promote from
    }

    const previousEnrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: schoolId,
        termId: previousTerm.id,
        isActive: true,
      },
      include: {
        classArm: {
          include: {
            classLevel: true,
          },
        },
      },
    });

    let promotedCount = 0;

    for (const enrollment of previousEnrollments) {
      if (!enrollment.classArm) continue;

      const currentLevel = enrollment.classArm.classLevel;
      const nextLevel = await this.prisma.classLevel.findUnique({
        where: { id: currentLevel.nextLevelId || '' },
      });

      if (!nextLevel) {
        // SS3 -> ALUMNI (or highest level)
        // Mark enrollment as completed, don't create new enrollment
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { isActive: false },
        });
        promotedCount++;
        continue;
      }

      // Find or create class arm for next level
      // For now, use the first active class arm of the next level
      const nextClassArm = await this.prisma.classArm.findFirst({
        where: {
          classLevelId: nextLevel.id,
          isActive: true,
        },
      });

      if (!nextClassArm) {
        continue; // Skip if no class arm available
      }

      // Create new enrollment in next level
      await this.prisma.enrollment.create({
        data: {
          studentId: enrollment.studentId,
          schoolId: schoolId,
          classArmId: nextClassArm.id,
          termId: termId,
          classLevel: nextLevel.name,
          academicYear: enrollment.academicYear, // Keep same academic year for now
          isActive: true,
          debtBalance: 0, // Reset debt for new term
        },
      });

      // Deactivate old enrollment
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { isActive: false },
      });

      promotedCount++;
    }

    return promotedCount;
  }

  /**
   * Carry Over Logic: Clone all active Enrollments from previous term
   * Keep students in the exact same ClassArm
   */
  private async carryOverStudents(
    schoolId: string,
    termId: string,
    previousTermId?: string
  ): Promise<number> {
    if (!previousTermId) {
      return 0;
    }

    const previousEnrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: schoolId,
        termId: previousTermId,
        isActive: true,
      },
    });

    let carriedOverCount = 0;

    for (const enrollment of previousEnrollments) {
      // Check if enrollment already exists for this term
      const existing = await this.prisma.enrollment.findFirst({
        where: {
          studentId: enrollment.studentId,
          schoolId: schoolId,
          termId: termId,
        },
      });

      if (existing) {
        continue; // Already migrated
      }

      // Clone enrollment to new term
      await this.prisma.enrollment.create({
        data: {
          studentId: enrollment.studentId,
          schoolId: schoolId,
          classId: enrollment.classId,
          classArmId: enrollment.classArmId, // Keep same class arm
          termId: termId,
          classLevel: enrollment.classLevel,
          academicYear: enrollment.academicYear,
          isActive: true,
          debtBalance: enrollment.debtBalance, // Carry over debt
        },
      });

      carriedOverCount++;
    }

    return carriedOverCount;
  }

  /**
   * Get all sessions for a school
   */
  async getSessions(schoolId: string): Promise<AcademicSessionDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const sessions = await this.prisma.academicSession.findMany({
      where: {
        schoolId: school.id,
      },
      include: {
        terms: {
          orderBy: {
            number: 'asc',
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return sessions.map((s) => this.mapToSessionDto(s));
  }

  private mapToSessionDto(session: any): AcademicSessionDto {
    return {
      id: session.id,
      name: session.name,
      startDate: session.startDate,
      endDate: session.endDate,
      status: session.status,
      schoolId: session.schoolId,
      terms: session.terms ? session.terms.map((t: any) => this.mapToTermDto(t)) : [],
      createdAt: session.createdAt,
    };
  }

  private mapToTermDto(term: any): TermDto {
    return {
      id: term.id,
      name: term.name,
      number: term.number,
      startDate: term.startDate,
      endDate: term.endDate,
      halfTermStart: term.halfTermStart,
      halfTermEnd: term.halfTermEnd,
      status: term.status,
      academicSessionId: term.academicSessionId,
      createdAt: term.createdAt,
    };
  }
}

