import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SchoolRepository } from '../schools/domain/repositories/school.repository';
import {
  ClassLevelDto,
  ClassArmDto,
  RoomDto,
  SubjectDto,
  CreateClassArmDto,
  CreateRoomDto,
  CreateSubjectDto,
} from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository
  ) {}

  // Access Prisma models using bracket notation for reserved keywords
  private get classLevelModel() {
    return (this.prisma as any)['classLevel'];
  }

  private get classArmModel() {
    return (this.prisma as any)['classArm'];
  }

  private get roomModel() {
    return (this.prisma as any)['room'];
  }

  private get subjectModel() {
    return (this.prisma as any)['subject'];
  }

  // ClassLevels
  async getClassLevels(
    schoolId: string,
    schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): Promise<ClassLevelDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const where: any = {
      schoolId: school.id,
      isActive: true,
    };

    if (schoolType) {
      where.type = schoolType;
    }

    const classLevels = await this.classLevelModel.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { level: 'asc' },
      ],
    });

    return classLevels.map((cl: any) => ({
      id: cl.id,
      name: cl.name,
      code: cl.code,
      level: cl.level,
      type: cl.type,
      schoolId: cl.schoolId,
      isActive: cl.isActive,
      nextLevelId: cl.nextLevelId,
    }));
  }

  // ClassArms
  async getClassArms(
    schoolId: string,
    classLevelId?: string,
    schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): Promise<ClassArmDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const where: any = {
      classLevel: {
        schoolId: school.id,
      },
      isActive: true,
    };

    if (classLevelId) {
      where.classLevelId = classLevelId;
    }

    if (schoolType) {
      where.classLevel = {
        ...where.classLevel,
        type: schoolType,
      };
    }

    const classArms = await this.classArmModel.findMany({
      where,
      include: {
        classLevel: true,
      },
      orderBy: [
        { classLevel: { level: 'asc' } },
        { name: 'asc' },
      ],
    });

    return classArms.map((ca: any) => ({
      id: ca.id,
      name: ca.name,
      capacity: ca.capacity,
      classLevelId: ca.classLevelId,
      classLevelName: ca.classLevel.name,
      isActive: ca.isActive,
    }));
  }

  async createClassArm(schoolId: string, dto: CreateClassArmDto): Promise<ClassArmDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Verify class level belongs to school
    const classLevel = await this.classLevelModel.findUnique({
      where: { id: dto.classLevelId },
    });

    if (!classLevel || classLevel.schoolId !== school.id) {
      throw new NotFoundException('Class level not found');
    }

    // Check if class arm already exists
    const existing = await this.classArmModel.findFirst({
      where: {
        classLevelId: dto.classLevelId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Class arm "${dto.name}" already exists for this class level`);
    }

    const classArm = await this.classArmModel.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        classLevelId: dto.classLevelId,
        isActive: true,
      },
      include: {
        classLevel: true,
      },
    });

    return {
      id: classArm.id,
      name: classArm.name,
      capacity: classArm.capacity,
      classLevelId: classArm.classLevelId,
      classLevelName: classArm.classLevel.name,
      isActive: classArm.isActive,
    };
  }

  // Rooms
  async getRooms(schoolId: string): Promise<RoomDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const rooms = await this.roomModel.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return rooms.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      capacity: r.capacity,
      roomType: r.roomType,
      schoolId: r.schoolId,
      isActive: r.isActive,
    }));
  }

  async createRoom(schoolId: string, dto: CreateRoomDto): Promise<RoomDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Check if room code already exists
    if (dto.code) {
      const existing = await this.roomModel.findFirst({
        where: {
          schoolId: school.id,
          code: dto.code,
        },
      });

      if (existing) {
        throw new BadRequestException(`Room with code "${dto.code}" already exists`);
      }
    }

    const room = await this.roomModel.create({
      data: {
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity,
        roomType: dto.roomType,
        schoolId: school.id,
        isActive: true,
      },
    });

    return {
      id: room.id,
      name: room.name,
      code: room.code,
      capacity: room.capacity,
      roomType: room.roomType,
      schoolId: room.schoolId,
      isActive: room.isActive,
    };
  }

  // Subjects
  async getSubjects(schoolId: string): Promise<SubjectDto[]> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const subjects = await this.subjectModel.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      schoolId: s.schoolId,
      isActive: s.isActive,
    }));
  }

  async createSubject(schoolId: string, dto: CreateSubjectDto): Promise<SubjectDto> {
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Check if subject code already exists
    if (dto.code) {
      const existing = await this.subjectModel.findFirst({
        where: {
          schoolId: school.id,
          code: dto.code,
        },
      });

      if (existing) {
        throw new BadRequestException(`Subject with code "${dto.code}" already exists`);
      }
    }

    const subject = await this.subjectModel.create({
      data: {
        name: dto.name,
        code: dto.code,
        schoolId: school.id,
        isActive: true,
      },
    });

    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      schoolId: subject.schoolId,
      isActive: subject.isActive,
    };
  }
}

