import { ApiProperty } from '@nestjs/swagger';

export class StudentDto {
  @ApiProperty({ example: 'clx1234567890', description: 'Student ID' })
  id: string;

  @ApiProperty({ example: 'AGO-2025-001', description: 'Universal ID' })
  uid: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastName: string;

  @ApiProperty({ example: 'Michael', description: 'Middle name', required: false })
  middleName: string | null;

  @ApiProperty({ example: '2010-05-15', description: 'Date of birth' })
  dateOfBirth: string;

  @ApiProperty({ example: false, description: 'Whether profile is locked' })
  profileLocked: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class StudentWithEnrollmentDto extends StudentDto {
  @ApiProperty({
    description: 'Current enrollment information',
    required: false,
  })
  enrollment?: {
    id: string;
    classLevel: string;
    academicYear: string;
    school: {
      id: string;
      name: string;
      subdomain: string;
    };
  };
}

