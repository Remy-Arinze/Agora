import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BulkImportRowDto, ImportSummaryDto } from './dto/bulk-import.dto';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkImport(
    file: Express.Multer.File,
    tenantId: string
  ): Promise<ImportSummaryDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: BulkImportRowDto[] = XLSX.utils.sheet_to_json(worksheet);

    const summary: ImportSummaryDto = {
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      generatedUids: [],
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header

      try {
        // Validate required fields
        if (!row.firstName || !row.lastName || !row.dateOfBirth || !row.class || !row.parentPhone) {
          summary.errors.push({
            row: rowNumber,
            error: 'Missing required fields',
          });
          summary.errorCount++;
          continue;
        }

        // Generate UID (format: AGO-YYYY-XXXX)
        const year = new Date().getFullYear();
        const sequence = String(summary.successCount + 1).padStart(3, '0');
        const uid = `AGO-${year}-${sequence}`;

        // Create or find parent user
        let parentUser = await this.prisma.user.findUnique({
          where: { phone: row.parentPhone },
        });

        if (!parentUser) {
          // Create shadow parent user
          parentUser = await this.prisma.user.create({
            data: {
              phone: row.parentPhone,
              email: row.parentEmail || null,
              accountStatus: 'SHADOW',
              role: 'PARENT',
            },
          });

          // Create parent profile
          await this.prisma.parent.create({
            data: {
              userId: parentUser.id,
              firstName: row.parentPhone, // Placeholder, will be updated on claim
              lastName: '',
              phone: row.parentPhone,
              email: row.parentEmail || null,
            },
          });
        }

        // Create shadow student user
        const studentUser = await this.prisma.user.create({
          data: {
            accountStatus: 'SHADOW',
            role: 'STUDENT',
          },
        });

        // Create student profile
        const student = await this.prisma.student.create({
          data: {
            userId: studentUser.id,
            uid,
            firstName: row.firstName,
            lastName: row.lastName,
            dateOfBirth: new Date(row.dateOfBirth),
            profileLocked: false,
          },
        });

        // Link parent to student
        await this.prisma.studentGuardian.create({
          data: {
            studentId: student.id,
            parentId: parentUser.id,
            relationship: 'Primary',
            isPrimary: true,
          },
        });

        // Create enrollment
        await this.prisma.enrollment.create({
          data: {
            studentId: student.id,
            schoolId: tenantId,
            classLevel: row.class,
            academicYear: `${year}/${year + 1}`,
            isActive: true,
          },
        });

        summary.successCount++;
        summary.generatedUids.push(uid);
      } catch (error) {
        summary.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        summary.errorCount++;
      }
    }

    return summary;
  }
}

