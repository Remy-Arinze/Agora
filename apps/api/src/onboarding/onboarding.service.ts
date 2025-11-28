import { Injectable, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BulkImportRowDto, ImportSummaryDto } from './dto/bulk-import.dto';
import * as XLSX from 'xlsx';
import { StudentAdmissionService } from '../students/student-admission.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StudentAdmissionService))
    private readonly studentAdmissionService: StudentAdmissionService
  ) {}

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
            error: 'Missing required fields: firstName, lastName, dateOfBirth, class, or parentPhone',
          });
          summary.errorCount++;
          continue;
        }

        // Use StudentAdmissionService to add student (reuses existing flow)
        const result = await this.studentAdmissionService.addStudent(tenantId, {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          middleName: row.middleName?.trim(),
          dateOfBirth: row.dateOfBirth,
          classLevel: row.class.trim(),
          email: row.email?.trim(),
          phone: row.phone?.trim(),
          parentName: row.parentName?.trim() || row.parentPhone.trim(), // Fallback to phone if name not provided
          parentPhone: row.parentPhone.trim(),
          parentEmail: row.parentEmail?.trim(),
          parentRelationship: row.parentRelationship?.trim() || 'Guardian',
          bloodGroup: row.bloodGroup?.trim(),
          allergies: row.allergies?.trim(),
          medications: row.medications?.trim(),
          emergencyContact: row.emergencyContact?.trim(),
          emergencyContactPhone: row.emergencyContactPhone?.trim(),
          medicalNotes: row.medicalNotes?.trim(),
        });

        summary.successCount++;
        if (result.publicId) {
          summary.generatedUids.push(result.publicId);
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

