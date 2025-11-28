import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, PeriodType } from './create-timetable-period.dto';

export class TimetablePeriodDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ enum: PeriodType })
  type: PeriodType;

  @ApiProperty({ required: false })
  subjectId?: string;

  @ApiProperty({ required: false })
  subjectName?: string;

  @ApiProperty({ required: false })
  courseId?: string;

  @ApiProperty({ required: false })
  courseName?: string;

  @ApiProperty({ required: false })
  teacherId?: string;

  @ApiProperty({ required: false })
  teacherName?: string;

  @ApiProperty({ required: false })
  roomId?: string;

  @ApiProperty({ required: false })
  roomName?: string;

  @ApiProperty({ required: false })
  classId?: string;

  @ApiProperty({ required: false })
  className?: string;

  @ApiProperty({ required: false })
  classArmId?: string;

  @ApiProperty({ required: false })
  classArmName?: string;

  @ApiProperty()
  termId: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConflictInfo {
  @ApiProperty()
  type: 'TEACHER' | 'ROOM';

  @ApiProperty()
  message: string;

  @ApiProperty()
  conflictingPeriodId?: string;
}

