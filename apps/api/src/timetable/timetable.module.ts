import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [DatabaseModule, SchoolsModule],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}

