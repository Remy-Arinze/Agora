import { ApiProperty } from '@nestjs/swagger';

export class ClassLevelDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty()
  level: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  nextLevelId?: string;
}

export class ClassArmDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty()
  classLevelId: string;

  @ApiProperty()
  classLevelName: string;

  @ApiProperty()
  isActive: boolean;
}

export class RoomDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  roomType?: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  isActive: boolean;
}

export class SubjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  isActive: boolean;
}

export class CreateClassArmDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty()
  classLevelId: string;
}

export class CreateRoomDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  roomType?: string;
}

export class CreateSubjectDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;
}

