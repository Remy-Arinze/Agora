import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto, VerifyOtpDto, AuthTokensDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtPayload } from './types/user-with-context.type';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokensDto> {
    try {
      const { emailOrPublicId, password } = loginDto;

      // Determine if it's an email or public ID
      const isEmail = emailOrPublicId.includes('@');
      
      let user;
      let schoolAdmin = null;
      let teacherProfile = null;

      if (isEmail) {
        // Super admin or user logging in with email
        user = await this.prisma.user.findFirst({
          where: {
            email: emailOrPublicId,
          },
          include: {
            studentProfile: {
              include: {
                enrollments: {
                  where: { isActive: true },
                  orderBy: { enrollmentDate: 'desc' },
                  take: 1,
                  include: { school: true },
                },
              },
            },
            parentProfile: true,
            teacherProfiles: true,
            schoolAdmins: true,
          },
        });
      } else {
        // Admin, principal, or teacher logging in with public ID
        // Principals are SchoolAdmin records with role PRINCIPAL, so they're included here
        // Find by public ID in SchoolAdmin (includes principals and all admin roles) or Teacher
        schoolAdmin = await this.prisma.schoolAdmin.findUnique({
          where: { publicId: emailOrPublicId },
          include: { user: true },
        });

        if (!schoolAdmin) {
          teacherProfile = await this.prisma.teacher.findUnique({
            where: { publicId: emailOrPublicId },
            include: { user: true },
          });
        }

        if (!schoolAdmin && !teacherProfile) {
          throw new UnauthorizedException('Invalid credentials');
        }

        user = schoolAdmin?.user || teacherProfile?.user;
        
        if (user) {
          // Reload user with all relations
          user = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
              studentProfile: true,
              parentProfile: true,
              teacherProfiles: true,
              schoolAdmins: true,
            },
          });
        }
      }

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is shadow (cannot login)
      if (user.accountStatus === 'SHADOW') {
        throw new UnauthorizedException(
          'Account not activated. Please verify your OTP to claim your account.'
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Determine school context based on login method and role
      let currentSchoolId: string | null = null;
      let currentPublicId: string | null = null;
      let currentProfileId: string | null = null;

      if (isEmail) {
        // Email login - determine school context based on role
        if (user.role === 'STUDENT') {
          // ✅ STUDENT: Find active enrollment and set school context
          if (user.studentProfile && user.studentProfile.enrollments.length > 0) {
            const activeEnrollment = user.studentProfile.enrollments[0];
            currentSchoolId = activeEnrollment.schoolId;
            // Students don't have publicId or profileId
          }
          // If no active enrollment, schoolId remains null (student not enrolled anywhere)
        }
        // ✅ SUPER_ADMIN: No school context (can access all schools)
        // schoolId, publicId, profileId remain null for super admin
      } else {
        // Public ID login - capture school context
        // ✅ Only SCHOOL_ADMIN, TEACHER, PRINCIPAL log in with public ID
        if (schoolAdmin) {
          currentSchoolId = schoolAdmin.schoolId;
          currentPublicId = schoolAdmin.publicId;
          currentProfileId = schoolAdmin.adminId;
        } else if (teacherProfile) {
          currentSchoolId = teacherProfile.schoolId;
          currentPublicId = teacherProfile.publicId;
          currentProfileId = teacherProfile.teacherId;
        }
      }

      // Generate tokens with school context
      const tokens = await this.generateTokens(
        user.id,
        user.role,
        currentSchoolId,
        currentPublicId,
        currentProfileId
      );

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          accountStatus: user.accountStatus,
          profileId: currentProfileId,
          publicId: currentPublicId,
          schoolId: currentSchoolId, // ✅ Include in response
        },
      };
    } catch (error) {
      // Log the full error for debugging
      console.error('AuthService.login error:', error);
      // If it's already a NestJS exception, re-throw it
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma errors with better messages
      if (error instanceof Error) {
        // Check for Prisma-specific errors
        if (error.message.includes('Unknown field')) {
          throw new BadRequestException(
            'A system error occurred. Please contact support if this persists.'
          );
        }
        // Generic error message for other cases
        throw new BadRequestException(
          'Unable to complete login. Please check your credentials and try again.'
        );
      }
      // Fallback for unknown errors
      throw new BadRequestException('Login failed. Please try again later.');
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthTokensDto> {
    const { phone, code } = verifyOtpDto;

    const parent = await this.prisma.parent.findFirst({
      where: { phone },
      include: {
        user: true,
        otpCodes: {
          where: {
            code,
            expiresAt: { gt: new Date() },
            usedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!parent || parent.otpCodes.length === 0) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    const otpCode = parent.otpCodes[0];

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otpCode.id },
      data: { usedAt: new Date() },
    });

    // Activate parent account
    const updatedUser = await this.prisma.user.update({
      where: { id: parent.userId },
      data: {
        accountStatus: 'ACTIVE',
      },
      include: {
        parentProfile: true,
        schoolAdmins: true,
        teacherProfiles: true,
      },
    });

    // Lock student profiles linked to this parent
    const students = await this.prisma.studentGuardian.findMany({
      where: { parentId: parent.id },
      select: { studentId: true },
    });

    if (students.length > 0) {
      await this.prisma.student.updateMany({
        where: {
          id: { in: students.map((s: { studentId: string }) => s.studentId) },
        },
        data: {
          profileLocked: true,
        },
      });
    }

    const tokens = await this.generateTokens(updatedUser.id, updatedUser.role);

    // Get profile-specific ID (for parents, this would be null)
    let profileId: string | null = null;
    if (updatedUser.schoolAdmins && updatedUser.schoolAdmins.length > 0) {
      profileId = updatedUser.schoolAdmins[0].adminId;
    } else if (updatedUser.teacherProfiles && updatedUser.teacherProfiles.length > 0) {
      profileId = updatedUser.teacherProfiles[0].teacherId;
    }

    return {
      ...tokens,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        profileId: profileId,
      },
    };
  }

  private async generateTokens(
    userId: string,
    role: string,
    schoolId?: string | null,
    publicId?: string | null,
    profileId?: string | null
  ) {
    const payload: JwtPayload = {
      sub: userId,
      role,
      ...(schoolId && { schoolId }),      // ✅ Include if exists
      ...(publicId && { publicId }),      // ✅ Include if exists
      ...(profileId && { profileId }),    // ✅ Include if exists
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        parentProfile: true,
        teacherProfiles: true,
        schoolAdmins: true,
      },
    });
  }

  /**
   * Generate and send password reset token
   */
  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    const { email } = requestPasswordResetDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        schoolAdmins: true,
        teacherProfiles: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Create reset token
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Get user name and role for email
    let name = email;
    let role = 'User';
    
    if (user.schoolAdmins && user.schoolAdmins.length > 0) {
      name = `${user.schoolAdmins[0].firstName} ${user.schoolAdmins[0].lastName}`;
      role = user.schoolAdmins[0].role === 'PRINCIPAL' ? 'Principal' : 'Administrator';
    } else if (user.teacherProfiles && user.teacherProfiles.length > 0) {
      name = `${user.teacherProfiles[0].firstName} ${user.teacherProfiles[0].lastName}`;
      role = 'Teacher';
    }

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(email, name, token, role);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to send password reset email:', error);
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    // Find valid reset token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Get user info before updating (for confirmation email)
    const user = resetToken.user;
    let name = user.email || 'User';
    let publicId: string | null = null;

    // Try to get public ID from school admin or teacher profile
    const userWithProfiles = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        schoolAdmins: true,
        teacherProfiles: true,
      },
    });

    if (userWithProfiles) {
      if (userWithProfiles.schoolAdmins && userWithProfiles.schoolAdmins.length > 0) {
        name = `${userWithProfiles.schoolAdmins[0].firstName} ${userWithProfiles.schoolAdmins[0].lastName}`;
        publicId = userWithProfiles.schoolAdmins[0].publicId;
      } else if (userWithProfiles.teacherProfiles && userWithProfiles.teacherProfiles.length > 0) {
        name = `${userWithProfiles.teacherProfiles[0].firstName} ${userWithProfiles.teacherProfiles[0].lastName}`;
        publicId = userWithProfiles.teacherProfiles[0].publicId;
      }
    }

    // Update user password and mark token as used
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          accountStatus: 'ACTIVE', // Activate account if it was shadow
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
    });

    // Send confirmation email (only if user has an email)
    if (user.email) {
      try {
        await this.emailService.sendPasswordResetConfirmationEmail(
          user.email,
          name,
          publicId || undefined
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send password reset confirmation email:', error);
      }
    }
  }

  /**
   * Generate and send password reset token for new user (used when creating school/admin/teacher)
   */
  async sendPasswordResetForNewUser(
    userId: string,
    email: string,
    name: string,
    role: string,
    publicId?: string
  ): Promise<void> {
    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Create reset token
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    // Send email with public ID if provided
    try {
      await this.emailService.sendPasswordResetEmail(email, name, token, role, publicId || undefined);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to send password reset email:', error);
    }
  }
}

