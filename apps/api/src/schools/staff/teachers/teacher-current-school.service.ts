import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserWithContext } from '../../../auth/types/user-with-context.type';

/**
 * Service for teacher operations scoped to their current/active school
 * All operations here are filtered by the teacher's school
 */
@Injectable()
export class TeacherCurrentSchoolService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current teacher profile
   */
  async getMyProfile(user: UserWithContext) {
    const schoolId = user.currentSchoolId;
    const teacherIdFromJwt = user.currentProfileId; // This is the teacherId field (unique ID), not the database id

    if (!schoolId || !teacherIdFromJwt) {
      throw new BadRequestException('Teacher profile not found in current context');
    }

    // Find teacher by teacherId field (unique ID), not by database id
    const teacher = await this.prisma.teacher.findUnique({
      where: { teacherId: teacherIdFromJwt },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
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
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    if (teacher.schoolId !== schoolId) {
      throw new BadRequestException('Teacher does not belong to current school');
    }

    return {
      id: teacher.id,
      teacherId: teacher.teacherId,
      publicId: teacher.publicId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      subject: teacher.subject,
      isTemporary: teacher.isTemporary,
      employeeId: teacher.employeeId,
      createdAt: teacher.createdAt,
      user: teacher.user,
      school: teacher.school,
    };
  }

  /**
   * Get teacher's current school
   */
  async getMySchool(user: UserWithContext) {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('Teacher is not associated with any school');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo: true,
        hasPrimary: true,
        hasSecondary: true,
        hasTertiary: true,
        schoolId: true,
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }
}

