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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { CurriculumDto } from './dto/curriculum.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SchoolDataAccessGuard } from '../../common/guards/school-data-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserWithContext } from '../../auth/types/user-with-context.type';

@ApiTags('schools')
@Controller('schools/:schoolId/curriculum')
@UseGuards(JwtAuthGuard, SchoolDataAccessGuard)
@ApiBearerAuth()
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new curriculum' })
  @ApiParam({ name: 'schoolId', description: 'School ID' })
  @ApiResponse({
    status: 201,
    description: 'Curriculum created successfully',
    type: CurriculumDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Teacher not assigned to class' })
  async createCurriculum(
    @Param('schoolId') schoolId: string,
    @Body() createDto: CreateCurriculumDto,
    @CurrentUser() user: UserWithContext
  ): Promise<ResponseDto<CurriculumDto>> {
    const data = await this.curriculumService.createCurriculum(schoolId, createDto, user);
    return ResponseDto.ok(data, 'Curriculum created successfully');
  }

  @Get('classes/:classId')
  @ApiOperation({ summary: 'Get curriculum for a class' })
  @ApiParam({ name: 'schoolId', description: 'School ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'subject', required: false, description: 'Subject (for secondary schools)' })
  @ApiQuery({ name: 'academicYear', required: false, description: 'Academic year' })
  @ApiQuery({ name: 'termId', required: false, description: 'Term ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum retrieved successfully',
    type: CurriculumDto,
  })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async getCurriculumForClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Query('subject') subject?: string,
    @Query('academicYear') academicYear?: string,
    @Query('termId') termId?: string,
    @CurrentUser() user?: UserWithContext
  ): Promise<ResponseDto<CurriculumDto | null>> {
    const data = await this.curriculumService.getCurriculumForClass(
      schoolId,
      classId,
      subject,
      academicYear,
      termId,
      user
    );
    return ResponseDto.ok(data, 'Curriculum retrieved successfully');
  }

  @Patch(':curriculumId')
  @ApiOperation({ summary: 'Update curriculum' })
  @ApiParam({ name: 'schoolId', description: 'School ID' })
  @ApiParam({ name: 'curriculumId', description: 'Curriculum ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum updated successfully',
    type: CurriculumDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not curriculum owner' })
  async updateCurriculum(
    @Param('schoolId') schoolId: string,
    @Param('curriculumId') curriculumId: string,
    @Body() updateDto: Partial<CreateCurriculumDto>,
    @CurrentUser() user: UserWithContext
  ): Promise<ResponseDto<CurriculumDto>> {
    const data = await this.curriculumService.updateCurriculum(schoolId, curriculumId, updateDto, user);
    return ResponseDto.ok(data, 'Curriculum updated successfully');
  }

  @Delete(':curriculumId')
  @ApiOperation({ summary: 'Delete curriculum' })
  @ApiParam({ name: 'schoolId', description: 'School ID' })
  @ApiParam({ name: 'curriculumId', description: 'Curriculum ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not curriculum owner' })
  async deleteCurriculum(
    @Param('schoolId') schoolId: string,
    @Param('curriculumId') curriculumId: string,
    @CurrentUser() user: UserWithContext
  ): Promise<ResponseDto<void>> {
    await this.curriculumService.deleteCurriculum(schoolId, curriculumId, user);
    return ResponseDto.ok(undefined, 'Curriculum deleted successfully');
  }
}

