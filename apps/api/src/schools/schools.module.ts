import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

// Legacy controller and service - DEPRECATED: Will be removed after migration verification
// import { SchoolsController } from './schools.controller';
// import { SchoolsService } from './schools.service';

// Super Admin
import { SuperAdminSchoolsController } from './super-admin/super-admin-schools.controller';
import { SuperAdminSchoolsService } from './super-admin/super-admin-schools.service';

// School Admin
import { SchoolAdminSchoolsController } from './school-admin/school-admin-schools.controller';
import { SchoolAdminSchoolsService } from './school-admin/school-admin-schools.service';

// Staff
import { StaffController } from './staff/staff.controller';
import { AdminService } from './staff/admins/admin.service';
import { TeacherService } from './staff/teachers/teacher.service';

// Classes
import { ClassController } from './classes/class.controller';
import { ClassService } from './classes/class.service';

// Repositories
import { SchoolRepository } from './domain/repositories/school.repository';
import { StaffRepository } from './domain/repositories/staff.repository';
import { SchoolScopedRepository } from './domain/repositories/school-scoped.repository';

// Mappers
import { SchoolMapper } from './domain/mappers/school.mapper';
import { StaffMapper } from './domain/mappers/staff.mapper';

// Shared Services
import { IdGeneratorService } from './shared/id-generator.service';
import { SchoolValidatorService } from './shared/school-validator.service';
import { StaffValidatorService } from './shared/staff-validator.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule), EmailModule],
  controllers: [
    // New architecture controllers
    SuperAdminSchoolsController,
    SchoolAdminSchoolsController,
    StaffController,
    ClassController,
    // Legacy controller - DEPRECATED: Commented out, remove after verification
    // SchoolsController,
  ],
  providers: [
    // New architecture services
    SuperAdminSchoolsService,
    SchoolAdminSchoolsService,
    AdminService,
    TeacherService,
    ClassService,
    // Repositories
    SchoolRepository,
    StaffRepository,
    SchoolScopedRepository,
    // Mappers
    SchoolMapper,
    StaffMapper,
    // Shared services
    IdGeneratorService,
    SchoolValidatorService,
    StaffValidatorService,
  ],
  exports: [
    // Export services for use in other modules
    // SchoolsService, // DEPRECATED: Remove after migration verification
    SuperAdminSchoolsService,
    SchoolAdminSchoolsService,
    AdminService,
    TeacherService,
    ClassService,
    SchoolRepository,
    StaffRepository,
    SchoolScopedRepository,
    SchoolMapper,
    StaffMapper,
    IdGeneratorService,
    SchoolValidatorService,
    StaffValidatorService,
  ],
})
export class SchoolsModule {}
