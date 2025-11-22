import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StudentDto, StudentWithEnrollmentDto } from './dto/student.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto
  ): Promise<PaginatedResponseDto<StudentDto>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          enrollments: {
            some: {
              schoolId: tenantId,
              isActive: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({
        where: {
          enrollments: {
            some: {
              schoolId: tenantId,
              isActive: true,
            },
          },
        },
      }),
    ]);

    return new PaginatedResponseDto(
      students.map(this.toDto),
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

  private toDto(student: any): StudentDto {
    return {
      id: student.id,
      uid: student.uid,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
      profileLocked: student.profileLocked,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }
}

