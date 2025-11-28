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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { ResourcesService } from './resources.service';
import { CreateTimetablePeriodDto, CreateMasterScheduleDto } from './dto/create-timetable-period.dto';
import { TimetablePeriodDto } from './dto/timetable.dto';
import {
  ClassLevelDto,
  ClassArmDto,
  RoomDto,
  SubjectDto,
  CreateClassArmDto,
  CreateRoomDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignTeacherToSubjectDto,
} from './dto/resource.dto';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../common/guards/school-data-access.guard';

@ApiTags('timetable')
@Controller('schools/:schoolId/timetable')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly resourcesService: ResourcesService
  ) {}

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

  @Get('teacher/:teacherId')
  @ApiOperation({ summary: 'Get timetable for a teacher' })
  @ApiResponse({
    status: 200,
    description: 'Timetable retrieved successfully',
    type: [TimetablePeriodDto],
  })
  async getTimetableForTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Query('termId') termId: string
  ): Promise<ResponseDto<TimetablePeriodDto[]>> {
    const data = await this.timetableService.getTimetableForTeacher(schoolId, teacherId, termId);
    return ResponseDto.ok(data, 'Timetable retrieved successfully');
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Get timetable for a class' })
  @ApiResponse({
    status: 200,
    description: 'Timetable retrieved successfully',
    type: [TimetablePeriodDto],
  })
  async getTimetableForClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Query('termId') termId: string
  ): Promise<ResponseDto<TimetablePeriodDto[]>> {
    const data = await this.timetableService.getTimetableForClass(schoolId, classId, termId);
    return ResponseDto.ok(data, 'Timetable retrieved successfully');
  }

  @Get('timetables')
  @ApiOperation({ summary: 'Get all timetables for a school type (grouped by class)' })
  @ApiResponse({
    status: 200,
    description: 'Timetables retrieved successfully',
  })
  async getTimetablesForSchoolType(
    @Param('schoolId') schoolId: string,
    @Query('schoolType') schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY',
    @Query('termId') termId?: string
  ): Promise<ResponseDto<Record<string, TimetablePeriodDto[]>>> {
    const data = await this.timetableService.getTimetablesForSchoolType(schoolId, schoolType, termId);
    return ResponseDto.ok(data, 'Timetables retrieved successfully');
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

  @Delete('class/:classId')
  @ApiOperation({ summary: 'Delete all timetable periods for a class and term' })
  @ApiQuery({ name: 'termId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Timetable deleted successfully',
  })
  async deleteTimetableForClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Query('termId') termId: string
  ): Promise<ResponseDto<void>> {
    await this.timetableService.deleteTimetableForClass(schoolId, classId, termId);
    return ResponseDto.ok(undefined, 'Timetable deleted successfully');
  }

  // Resource endpoints (ClassArms, Subjects, Rooms)
  @Get('class-levels')
  @ApiOperation({ summary: 'Get all class levels for a school, optionally filtered by school type' })
  @ApiResponse({
    status: 200,
    description: 'Class levels retrieved successfully',
    type: [ClassLevelDto],
  })
  async getClassLevels(
    @Param('schoolId') schoolId: string,
    @Query('schoolType') schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): Promise<ResponseDto<ClassLevelDto[]>> {
    const data = await this.resourcesService.getClassLevels(schoolId, schoolType);
    return ResponseDto.ok(data, 'Class levels retrieved successfully');
  }

  @Get('class-arms')
  @ApiOperation({ summary: 'Get all class arms for a school, optionally filtered by school type' })
  @ApiResponse({
    status: 200,
    description: 'Class arms retrieved successfully',
    type: [ClassArmDto],
  })
  async getClassArms(
    @Param('schoolId') schoolId: string,
    @Query('classLevelId') classLevelId?: string,
    @Query('schoolType') schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): Promise<ResponseDto<ClassArmDto[]>> {
    const data = await this.resourcesService.getClassArms(schoolId, classLevelId, schoolType);
    return ResponseDto.ok(data, 'Class arms retrieved successfully');
  }

  @Post('class-arms')
  @ApiOperation({ summary: 'Create a new class arm' })
  @ApiResponse({
    status: 201,
    description: 'Class arm created successfully',
    type: ClassArmDto,
  })
  async createClassArm(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateClassArmDto
  ): Promise<ResponseDto<ClassArmDto>> {
    const data = await this.resourcesService.createClassArm(schoolId, dto);
    return ResponseDto.ok(data, 'Class arm created successfully');
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get all subjects for a school' })
  @ApiResponse({
    status: 200,
    description: 'Subjects retrieved successfully',
    type: [SubjectDto],
  })
  async getSubjects(
    @Param('schoolId') schoolId: string,
    @Query('schoolType') schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY',
    @Query('classLevelId') classLevelId?: string
  ): Promise<ResponseDto<SubjectDto[]>> {
    const data = await this.resourcesService.getSubjects(schoolId, schoolType, classLevelId);
    return ResponseDto.ok(data, 'Subjects retrieved successfully');
  }

  @Post('subjects')
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({
    status: 201,
    description: 'Subject created successfully',
    type: SubjectDto,
  })
  async createSubject(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateSubjectDto
  ): Promise<ResponseDto<SubjectDto>> {
    const data = await this.resourcesService.createSubject(schoolId, dto);
    return ResponseDto.ok(data, 'Subject created successfully');
  }

  @Patch('subjects/:subjectId')
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({
    status: 200,
    description: 'Subject updated successfully',
    type: SubjectDto,
  })
  async updateSubject(
    @Param('schoolId') schoolId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: UpdateSubjectDto
  ): Promise<ResponseDto<SubjectDto>> {
    const data = await this.resourcesService.updateSubject(schoolId, subjectId, dto);
    return ResponseDto.ok(data, 'Subject updated successfully');
  }

  @Delete('subjects/:subjectId')
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiResponse({
    status: 200,
    description: 'Subject deleted successfully',
  })
  async deleteSubject(
    @Param('schoolId') schoolId: string,
    @Param('subjectId') subjectId: string
  ): Promise<ResponseDto<void>> {
    await this.resourcesService.deleteSubject(schoolId, subjectId);
    return ResponseDto.ok(undefined, 'Subject deleted successfully');
  }

  @Post('subjects/:subjectId/teachers')
  @ApiOperation({ summary: 'Assign a teacher to a subject' })
  @ApiResponse({
    status: 200,
    description: 'Teacher assigned successfully',
    type: SubjectDto,
  })
  async assignTeacherToSubject(
    @Param('schoolId') schoolId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: AssignTeacherToSubjectDto
  ): Promise<ResponseDto<SubjectDto>> {
    const data = await this.resourcesService.assignTeacherToSubject(schoolId, subjectId, dto.teacherId);
    return ResponseDto.ok(data, 'Teacher assigned successfully');
  }

  @Delete('subjects/:subjectId/teachers/:teacherId')
  @ApiOperation({ summary: 'Remove a teacher from a subject' })
  @ApiResponse({
    status: 200,
    description: 'Teacher removed successfully',
    type: SubjectDto,
  })
  async removeTeacherFromSubject(
    @Param('schoolId') schoolId: string,
    @Param('subjectId') subjectId: string,
    @Param('teacherId') teacherId: string
  ): Promise<ResponseDto<SubjectDto>> {
    const data = await this.resourcesService.removeTeacherFromSubject(schoolId, subjectId, teacherId);
    return ResponseDto.ok(data, 'Teacher removed successfully');
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get all rooms for a school' })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
    type: [RoomDto],
  })
  async getRooms(
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<RoomDto[]>> {
    const data = await this.resourcesService.getRooms(schoolId);
    return ResponseDto.ok(data, 'Rooms retrieved successfully');
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    type: RoomDto,
  })
  async createRoom(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateRoomDto
  ): Promise<ResponseDto<RoomDto>> {
    const data = await this.resourcesService.createRoom(schoolId, dto);
    return ResponseDto.ok(data, 'Room created successfully');
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses for a school (for TERTIARY schools)' })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  async getCourses(
    @Param('schoolId') schoolId: string,
    @Query('schoolType') schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): Promise<ResponseDto<any[]>> {
    const data = await this.resourcesService.getCourses(schoolId, schoolType);
    return ResponseDto.ok(data, 'Courses retrieved successfully');
  }
}

