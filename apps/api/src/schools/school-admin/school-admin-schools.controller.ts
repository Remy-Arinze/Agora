import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchoolAdminSchoolsService } from './school-admin-schools.service';
import { SchoolDto } from '../dto/school.dto';
import { SchoolDashboardDto } from '../dto/dashboard.dto';
import { StaffListResponseDto } from '../dto/staff-list.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../../common/guards/school-data-access.guard';

@ApiTags('school-admin')
@Controller('school-admin')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class SchoolAdminSchoolsController {
  constructor(private readonly schoolAdminSchoolsService: SchoolAdminSchoolsService) {}

  @Get('school')
  @ApiOperation({ summary: 'Get my school information' })
  @ApiResponse({
    status: 200,
    description: 'School information retrieved successfully',
    type: ResponseDto<SchoolDto>,
  })
  async getMySchool(@Request() req: any): Promise<ResponseDto<SchoolDto>> {
    const data = await this.schoolAdminSchoolsService.getMySchool(req.user);
    return ResponseDto.ok(data, 'School information retrieved successfully');
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get school dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: ResponseDto<SchoolDashboardDto>,
  })
  async getDashboard(@Request() req: any): Promise<ResponseDto<SchoolDashboardDto>> {
    const data = await this.schoolAdminSchoolsService.getDashboard(req.user);
    return ResponseDto.ok(data, 'Dashboard data retrieved successfully');
  }

  @Get('staff')
  @ApiOperation({ summary: 'Get paginated staff list with search and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search query (name, email, subject)' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
    type: ResponseDto<StaffListResponseDto>,
  })
  async getStaffList(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ): Promise<ResponseDto<StaffListResponseDto>> {
    const query = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      role,
    };
    const data = await this.schoolAdminSchoolsService.getStaffList(req.user, query);
    return ResponseDto.ok(data, 'Staff list retrieved successfully');
  }
}

