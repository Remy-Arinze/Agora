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

    // Parse Excel/CSV file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Parse with header row - XLSX preserves header case from CSV
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', // Use empty string for empty cells
      raw: false // Convert all values to strings for consistent handling
    });

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
        // Support both 'class' and 'classLevel' field names for backward compatibility
        const classLevelValue = row.classLevel || row.class;
        const classLevel = classLevelValue ? String(classLevelValue).trim() : null;
        
        // Trim and validate required fields (check for empty strings after trimming)
        const firstName = row.firstName ? String(row.firstName).trim() : null;
        const lastName = row.lastName ? String(row.lastName).trim() : null;
        const dateOfBirth = row.dateOfBirth ? String(row.dateOfBirth).trim() : null;
        const parentPhone = row.parentPhone ? String(row.parentPhone).trim() : null;
        
        // Validate required fields
        if (!firstName || !lastName || !dateOfBirth || !classLevel || !parentPhone) {
          const missingFields = [];
          if (!firstName) missingFields.push('firstName');
          if (!lastName) missingFields.push('lastName');
          if (!dateOfBirth) missingFields.push('dateOfBirth');
          if (!classLevel) missingFields.push('class/classLevel');
          if (!parentPhone) missingFields.push('parentPhone');
          
          summary.errors.push({
            row: rowNumber,
            error: `Missing required fields: ${missingFields.join(', ')}`,
          });
          summary.errorCount++;
          continue;
        }

        // Use StudentAdmissionService to add student (reuses existing flow)
        const result = await this.studentAdmissionService.addStudent(tenantId, {
          firstName: firstName,
          lastName: lastName,
          middleName: row.middleName ? String(row.middleName).trim() : undefined,
          dateOfBirth: dateOfBirth,
          classLevel: classLevel,
          email: row.email ? String(row.email).trim() : undefined,
          phone: row.phone ? String(row.phone).trim() : undefined,
          parentName: row.parentName ? String(row.parentName).trim() : parentPhone, // Fallback to phone if name not provided
          parentPhone: parentPhone,
          parentEmail: row.parentEmail ? String(row.parentEmail).trim() : undefined,
          parentRelationship: row.parentRelationship ? String(row.parentRelationship).trim() : 'Guardian',
          bloodGroup: row.bloodGroup ? String(row.bloodGroup).trim() : undefined,
          allergies: row.allergies ? String(row.allergies).trim() : undefined,
          medications: row.medications ? String(row.medications).trim() : undefined,
          emergencyContact: row.emergencyContact ? String(row.emergencyContact).trim() : undefined,
          emergencyContactPhone: row.emergencyContactPhone ? String(row.emergencyContactPhone).trim() : undefined,
          medicalNotes: row.medicalNotes ? String(row.medicalNotes).trim() : undefined,
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

