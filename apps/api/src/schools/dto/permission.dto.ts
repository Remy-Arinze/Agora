import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsArray, IsString, IsOptional } from 'class-validator';

export enum PermissionResource {
  OVERVIEW = 'OVERVIEW',
  ANALYTICS = 'ANALYTICS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  STUDENTS = 'STUDENTS',
  STAFF = 'STAFF',
  CLASSES = 'CLASSES',
  SUBJECTS = 'SUBJECTS',
  TIMETABLES = 'TIMETABLES',
  CALENDAR = 'CALENDAR',
  ADMISSIONS = 'ADMISSIONS',
  SESSIONS = 'SESSIONS',
  EVENTS = 'EVENTS',
}

export enum PermissionType {
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
}

export class PermissionDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ enum: PermissionResource, description: 'Resource area' })
  resource: PermissionResource;

  @ApiProperty({ enum: PermissionType, description: 'Permission type' })
  type: PermissionType;

  @ApiPropertyOptional({ description: 'Permission description' })
  description?: string;
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign',
    type: [String],
    example: ['perm1', 'perm2'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

export class StaffPermissionsDto {
  @ApiProperty({ description: 'Admin ID' })
  adminId: string;

  @ApiProperty({ description: 'Admin name' })
  adminName: string;

  @ApiProperty({ description: 'Admin role' })
  role: string;

  @ApiProperty({ type: [PermissionDto], description: 'Assigned permissions' })
  permissions: PermissionDto[];
}

