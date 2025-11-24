import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { InitializeSessionDto, CreateTermDto, MigrateStudentsDto } from './dto/initialize-session.dto';
import { AcademicSessionDto, TermDto, ActiveSessionDto } from './dto/session.dto';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../common/guards/school-data-access.guard';

@ApiTags('sessions')
@Controller('schools/:schoolId/sessions')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize a new academic session' })
  @ApiResponse({
    status: 201,
    description: 'Session initialized successfully',
    type: AcademicSessionDto,
  })
  async initializeSession(
    @Param('schoolId') schoolId: string,
    @Body() dto: InitializeSessionDto
  ): Promise<ResponseDto<AcademicSessionDto>> {
    const data = await this.sessionService.initializeSession(schoolId, dto);
    return ResponseDto.ok(data, 'Session initialized successfully');
  }

  @Post(':sessionId/terms')
  @ApiOperation({ summary: 'Create a term for an academic session' })
  @ApiResponse({
    status: 201,
    description: 'Term created successfully',
    type: TermDto,
  })
  async createTerm(
    @Param('schoolId') schoolId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateTermDto
  ): Promise<ResponseDto<TermDto>> {
    const data = await this.sessionService.createTerm(schoolId, sessionId, dto);
    return ResponseDto.ok(data, 'Term created successfully');
  }

  @Post('start-term')
  @ApiOperation({ summary: 'Start a new term (wizard endpoint - handles promotion/carry-over)' })
  @ApiResponse({
    status: 201,
    description: 'Term started successfully',
  })
  async startNewTerm(
    @Param('schoolId') schoolId: string,
    @Body() dto: InitializeSessionDto & { termId?: string }
  ): Promise<ResponseDto<{ session: AcademicSessionDto; term: TermDto; migratedCount: number }>> {
    const data = await this.sessionService.startNewTerm(schoolId, dto);
    return ResponseDto.ok(data, 'Term started successfully');
  }

  @Post('migrate-students')
  @ApiOperation({ summary: 'Migrate students (promote or carry over)' })
  @ApiResponse({
    status: 200,
    description: 'Students migrated successfully',
  })
  async migrateStudents(
    @Param('schoolId') schoolId: string,
    @Body() dto: MigrateStudentsDto
  ): Promise<ResponseDto<{ migratedCount: number }>> {
    const data = await this.sessionService.migrateStudents(schoolId, dto);
    return ResponseDto.ok(data, 'Students migrated successfully');
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active session and term for the school' })
  @ApiResponse({
    status: 200,
    description: 'Active session retrieved successfully',
    type: ActiveSessionDto,
  })
  async getActiveSession(
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<ActiveSessionDto>> {
    const data = await this.sessionService.getActiveSession(schoolId);
    return ResponseDto.ok(data, 'Active session retrieved successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions for a school' })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: [AcademicSessionDto],
  })
  async getSessions(
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<AcademicSessionDto[]>> {
    const data = await this.sessionService.getSessions(schoolId);
    return ResponseDto.ok(data, 'Sessions retrieved successfully');
  }

  @Post('end-term')
  @ApiOperation({ summary: 'End the current active term' })
  @ApiResponse({
    status: 200,
    description: 'Term ended successfully',
  })
  async endTerm(
    @Param('schoolId') schoolId: string
  ): Promise<ResponseDto<{ term: TermDto }>> {
    const data = await this.sessionService.endTerm(schoolId);
    return ResponseDto.ok(data, 'Term ended successfully');
  }
}

