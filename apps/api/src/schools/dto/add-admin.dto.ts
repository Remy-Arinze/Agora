import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';
import { AdminRole } from './create-school.dto';

export class AddAdminDto {
  @ApiProperty({ description: 'Admin first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Admin last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Admin email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ 
    description: 'Admin role (can be enum value or custom role string like "Bursar", "Vice Principal", etc.)',
    example: 'BURSAR or "Dean of Students"'
  })
  @IsString()
  role: string; // Changed to string to accept custom roles
}

