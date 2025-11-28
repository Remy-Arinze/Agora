import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class ClassLevelDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty()
  level: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  nextLevelId?: string;
}

export class ClassArmDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty()
  classLevelId: string;

  @ApiProperty()
  classLevelName: string;

  @ApiProperty()
  isActive: boolean;
}

export class RoomDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  roomType?: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  isActive: boolean;
}

export class SubjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty({ required: false })
  schoolType?: string;

  @ApiProperty({ required: false })
  classLevelId?: string;

  @ApiProperty({ required: false })
  classLevelName?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  teachers?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

export class CreateClassArmDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty()
  classLevelId: string;
}

export class CreateRoomDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  roomType?: string;
}

export class CreateSubjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ required: false, enum: ['PRIMARY', 'SECONDARY', 'TERTIARY'] })
  @IsEnum(['PRIMARY', 'SECONDARY', 'TERTIARY'])
  @IsOptional()
  schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  classLevelId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSubjectDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ required: false, enum: ['PRIMARY', 'SECONDARY', 'TERTIARY'] })
  @IsEnum(['PRIMARY', 'SECONDARY', 'TERTIARY'])
  @IsOptional()
  schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  classLevelId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}

export class AssignTeacherToSubjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;
}

