import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthService } from '../../../auth/auth.service';
import { SchoolRepository } from '../../domain/repositories/school.repository';
import { StaffRepository } from '../../domain/repositories/staff.repository';
import { StaffMapper } from '../../domain/mappers/staff.mapper';
import { IdGeneratorService } from '../../shared/id-generator.service';
import { StaffValidatorService } from '../../shared/staff-validator.service';
import { AddTeacherDto } from '../../dto/add-teacher.dto';
import { UpdateTeacherDto } from '../../dto/update-teacher.dto';
import * as bcrypt from 'bcrypt';

/**
 * Service for managing teachers
 * Handles creating, updating, and deleting teachers
 */
@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly schoolRepository: SchoolRepository,
    private readonly staffRepository: StaffRepository,
    private readonly staffMapper: StaffMapper,
    private readonly idGenerator: IdGeneratorService,
    private readonly staffValidator: StaffValidatorService
  ) {}

  /**
   * Add a teacher to a school
   */
  async addTeacher(schoolId: string, teacherData: AddTeacherDto): Promise<any> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate staff data
    this.staffValidator.validateStaffData(teacherData);

    // Validate email and phone are unique in school
    await this.staffValidator.validateEmailUniqueInSchool(teacherData.email, school.id);
    await this.staffValidator.validatePhoneUniqueInSchool(teacherData.phone, school.id);

    const defaultPassword = await bcrypt.hash('Password123!', 10);

    // Generate teacher ID and public ID
    const teacherId = await this.idGenerator.generateTeacherId();
    const publicId = await this.idGenerator.generatePublicId(school.name, 'teacher');

    // Create user and teacher in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      try {
        // Find or create user
        let teacherUser = await tx.user.findUnique({
          where: { email: teacherData.email },
        });

        if (!teacherUser) {
          teacherUser = await tx.user.create({
            data: {
              email: teacherData.email,
              phone: teacherData.phone,
              passwordHash: defaultPassword,
              accountStatus: 'ACTIVE',
              role: 'TEACHER',
            },
          });
        } else {
          teacherUser = await tx.user.update({
            where: { id: teacherUser.id },
            data: {
              passwordHash: defaultPassword,
              accountStatus: 'ACTIVE',
              role: 'TEACHER',
            },
          });
        }

        // Create teacher - use transaction client directly
        const newTeacher = await tx.teacher.create({
          data: {
            teacherId: teacherId,
            publicId: publicId,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            email: teacherData.email,
            phone: teacherData.phone,
            subject: teacherData.subject || null,
            isTemporary: teacherData.isTemporary || false,
            employeeId: teacherData.employeeId || null,
            userId: teacherUser.id,
            schoolId: school.id,
          },
          include: { user: true, school: true },
        });

        return { teacher: newTeacher, user: teacherUser };
      } catch (error: any) {
        if (error.code === 'P2002') {
          const target = error.meta?.target;
          if (Array.isArray(target) && target.includes('email')) {
            throw new ConflictException(`User with email ${teacherData.email} already exists`);
          }
          if (Array.isArray(target) && target.includes('phone')) {
            throw new ConflictException(`User with phone number ${teacherData.phone} already exists`);
          }
        }
        throw error;
      }
    });

    // Send password reset email
    try {
      await this.authService.sendPasswordResetForNewUser(
        result.user.id,
        teacherData.email,
        `${teacherData.firstName} ${teacherData.lastName}`,
        'Teacher',
        result.teacher.publicId
      );
    } catch (error) {
      console.error('Failed to send password reset email to teacher:', error);
    }

    return this.staffMapper.toTeacherDto(result.teacher);
  }

  /**
   * Update a teacher
   */
  async updateTeacher(
    schoolId: string,
    teacherId: string,
    updateData: UpdateTeacherDto
  ): Promise<any> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate teacher exists in school
    const teacher = await this.staffRepository.findTeacherById(teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new BadRequestException('Teacher not found in this school');
    }

    // Validate staff data if provided
    if (updateData.firstName || updateData.lastName || updateData.phone) {
      this.staffValidator.validateStaffData({
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phone: updateData.phone,
      });
    }

    // Update teacher
    const updatedTeacher = await this.staffRepository.updateTeacher(teacherId, {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phone: updateData.phone,
      subject: updateData.subject,
      isTemporary: updateData.isTemporary,
    });

    return this.staffMapper.toTeacherDto(updatedTeacher);
  }

  /**
   * Delete a teacher
   */
  async deleteTeacher(schoolId: string, teacherId: string): Promise<void> {
    // Validate school exists
    const school = await this.schoolRepository.findByIdOrSubdomain(schoolId);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Validate teacher exists in school
    const teacher = await this.staffRepository.findTeacherById(teacherId);
    if (!teacher || teacher.schoolId !== school.id) {
      throw new BadRequestException('Teacher not found in this school');
    }

    await this.staffRepository.deleteTeacher(teacherId);
  }
}

