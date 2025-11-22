import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetablePeriodDto, CreateMasterScheduleDto } from './dto/create-timetable-period.dto';
import { TimetablePeriodDto } from './dto/timetable.dto';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../common/guards/school-data-access.guard';

@ApiTags('timetable')
@Controller('schools/:schoolId/timetable')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('periods')
  @ApiOperation({ summary: 'Create a timetable period with conflict detection' })
  @ApiResponse({
    status: 201,
    description: 'Period created successfully',
    type: TimetablePeriodDto,
  })
  @ApiResponse({ status: 409, description: 'Conflict detected (teacher or room already booked)' })
  async createPeriod(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateTimetablePeriodDto
  ): Promise<ResponseDto<TimetablePeriodDto>> {
    const data = await this.timetableService.createPeriod(schoolId, dto);
    return ResponseDto.ok(data, 'Period created successfully');
  }

  @Post('master-schedule')
  @ApiOperation({ summary: 'Create master schedule (empty slots for all class arms)' })
  @ApiResponse({
    status: 201,
    description: 'Master schedule created successfully',
  })
  async createMasterSchedule(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateMasterScheduleDto
  ): Promise<ResponseDto<{ created: number; skipped: number }>> {
    const data = await this.timetableService.createMasterSchedule(schoolId, dto);
    return ResponseDto.ok(data, 'Master schedule created successfully');
  }

  @Get('class-arm/:classArmId')
  @ApiOperation({ summary: 'Get timetable for a class arm' })
  @ApiResponse({
    status: 200,
    description: 'Timetable retrieved successfully',
    type: [TimetablePeriodDto],
  })
  async getTimetableForClassArm(
    @Param('schoolId') schoolId: string,
    @Param('classArmId') classArmId: string,
    @Query('termId') termId: string
  ): Promise<ResponseDto<TimetablePeriodDto[]>> {
    const data = await this.timetableService.getTimetableForClassArm(schoolId, classArmId, termId);
    return ResponseDto.ok(data, 'Timetable retrieved successfully');
  }

  @Patch('periods/:periodId')
  @ApiOperation({ summary: 'Update a timetable period' })
  @ApiResponse({
    status: 200,
    description: 'Period updated successfully',
    type: TimetablePeriodDto,
  })
  @ApiResponse({ status: 409, description: 'Conflict detected' })
  async updatePeriod(
    @Param('schoolId') schoolId: string,
    @Param('periodId') periodId: string,
    @Body() dto: Partial<CreateTimetablePeriodDto>
  ): Promise<ResponseDto<TimetablePeriodDto>> {
    const data = await this.timetableService.updatePeriod(schoolId, periodId, dto);
    return ResponseDto.ok(data, 'Period updated successfully');
  }

  @Delete('periods/:periodId')
  @ApiOperation({ summary: 'Delete a timetable period' })
  @ApiResponse({
    status: 200,
    description: 'Period deleted successfully',
  })
  async deletePeriod(
    @Param('schoolId') schoolId: string,
    @Param('periodId') periodId: string
  ): Promise<ResponseDto<void>> {
    await this.timetableService.deletePeriod(schoolId, periodId);
    return ResponseDto.ok(undefined, 'Period deleted successfully');
  }
}

