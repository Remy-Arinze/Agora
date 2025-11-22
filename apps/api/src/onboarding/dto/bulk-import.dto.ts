import { ApiProperty } from '@nestjs/swagger';

export class BulkImportRowDto {
  @ApiProperty({ example: 'John', description: 'Student first name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Student last name' })
  lastName: string;

  @ApiProperty({
    example: '2010-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  dateOfBirth: string;

  @ApiProperty({ example: 'JSS 1', description: 'Class level' })
  class: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'Parent phone number',
  })
  parentPhone: string;

  @ApiProperty({
    example: 'parent@example.com',
    description: 'Parent email address',
    required: false,
  })
  parentEmail?: string;
}

export class ImportSummaryDto {
  @ApiProperty({ example: 150, description: 'Total rows processed' })
  totalRows: number;

  @ApiProperty({ example: 145, description: 'Successfully imported rows' })
  successCount: number;

  @ApiProperty({ example: 5, description: 'Failed rows' })
  errorCount: number;

  @ApiProperty({
    example: ['AGO-2025-001', 'AGO-2025-002'],
    description: 'Array of generated UIDs',
  })
  generatedUids: string[];

  @ApiProperty({
    example: [
      { row: 3, error: 'Invalid date format' },
      { row: 7, error: 'Missing required field: parentPhone' },
    ],
    description: 'Array of errors encountered',
  })
  errors: Array<{ row: number; error: string }>;
}

