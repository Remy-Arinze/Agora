import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, PeriodType } from '@prisma/client';

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
  teacherId?: string;

  @ApiProperty({ required: false })
  teacherName?: string;

  @ApiProperty({ required: false })
  roomId?: string;

  @ApiProperty({ required: false })
  roomName?: string;

  @ApiProperty()
  classArmId: string;

  @ApiProperty()
  classArmName: string;

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

