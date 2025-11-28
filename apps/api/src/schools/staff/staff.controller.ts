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
import { AssignPermissionsDto } from '../dto/permission.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../../common/guards/school-data-access.guard';
import { PermissionService } from './permissions/permission.service';
import { NotFoundException, UseInterceptors, UploadedFile, Post as PostDecorator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes } from '@nestjs/swagger';
import { StaffImportService } from './staff-import.service';
import { AuthService } from '../../auth/auth.service';
import { StaffImportSummaryDto } from '../dto/staff-bulk-import.dto';

@ApiTags('schools')
@Controller('schools/:schoolId')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(
    private readonly adminService: AdminService,
    private readonly teacherService: TeacherService,
    private readonly permissionService: PermissionService,
    private readonly staffImportService: StaffImportService,
    private readonly authService: AuthService
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

  @PostDecorator('admins/:adminId/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  @ApiOperation({ summary: 'Upload admin profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({ status: 404, description: 'School or admin not found' })
  async uploadAdminImage(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<ResponseDto<any>> {
    const data = await this.adminService.uploadProfileImage(schoolId, adminId, file);
    return ResponseDto.ok(data, 'Image uploaded successfully');
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

  @PostDecorator('teachers/:teacherId/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  @ApiOperation({ summary: 'Upload teacher profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({ status: 404, description: 'School or teacher not found' })
  async uploadTeacherImage(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<ResponseDto<any>> {
    const data = await this.teacherService.uploadProfileImage(schoolId, teacherId, file);
    return ResponseDto.ok(data, 'Image uploaded successfully');
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

  // Permission endpoints
  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of all available permissions',
  })
  async getAllPermissions(): Promise<ResponseDto<any[]>> {
    const data = await this.permissionService.getAllPermissions();
    return ResponseDto.ok(data, 'Permissions retrieved successfully');
  }

  @Get('admins/:adminId/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific admin' })
  @ApiResponse({
    status: 200,
    description: 'Admin permissions retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async getAdminPermissions(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string
  ): Promise<ResponseDto<any>> {
    const data = await this.permissionService.getAdminPermissions(schoolId, adminId);
    return ResponseDto.ok(data, 'Admin permissions retrieved successfully');
  }

  @Post('admins/:adminId/permissions')
  @ApiOperation({ summary: 'Assign permissions to an admin' })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs' })
  async assignPermissions(
    @Param('schoolId') schoolId: string,
    @Param('adminId') adminId: string,
    @Body() dto: AssignPermissionsDto
  ): Promise<ResponseDto<any>> {
    const data = await this.permissionService.assignPermissions(schoolId, adminId, dto.permissionIds);
    return ResponseDto.ok(data, 'Permissions assigned successfully');
  }

  // Get single staff member (teacher or admin)
  @Get('staff/:staffId')
  @ApiOperation({ summary: 'Get a single staff member by ID (teacher or admin)' })
  @ApiResponse({
    status: 200,
    description: 'Staff member retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async getStaffMember(
    @Param('schoolId') schoolId: string,
    @Param('staffId') staffId: string
  ): Promise<ResponseDto<any>> {
    // Try to find as admin first
    const admin = await this.adminService.getAdminById(schoolId, staffId);
    if (admin) {
      return ResponseDto.ok({ ...admin, type: 'admin' }, 'Staff member retrieved successfully');
    }

    // Try to find as teacher
    const teacher = await this.teacherService.getTeacherById(schoolId, staffId);
    if (teacher) {
      return ResponseDto.ok({ ...teacher, type: 'teacher' }, 'Staff member retrieved successfully');
    }

    throw new NotFoundException('Staff member not found');
  }

  // Bulk import staff
  @Post('staff/bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Bulk import staff from CSV/Excel file',
    description: 'Upload a CSV or Excel file to import multiple staff members (teachers and admins) at once. Each row must specify type as "teacher" or "admin".'
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk import completed',
    type: ResponseDto<StaffImportSummaryDto>,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or missing required fields' })
  async bulkImportStaff(
    @Param('schoolId') schoolId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<ResponseDto<StaffImportSummaryDto>> {
    const data = await this.staffImportService.bulkImportStaff(schoolId, file);
    return ResponseDto.ok(data, 'Bulk import completed');
  }

  // Resend password reset email for staff
  @Post('staff/:staffId/resend-password-reset')
  @ApiOperation({ summary: 'Resend password reset email for a staff member' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email resent successfully',
  })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  @ApiResponse({ status: 400, description: 'Staff member does not have an email address' })
  async resendPasswordResetForStaff(
    @Param('schoolId') schoolId: string,
    @Param('staffId') staffId: string
  ): Promise<ResponseDto<void>> {
    // Get staff member to find userId
    const admin = await this.adminService.getAdminById(schoolId, staffId);
    let userId: string | undefined;

    if (admin) {
      userId = admin.userId;
    } else {
      const teacher = await this.teacherService.getTeacherById(schoolId, staffId);
      if (teacher) {
        userId = teacher.userId;
      } else {
        throw new NotFoundException('Staff member not found');
      }
    }

    if (!userId) {
      throw new NotFoundException('User ID not found for staff member');
    }

    await this.authService.resendPasswordResetEmail(userId, schoolId);
    return ResponseDto.ok(null, 'Password reset email resent successfully');
  }
}

