import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserWithContext } from '../../../auth/types/user-with-context.type';
import { ResponseDto } from '../../../common/dto/response.dto';
import { TeacherCurrentSchoolService } from './teacher-current-school.service';

@ApiTags('teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeacherController {
  constructor(private readonly teacherCurrentSchoolService: TeacherCurrentSchoolService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current teacher profile' })
  @ApiResponse({
    status: 200,
    description: 'Teacher profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Teacher profile not found' })
  async getMyProfile(@CurrentUser() user: UserWithContext): Promise<ResponseDto<any>> {
    const data = await this.teacherCurrentSchoolService.getMyProfile(user);
    return ResponseDto.ok(data, 'Teacher profile retrieved successfully');
  }

  @Get('me/school')
  @ApiOperation({ summary: 'Get teacher\'s current school' })
  @ApiResponse({
    status: 200,
    description: 'School information retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async getMySchool(@CurrentUser() user: UserWithContext): Promise<ResponseDto<any>> {
    const data = await this.teacherCurrentSchoolService.getMySchool(user);
    return ResponseDto.ok(data, 'School information retrieved successfully');
  }
}

