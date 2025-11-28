import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CurriculumItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  curriculumId: string;

  @ApiProperty()
  week: number;

  @ApiProperty()
  topic: string;

  @ApiProperty({ type: [String] })
  objectives: string[];

  @ApiProperty({ type: [String] })
  resources: string[];

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CurriculumDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  classId: string;

  @ApiPropertyOptional()
  subject: string | null;

  @ApiProperty()
  teacherId: string;

  @ApiProperty()
  academicYear: string;

  @ApiPropertyOptional()
  termId: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [CurriculumItemDto] })
  items: CurriculumItemDto[];
}

