import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCurriculumItemDto {
  @ApiProperty({ example: 1, description: 'Week number' })
  @IsInt()
  @Min(1)
  week: number;

  @ApiProperty({ example: 'Introduction to Algebra', description: 'Topic title' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({ 
    example: ['Understand basic algebraic concepts', 'Solve simple equations'], 
    description: 'Learning objectives',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  objectives: string[];

  @ApiProperty({ 
    example: ['Textbook Chapter 1', 'Worksheet 1'], 
    description: 'Resource names/links',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  resources: string[];

  @ApiPropertyOptional({ example: 0, description: 'Display order' })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateCurriculumDto {
  @ApiProperty({ example: 'clx1234567890', description: 'Class ID' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({ example: 'Mathematics', description: 'Subject (required for secondary schools)' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: '2024/2025', description: 'Academic year' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ example: 'clx1234567890', description: 'Term ID (optional)' })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({ 
    description: 'Curriculum items',
    type: [CreateCurriculumItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCurriculumItemDto)
  items: CreateCurriculumItemDto[];
}

