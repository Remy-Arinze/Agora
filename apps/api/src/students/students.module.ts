import { Module, forwardRef } from '@nestjs/common';
import { StudentsController, SchoolStudentAdmissionController } from './students.controller';
import { StudentMeController } from './student-me.controller';
import { StudentsService } from './students.service';
import { StudentAdmissionService } from './student-admission.service';
import { DatabaseModule } from '../database/database.module';
import { SchoolsModule } from '../schools/schools.module';
import { AuthModule } from '../auth/auth.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { TimetableModule } from '../timetable/timetable.module';
import { GradesModule } from '../grades/grades.module';
import { EventsModule } from '../events/events.module';
import { CloudinaryModule } from '../storage/cloudinary/cloudinary.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SchoolsModule),
    forwardRef(() => AuthModule),
    forwardRef(() => OnboardingModule),
    forwardRef(() => TimetableModule),
    forwardRef(() => GradesModule),
    forwardRef(() => EventsModule),
    CloudinaryModule,
  ],
  controllers: [StudentMeController, StudentsController, SchoolStudentAdmissionController],
  providers: [StudentsService, StudentAdmissionService],
  exports: [StudentsService, StudentAdmissionService],
})
export class StudentsModule {}

