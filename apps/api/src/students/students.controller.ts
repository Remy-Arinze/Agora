import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { StudentsService } from './students.service';
import { StudentDto, StudentWithEnrollmentDto } from './dto/student.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { ResponseDto } from '../common/dto/response.dto';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth('JWT-auth')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of students' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of students',
    type: ResponseDto<PaginatedResponseDto<StudentDto>>,
  })
  async findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationDto
  ): Promise<ResponseDto<PaginatedResponseDto<StudentDto>>> {
    const data = await this.studentsService.findAll(tenantId, pagination);
    return ResponseDto.ok(data, 'Students retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID', example: 'clx1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Student details',
    type: ResponseDto<StudentWithEnrollmentDto>,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<ResponseDto<StudentWithEnrollmentDto>> {
    const data = await this.studentsService.findOne(tenantId, id);
    return ResponseDto.ok(data, 'Student retrieved successfully');
  }

  @Get('uid/:uid')
  @ApiOperation({ summary: 'Get student by Universal ID (UID)' })
  @ApiParam({
    name: 'uid',
    description: 'Universal ID',
    example: 'AGO-2025-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Student details',
    type: ResponseDto<StudentWithEnrollmentDto>,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findByUid(
    @TenantId() tenantId: string,
    @Param('uid') uid: string
  ): Promise<ResponseDto<StudentWithEnrollmentDto>> {
    const data = await this.studentsService.findByUid(tenantId, uid);
    return ResponseDto.ok(data, 'Student retrieved successfully');
  }
}

