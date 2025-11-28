import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { GenerateTacDto, InitiateTransferDto, CompleteTransferDto, RejectTransferDto } from './dto/transfer.dto';
import { TransferStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Generate a unique TAC (Transfer Access Code) for outgoing transfer
   */
  async generateTac(schoolId: string, userId: string, dto: GenerateTacDto) {
    // Get school info for email
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    // Verify student exists and belongs to this school
    const student = await this.prisma.student.findFirst({
      where: {
        id: dto.studentId,
        enrollments: {
          some: {
            schoolId,
            isActive: true,
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        enrollments: {
          where: {
            schoolId,
            isActive: true,
          },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found or not enrolled in this school');
    }

    // Check if there's already an active TAC for this student
    const existingTransfer = await this.prisma.transfer.findFirst({
      where: {
        studentId: dto.studentId,
        fromSchoolId: schoolId,
        status: { in: ['PENDING', 'APPROVED'] },
        tac: { not: null },
        OR: [
          { tacExpiresAt: { gt: new Date() } },
          { tacUsedAt: null },
        ],
      },
    });

    if (existingTransfer && existingTransfer.tac && !existingTransfer.tacUsedAt) {
      // Return existing TAC if still valid
      const expiresAt = existingTransfer.tacExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Send email if student has email
      const studentEmail = student.user?.email;
      if (studentEmail && school) {
        try {
          await this.emailService.sendTransferInitiationEmail(
            studentEmail,
            `${student.firstName} ${student.lastName}`,
            existingTransfer.tac,
            student.id,
            school.name,
            expiresAt
          );
        } catch (error) {
          // Log error but don't fail the request
          console.error('Failed to send transfer initiation email:', error);
        }
      } else if (!studentEmail) {
        console.warn(`Student ${student.id} does not have an email address. Cannot send transfer notification.`);
      }
      
      return {
        transferId: existingTransfer.id,
        tac: existingTransfer.tac,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        expiresAt: expiresAt.toISOString(),
        message: 'Share this TAC with the receiving school',
      };
    }

    // Generate unique TAC
    const tac = await this.generateUniqueTac();

    // Create transfer record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    const transfer = await this.prisma.transfer.create({
      data: {
        studentId: dto.studentId,
        fromSchoolId: schoolId,
        toSchoolId: null,
        status: TransferStatus.PENDING,
        tac,
        tacGeneratedAt: new Date(),
        tacExpiresAt: expiresAt,
        reason: dto.reason,
        requestedBy: userId,
      },
      include: {
        student: true,
      },
    });

    // Send email to student if email exists
    const studentEmail = student.user?.email;
    if (studentEmail && school) {
      try {
        await this.emailService.sendTransferInitiationEmail(
          studentEmail,
          `${student.firstName} ${student.lastName}`,
          tac,
          student.id,
          school.name,
          expiresAt
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send transfer initiation email:', error);
      }
    } else if (!studentEmail) {
      console.warn(`Student ${student.id} does not have an email address. Cannot send transfer notification.`);
    }

    return {
      transferId: transfer.id,
      tac: transfer.tac!,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      expiresAt: expiresAt.toISOString(),
      message: 'Share this TAC with the receiving school',
    };
  }

  /**
   * Generate a unique TAC code
   * Format: TAC-{8 chars}-{4 chars}
   */
  private async generateUniqueTac(): Promise<string> {
    let tac: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8 random alphanumeric characters
      const part1 = randomBytes(4).toString('hex').toUpperCase().substring(0, 8);
      // Generate 4 random alphanumeric characters
      const part2 = randomBytes(2).toString('hex').toUpperCase().substring(0, 4);
      tac = `TAC-${part1}-${part2}`;

      // Check if TAC already exists
      const existing = await this.prisma.transfer.findUnique({
        where: { tac },
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('Failed to generate unique TAC. Please try again.');
    }

    return tac!;
  }

  /**
   * Validate TAC and initiate transfer
   */
  async initiateTransfer(schoolId: string, dto: InitiateTransferDto) {
    // Find transfer by TAC
    const transfer = await this.prisma.transfer.findUnique({
      where: { tac: dto.tac },
      include: {
        student: true,
        fromSchool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Invalid TAC. Please verify the code and try again.');
    }

    // Validate TAC
    if (transfer.tacUsedAt) {
      throw new ConflictException(
        `This TAC has already been used by ${transfer.tacUsedBy ? 'another school' : 'a school'} on ${transfer.tacUsedAt.toISOString()}.`
      );
    }

    if (transfer.tacExpiresAt && transfer.tacExpiresAt < new Date()) {
      throw new BadRequestException(
        'This TAC has expired. Please request a new one from the source school.'
      );
    }

    if (transfer.studentId !== dto.studentId) {
      throw new BadRequestException('Student ID does not match the TAC.');
    }

    if (transfer.fromSchoolId === schoolId) {
      throw new BadRequestException('Cannot transfer within the same school.');
    }

    // Get student data from source school
    const studentData = await this.getStudentDataByTac(transfer.tac, transfer.studentId);

    // Update transfer record
    const updatedTransfer = await this.prisma.transfer.update({
      where: { id: transfer.id },
      data: {
        toSchoolId: schoolId,
        status: TransferStatus.APPROVED, // Auto-approve
        tacUsedAt: new Date(),
        tacUsedBy: schoolId,
        approvedAt: new Date(),
      },
    });

    return {
      transferId: updatedTransfer.id,
      studentData,
      message: 'Review student data and complete transfer',
    };
  }

  /**
   * Get student data using TAC (cross-school access)
   * This bypasses normal school isolation
   */
  async getStudentDataByTac(tac: string, studentId: string) {
    // Validate TAC first
    const transfer = await this.prisma.transfer.findUnique({
      where: { tac },
      include: {
        fromSchool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Invalid TAC');
    }

    if (transfer.studentId !== studentId) {
      throw new BadRequestException('Student ID does not match TAC');
    }

    // Get student with enrollment from source school
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: {
            schoolId: transfer.fromSchoolId,
            isActive: true,
          },
          orderBy: {
            enrollmentDate: 'desc',
          },
          take: 1,
          include: {
            grades: {
              orderBy: [
                { academicYear: 'desc' },
                { term: 'desc' },
              ],
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollment = student.enrollments[0];
    if (!enrollment) {
      throw new NotFoundException('Student has no active enrollment in source school');
    }

    return {
      student: {
        id: student.id,
        uid: student.uid,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth.toISOString(),
        email: student.email,
        phone: student.phone,
        address: student.address,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        allergies: student.allergies,
        medications: student.medications,
        emergencyContact: student.emergencyContact,
        emergencyContactPhone: student.emergencyContactPhone,
        medicalNotes: student.medicalNotes,
      },
      enrollment: {
        id: enrollment.id,
        classLevel: enrollment.classLevel,
        academicYear: enrollment.academicYear,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
        isActive: enrollment.isActive,
      },
      grades: enrollment.grades.map((grade) => ({
        id: grade.id,
        subject: grade.subject,
        score: grade.score.toNumber(),
        maxScore: grade.maxScore.toNumber(),
        grade: grade.grade,
        term: grade.term,
        academicYear: grade.academicYear,
        remarks: grade.remarks,
        signedAt: grade.signedAt?.toISOString(),
        createdAt: grade.createdAt.toISOString(),
      })),
      fromSchool: {
        id: transfer.fromSchool.id,
        name: transfer.fromSchool.name,
      },
    };
  }

  /**
   * Complete transfer - migrate student data to destination school
   */
  async completeTransfer(schoolId: string, transferId: string, dto: CompleteTransferDto) {
    // Get transfer record
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        student: true,
        fromSchool: true,
        toSchool: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.toSchoolId !== schoolId) {
      throw new ForbiddenException('You can only complete transfers to your school');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new ConflictException('Transfer has already been completed');
    }

    if (transfer.status === TransferStatus.REJECTED) {
      throw new BadRequestException('Cannot complete a rejected transfer');
    }

    // Get student data
    const studentData = await this.getStudentDataByTac(transfer.tac!, transfer.studentId);

    // Find or create student in destination school
    let student = await this.prisma.student.findUnique({
      where: { id: transfer.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Find target class
    const targetClass = await this.prisma.class.findFirst({
      where: {
        schoolId,
        name: dto.targetClassLevel,
      },
    });

    // Create new enrollment in destination school
    const newEnrollment = await this.prisma.enrollment.create({
      data: {
        studentId: student.id,
        schoolId,
        classId: dto.classId || targetClass?.id,
        classArmId: dto.classArmId,
        classLevel: dto.targetClassLevel,
        academicYear: dto.academicYear,
        enrollmentDate: new Date(),
        isActive: true,
      },
    });

    // Copy all historical grades to new enrollment
    for (const grade of studentData.grades) {
      await this.prisma.grade.create({
        data: {
          enrollmentId: newEnrollment.id,
          subject: grade.subject,
          score: grade.score,
          maxScore: grade.maxScore,
          grade: grade.grade,
          term: grade.term,
          academicYear: grade.academicYear,
          remarks: grade.remarks,
          signedAt: grade.signedAt ? new Date(grade.signedAt) : null,
          createdAt: new Date(grade.createdAt), // Preserve original date
        },
      });
    }

    // Update student health records if provided
    if (studentData.student.bloodGroup || studentData.student.allergies || studentData.student.medications) {
      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          bloodGroup: studentData.student.bloodGroup || student.bloodGroup,
          allergies: studentData.student.allergies || student.allergies,
          medications: studentData.student.medications || student.medications,
          emergencyContact: studentData.student.emergencyContact || student.emergencyContact,
          emergencyContactPhone: studentData.student.emergencyContactPhone || student.emergencyContactPhone,
          medicalNotes: studentData.student.medicalNotes || student.medicalNotes,
        },
      });
    }

    // Mark old enrollment as inactive
    await this.prisma.enrollment.update({
      where: { id: studentData.enrollment.id },
      data: { isActive: false },
    });

    // Update transfer status
    await this.prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return {
      transferId,
      newEnrollmentId: newEnrollment.id,
      message: 'Transfer completed successfully',
    };
  }

  /**
   * Reject transfer
   */
  async rejectTransfer(schoolId: string, transferId: string, dto: RejectTransferDto) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.toSchoolId !== schoolId) {
      throw new ForbiddenException('You can only reject transfers to your school');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new ConflictException('Cannot reject a completed transfer');
    }

    await this.prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });

    return {
      message: 'Transfer rejected successfully',
    };
  }

  /**
   * List outgoing transfers
   */
  async getOutgoingTransfers(schoolId: string, status?: TransferStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      fromSchoolId: schoolId,
    };

    if (status) {
      where.status = status;
    }

    const [transfers, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              uid: true,
              firstName: true,
              lastName: true,
            },
          },
          toSchool: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.transfer.count({ where }),
    ]);

    return {
      transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * List incoming transfers
   */
  async getIncomingTransfers(schoolId: string, status?: TransferStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      toSchoolId: schoolId,
    };

    if (status) {
      where.status = status;
    }

    const [transfers, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              uid: true,
              firstName: true,
              lastName: true,
            },
          },
          fromSchool: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.transfer.count({ where }),
    ]);

    return {
      transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Revoke TAC (if not used)
   */
  async revokeTac(schoolId: string, transferId: string) {
    // Get school info for email
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.fromSchoolId !== schoolId) {
      throw new ForbiddenException('You can only revoke TACs from your school');
    }

    if (transfer.tacUsedAt) {
      throw new ConflictException('Cannot revoke a TAC that has already been used');
    }

    await this.prisma.transfer.update({
      where: { id: transferId },
      data: {
        tac: null,
        tacGeneratedAt: null,
        tacExpiresAt: null,
        status: TransferStatus.CANCELLED,
      },
    });

    // Send email to student if email exists
    const studentEmail = transfer.student?.user?.email;
    if (studentEmail && school) {
      try {
        await this.emailService.sendTransferRevocationEmail(
          studentEmail,
          `${transfer.student.firstName} ${transfer.student.lastName}`,
          school.name
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send transfer revocation email:', error);
      }
    } else if (!studentEmail) {
      console.warn(`Student ${transfer.studentId} does not have an email address. Cannot send revocation notification.`);
    }

    return {
      message: 'TAC revoked successfully',
    };
  }
}
