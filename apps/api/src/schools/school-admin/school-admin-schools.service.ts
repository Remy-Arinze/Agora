import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SchoolRepository } from '../domain/repositories/school.repository';
import { SchoolMapper } from '../domain/mappers/school.mapper';
import { SchoolDto } from '../dto/school.dto';
import { SchoolDashboardDto, DashboardStatsDto, GrowthTrendDataDto, WeeklyActivityDataDto, RecentStudentDto } from '../dto/dashboard.dto';
import { StaffListResponseDto, StaffListItemDto, StaffListMetaDto, GetStaffListQueryDto } from '../dto/staff-list.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { UserWithContext } from '../../auth/types/user-with-context.type';
import { CloudinaryService } from '../../storage/cloudinary/cloudinary.service';

/**
 * Service for school admin operations on their own school
 * Handles viewing and updating their own school information
 */
@Injectable()
export class SchoolAdminSchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolRepository: SchoolRepository,
    private readonly schoolMapper: SchoolMapper,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  /**
   * Get school admin's own school
   */
  async getMySchool(user: UserWithContext): Promise<SchoolDto> {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('You are not associated with any school');
    }

    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new BadRequestException('School not found');
    }

    const completeSchool = await this.prisma.school.findUnique({
      where: { id: school.id },
      include: {
        admins: {
          include: { user: true },
          orderBy: { role: 'asc' },
        },
        teachers: true,
        enrollments: {
          where: { isActive: true },
        },
      },
    });

    if (!completeSchool) {
      throw new BadRequestException('School not found');
    }

    return this.schoolMapper.toDto(completeSchool);
  }

  /**
   * Get dashboard data for school admin
   */
  async getDashboard(user: UserWithContext): Promise<SchoolDashboardDto> {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('You are not associated with any school');
    }

    // Get current date and calculate date ranges
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get all data in parallel
    const [
      currentEnrollments,
      previousEnrollments,
      currentTeachers,
      previousTeachers,
      currentCourses,
      previousCourses,
      pendingAdmissions,
      previousPendingAdmissions,
      allEnrollments,
      recentEnrollments,
      weeklyAdmissions,
      weeklyTransfers,
    ] = await Promise.all([
      // Current counts
      this.prisma.enrollment.count({
        where: { schoolId, isActive: true },
      }),
      // Previous month counts for comparison
      this.prisma.enrollment.count({
        where: {
          schoolId,
          isActive: true,
          createdAt: { lte: lastMonth },
        },
      }),
      // Teachers
      this.prisma.teacher.count({
        where: { schoolId },
      }),
      this.prisma.teacher.count({
        where: {
          schoolId,
          createdAt: { lte: lastMonth },
        },
      }),
      // Courses (placeholder - will be 0 if Course model doesn't exist)
      this.getCourseCount(schoolId).catch(() => 0),
      this.getCourseCount(schoolId, lastMonth).catch(() => 0),
      // Pending admissions (placeholder - will be 0 if Admission model doesn't exist)
      this.getPendingAdmissionsCount(schoolId).catch(() => 0),
      this.getPendingAdmissionsCount(schoolId, lastMonth).catch(() => 0),
      // All enrollments for growth trends
      this.prisma.enrollment.findMany({
        where: {
          schoolId,
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true },
      }),
      // Recent students (last 5)
      this.prisma.enrollment.findMany({
        where: { schoolId, isActive: true },
        include: {
          student: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Weekly admissions
      this.prisma.enrollment.findMany({
        where: {
          schoolId,
          createdAt: { gte: lastWeek },
        },
        select: { createdAt: true },
      }),
      // Weekly transfers (assuming there's a transfer model or we track it via enrollment changes)
      Promise.resolve([]), // Placeholder for transfers
    ]);

    // Calculate stats with percentage changes
    const stats: DashboardStatsDto = {
      totalStudents: currentEnrollments,
      studentsChange: previousEnrollments > 0
        ? Math.round(((currentEnrollments - previousEnrollments) / previousEnrollments) * 100)
        : currentEnrollments > 0 ? 100 : 0,
      totalTeachers: currentTeachers,
      teachersChange: previousTeachers > 0
        ? Math.round(((currentTeachers - previousTeachers) / previousTeachers) * 100)
        : currentTeachers > 0 ? 100 : 0,
      activeCourses: currentCourses,
      coursesChange: previousCourses > 0
        ? Math.round(((currentCourses - previousCourses) / previousCourses) * 100)
        : currentCourses > 0 ? 100 : 0,
      pendingAdmissions: pendingAdmissions,
      pendingAdmissionsChange: pendingAdmissions - previousPendingAdmissions,
    };

    // Calculate growth trends (last 6 months)
    const growthTrends: GrowthTrendDataDto[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const nextMonthDate = new Date(currentYear, currentMonth - i + 1, 1);
      
      const monthEnrollments = allEnrollments.filter(
        (e) => e.createdAt >= monthDate && e.createdAt < nextMonthDate
      ).length;

      // Get teachers created in this month
      const monthTeachers = await this.prisma.teacher.count({
        where: {
          schoolId,
          createdAt: { gte: monthDate, lt: nextMonthDate },
        },
      });

      // Get courses created in this month
      const monthCourses = await this.getCourseCount(schoolId, monthDate, nextMonthDate).catch(() => 0);

      growthTrends.push({
        name: monthNames[monthDate.getMonth()],
        students: monthEnrollments,
        teachers: monthTeachers,
        courses: monthCourses,
      });
    }

    // Calculate weekly activity (last 7 days)
    const weeklyActivity: WeeklyActivityDataDto[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - i);
      dayDate.setHours(0, 0, 0, 0);
      const nextDayDate = new Date(dayDate);
      nextDayDate.setDate(nextDayDate.getDate() + 1);

      const dayAdmissions = weeklyAdmissions.filter(
        (e) => e.createdAt >= dayDate && e.createdAt < nextDayDate
      ).length;

      // Transfers placeholder (would need Transfer model)
      const dayTransfers = 0;

      weeklyActivity.push({
        name: dayNames[dayDate.getDay()],
        admissions: dayAdmissions,
        transfers: dayTransfers,
      });
    }

    // Map recent students
    const recentStudents: RecentStudentDto[] = recentEnrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: `${enrollment.student.firstName} ${enrollment.student.middleName ? `${enrollment.student.middleName} ` : ''}${enrollment.student.lastName}`.trim(),
      classLevel: enrollment.classLevel || 'N/A',
      admissionNumber: enrollment.student.uid || enrollment.student.publicId || 'N/A',
      status: enrollment.isActive ? 'active' : 'inactive',
      createdAt: enrollment.createdAt.toISOString().split('T')[0],
    }));

    return {
      stats,
      growthTrends,
      weeklyActivity,
      recentStudents,
    };
  }

  /**
   * Helper method to get course count (handles missing Course model)
   */
  private async getCourseCount(schoolId: string, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const where: any = { schoolId };
      if (startDate) {
        where.createdAt = { gte: startDate };
        if (endDate) {
          where.createdAt.lt = endDate;
        } else {
          where.createdAt.lte = new Date();
        }
      }
      return await (this.prisma as any).course?.count({ where }) || 0;
    } catch {
      return 0; // Course model doesn't exist or error
    }
  }

  /**
   * Helper method to get pending admissions count (handles missing Admission model)
   */
  private async getPendingAdmissionsCount(schoolId: string, beforeDate?: Date): Promise<number> {
    try {
      const where: any = { schoolId, status: 'PENDING' };
      if (beforeDate) {
        where.createdAt = { lte: beforeDate };
      }
      return await (this.prisma as any).admission?.count({ where }) || 0;
    } catch {
      return 0; // Admission model doesn't exist or error
    }
  }

  /**
   * Get paginated staff list with search and filtering
   */
  async getStaffList(
    user: UserWithContext,
    query: GetStaffListQueryDto
  ): Promise<StaffListResponseDto> {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('You are not associated with any school');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10)); // Max 100 items per page
    const skip = (page - 1) * limit;
    const search = query.search?.trim() || '';
    const roleFilter = query.role?.trim() || '';

    // Build search conditions for both admins and teachers
    const searchCondition = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Build role filter condition
    const isTeacherFilter = roleFilter === 'Teacher';
    const isSpecificRoleFilter = roleFilter && roleFilter !== 'All' && roleFilter !== 'Teacher';

    // Get all staff (admins and teachers) with filters
    const [allAdmins, allTeachers] = await Promise.all([
      // Get all admins (filtered by search and role if needed)
      this.prisma.schoolAdmin.findMany({
        where: {
          schoolId,
          ...searchCondition,
          ...(isSpecificRoleFilter ? { role: { equals: roleFilter, mode: 'insensitive' as const } } : {}),
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Get all teachers (filtered by search, exclude if filtering by specific admin role)
      this.prisma.teacher.findMany({
        where: {
          schoolId,
          ...searchCondition,
          ...(isSpecificRoleFilter ? { id: { in: [] } } : {}), // Exclude teachers if filtering by admin role
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Combine and map to DTO format
    const allStaff: StaffListItemDto[] = [
      ...allAdmins.map((admin) => ({
        id: admin.id,
        type: 'admin' as const,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        subject: null,
        employeeId: null,
        isTemporary: false,
        status: admin.user?.accountStatus === 'ACTIVE' ? 'active' : 'inactive',
        profileImage: admin.profileImage,
        createdAt: admin.createdAt,
      })),
      ...allTeachers.map((teacher) => ({
        id: teacher.id,
        type: 'teacher' as const,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        role: 'Teacher',
        subject: teacher.subject,
        employeeId: teacher.employeeId,
        isTemporary: teacher.isTemporary,
        status: teacher.user?.accountStatus === 'ACTIVE' ? 'active' : 'inactive',
        profileImage: teacher.profileImage,
        createdAt: teacher.createdAt,
      })),
    ];

    // Apply additional search on subject field (for teachers)
    let filteredStaff = allStaff;
    if (search) {
      filteredStaff = allStaff.filter((staff) => {
        const searchLower = search.toLowerCase();
        return (
          staff.firstName.toLowerCase().includes(searchLower) ||
          staff.lastName.toLowerCase().includes(searchLower) ||
          staff.email?.toLowerCase().includes(searchLower) ||
          staff.subject?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort by creation date (newest first)
    filteredStaff.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Extract unique roles from all staff (before pagination)
    const availableRoles = new Set<string>();
    allAdmins.forEach((admin) => {
      if (admin.role) {
        availableRoles.add(admin.role);
      }
    });
    if (allTeachers.length > 0) {
      availableRoles.add('Teacher');
    }

    // Apply pagination
    const totalCount = filteredStaff.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedStaff = filteredStaff.slice(skip, skip + limit);

    const meta: StaffListMetaDto = {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      items: paginatedStaff,
      meta,
      availableRoles: Array.from(availableRoles).sort(),
    };
  }

  /**
   * Upload school logo
   */
  async uploadLogo(user: UserWithContext, file: Express.Multer.File): Promise<SchoolDto> {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('You are not associated with any school');
    }

    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new BadRequestException('School not found');
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

    // Delete old logo if exists
    if (school.logo) {
      const oldPublicId = this.cloudinaryService.extractPublicId(school.logo);
      if (oldPublicId) {
        try {
          await this.cloudinaryService.deleteImage(oldPublicId);
        } catch (error) {
          console.error('Error deleting old logo:', error);
          // Continue even if deletion fails
        }
      }
    }

    // Upload to Cloudinary
    const { url } = await this.cloudinaryService.uploadImage(
      file,
      `schools/${schoolId}/logo`,
      `school-${schoolId}-logo`
    );

    // Update school with new logo URL
    const updatedSchool = await this.prisma.school.update({
      where: { id: school.id },
      data: { logo: url },
      include: {
        admins: {
          include: { user: true },
          orderBy: { role: 'asc' },
        },
        teachers: true,
        enrollments: {
          where: { isActive: true },
        },
      },
    });

    return this.schoolMapper.toDto(updatedSchool);
  }

  /**
   * Update school information
   */
  async updateSchool(user: UserWithContext, updateSchoolDto: UpdateSchoolDto): Promise<SchoolDto> {
    const schoolId = user.currentSchoolId;

    if (!schoolId) {
      throw new BadRequestException('You are not associated with any school');
    }

    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Update school
    const updatedSchool = await this.prisma.school.update({
      where: { id: school.id },
      data: updateSchoolDto,
      include: {
        admins: {
          include: { user: true },
          orderBy: { role: 'asc' },
        },
        teachers: true,
        enrollments: {
          where: { isActive: true },
        },
      },
    });

    return this.schoolMapper.toDto(updatedSchool);
  }
}

