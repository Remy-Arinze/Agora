import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admins/admin.service';
import { TeacherService } from './teachers/teacher.service';
import { AddAdminDto } from '../dto/add-admin.dto';
import { AddTeacherDto } from '../dto/add-teacher.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { UpdatePrincipalDto } from '../dto/update-principal.dto';
import { ConvertTeacherToAdminDto } from '../dto/convert-teacher-to-admin.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../../common/guards/school-data-access.guard';

@ApiTags('schools')
@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(
    private readonly adminService: AdminService,
    private readonly teacherService: TeacherService
  ) {}

  // Admin endpoints
  @Post('admins')
  @ApiOperation({ summary: 'Add an administrator to a school' })
  @ApiResponse({
    status: 201,
    description: 'Administrator added successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'User with email or phone already exists' })
  async addAdmin(
    @Param('schoolId') schoolId: string,
    @Body() addAdminDto: AddAdminDto
  ): Promise<ResponseDto<any>> {
    const data = await this.adminService.addAdmin(schoolId, addAdminDto);
    return ResponseDto.ok(data, 'Administrator added successfully');
  }

  @Patch('admins/:adminId')
  @ApiOperation({ summary: 'Update an administrator in a school' })
  @ApiResponse({
    status: 200,
    description: 'Administrator updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School or administrator not found' })
  async updateAdmin(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string,
    @Body() updateAdminDto: UpdateAdminDto
  ): Promise<ResponseDto<any>> {
    const data = await this.adminService.updateAdmin(schoolId, adminId, updateAdminDto);
    return ResponseDto.ok(data, 'Administrator updated successfully');
  }

  @Delete('admins/:adminId')
  @ApiOperation({ summary: 'Delete an administrator from a school' })
  @ApiResponse({
    status: 200,
    description: 'Administrator deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'School or administrator not found' })
  async deleteAdmin(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string
  ): Promise<ResponseDto<void>> {
    await this.adminService.deleteAdmin(schoolId, adminId);
    return ResponseDto.ok(undefined, 'Administrator deleted successfully');
  }

  // Teacher endpoints
  @Post('teachers')
  @ApiOperation({ summary: 'Add a teacher to a school' })
  @ApiResponse({
    status: 201,
    description: 'Teacher added successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'User with email or phone already exists' })
  async addTeacher(
    @Param('schoolId') schoolId: string,
    @Body() addTeacherDto: AddTeacherDto
  ): Promise<ResponseDto<any>> {
    const data = await this.teacherService.addTeacher(schoolId, addTeacherDto);
    return ResponseDto.ok(data, 'Teacher added successfully');
  }

  @Patch('teachers/:teacherId')
  @ApiOperation({ summary: 'Update a teacher in a school' })
  @ApiResponse({
    status: 200,
    description: 'Teacher updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School or teacher not found' })
  async updateTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Body() updateTeacherDto: UpdateTeacherDto
  ): Promise<ResponseDto<any>> {
    const data = await this.teacherService.updateTeacher(schoolId, teacherId, updateTeacherDto);
    return ResponseDto.ok(data, 'Teacher updated successfully');
  }

  @Delete('teachers/:teacherId')
  @ApiOperation({ summary: 'Delete a teacher from a school' })
  @ApiResponse({
    status: 200,
    description: 'Teacher deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'School or teacher not found' })
  async deleteTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string
  ): Promise<ResponseDto<void>> {
    await this.teacherService.deleteTeacher(schoolId, teacherId);
    return ResponseDto.ok(undefined, 'Teacher deleted successfully');
  }

  // Principal endpoints
  @Patch('admins/:adminId/make-principal')
  @ApiOperation({ summary: 'Make an admin the principal (switches current principal to admin)' })
  @ApiResponse({
    status: 200,
    description: 'Admin successfully made principal',
  })
  @ApiResponse({ status: 404, description: 'School or admin not found' })
  @ApiResponse({
    status: 400,
    description: 'Admin is already principal or invalid request',
  })
  async makePrincipal(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string
  ): Promise<ResponseDto<void>> {
    await this.adminService.makePrincipal(schoolId, adminId);
    return ResponseDto.ok(undefined, 'Administrator successfully made principal');
  }

  @Patch('principal/:principalId')
  @ApiOperation({ summary: 'Update a principal in a school' })
  @ApiResponse({
    status: 200,
    description: 'Principal updated successfully',
  })
  @ApiResponse({ status: 404, description: 'School or principal not found' })
  async updatePrincipal(
    @Param('schoolId') schoolId: string,
    @Param('principalId') principalId: string,
    @Body() updatePrincipalDto: UpdatePrincipalDto
  ): Promise<ResponseDto<any>> {
    const data = await this.adminService.updatePrincipal(schoolId, principalId, updatePrincipalDto);
    return ResponseDto.ok(data, 'Principal updated successfully');
  }

  @Delete('principal/:principalId')
  @ApiOperation({ summary: 'Delete a principal from a school' })
  @ApiResponse({
    status: 200,
    description: 'Principal deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'School or principal not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete principal without another administrator to assign the role to',
  })
  async deletePrincipal(
    @Param('schoolId') schoolId: string,
    @Param('principalId') principalId: string
  ): Promise<ResponseDto<void>> {
    await this.adminService.deletePrincipal(schoolId, principalId);
    return ResponseDto.ok(undefined, 'Principal deleted successfully');
  }

  // Convert teacher to admin
  @Patch('teachers/:teacherId/convert-to-admin')
  @ApiOperation({ summary: 'Convert a teacher to an admin (optionally keep teacher role)' })
  @ApiResponse({
    status: 200,
    description: 'Teacher successfully converted to admin',
  })
  @ApiResponse({ status: 404, description: 'School or teacher not found' })
  @ApiResponse({
    status: 400,
    description: 'Teacher is already an admin or invalid request',
  })
  async convertTeacherToAdmin(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Body() dto: ConvertTeacherToAdminDto
  ): Promise<ResponseDto<void>> {
    await this.adminService.convertTeacherToAdmin(schoolId, teacherId, dto.role, dto.keepAsTeacher);
    return ResponseDto.ok(undefined, 'Teacher successfully converted to administrator');
  }
}

