import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { SchoolRepository } from '../domain/repositories/school.repository';
import { StaffRepository } from '../domain/repositories/staff.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CurriculumController],
  providers: [CurriculumService, SchoolRepository, StaffRepository],
  exports: [CurriculumService],
})
export class CurriculumModule {}

