import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admins/admin.service';
import { TeacherService } from './teachers/teacher.service';
import { StaffBulkImportRowDto, StaffImportSummaryDto } from '../dto/staff-bulk-import.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class StaffImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly teacherService: TeacherService
  ) {}

  /**
   * Bulk import staff from CSV/Excel file
   * Reuses existing addTeacher and addAdmin methods to ensure consistency
   */
  async bulkImportStaff(
    schoolId: string,
    file: Express.Multer.File
  ): Promise<StaffImportSummaryDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      throw new BadRequestException('Invalid file type. Please upload a CSV or Excel file.');
    }

    // Parse file
    let rows: StaffBulkImportRowDto[];
    try {
      if (fileExtension === 'csv') {
        // Parse CSV
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else {
        // Parse Excel
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      }
    } catch (error) {
      throw new BadRequestException('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
    }

    if (rows.length === 0) {
      throw new BadRequestException('File is empty or contains no data rows.');
    }

    const summary: StaffImportSummaryDto = {
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      generatedPublicIds: [],
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header

      try {
        // Validate required fields
        if (!row.type || !row.firstName || !row.lastName || !row.email || !row.phone) {
          summary.errors.push({
            row: rowNumber,
            error: 'Missing required fields: type, firstName, lastName, email, or phone',
          });
          summary.errorCount++;
          continue;
        }

        // Validate type
        if (row.type !== 'teacher' && row.type !== 'admin') {
          summary.errors.push({
            row: rowNumber,
            error: `Invalid type: "${row.type}". Must be "teacher" or "admin"`,
          });
          summary.errorCount++;
          continue;
        }

        // Validate admin-specific requirements
        if (row.type === 'admin' && !row.role) {
          summary.errors.push({
            row: rowNumber,
            error: 'Missing required field: role (required for admin type)',
          });
          summary.errorCount++;
          continue;
        }

        // Process based on type
        if (row.type === 'teacher') {
          try {
            const result = await this.teacherService.addTeacher(schoolId, {
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              email: row.email.trim(),
              phone: row.phone.trim(),
              subject: row.subject?.trim() || undefined,
              employeeId: row.employeeId?.trim() || undefined,
              isTemporary: row.isTemporary?.toLowerCase() === 'true',
            });

            summary.successCount++;
            // Extract publicId from result (could be in result.publicId or result.teacher.publicId)
            const publicId = (result as any)?.publicId || (result as any)?.teacher?.publicId;
            if (publicId) {
              summary.generatedPublicIds.push(publicId);
            }
          } catch (error: any) {
            summary.errors.push({
              row: rowNumber,
              error: error.message || 'Failed to add teacher',
            });
            summary.errorCount++;
          }
        } else if (row.type === 'admin') {
          try {
            const result = await this.adminService.addAdmin(schoolId, {
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              email: row.email.trim(),
              phone: row.phone.trim(),
              role: row.role.trim(),
            });

            summary.successCount++;
            // Extract publicId from result (could be in result.publicId or result.admin.publicId)
            const publicId = (result as any)?.publicId || (result as any)?.admin?.publicId;
            if (publicId) {
              summary.generatedPublicIds.push(publicId);
            }
          } catch (error: any) {
            summary.errors.push({
              row: rowNumber,
              error: error.message || 'Failed to add admin',
            });
            summary.errorCount++;
          }
        }
      } catch (error: any) {
        summary.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
        summary.errorCount++;
      }
    }

    return summary;
  }
}

