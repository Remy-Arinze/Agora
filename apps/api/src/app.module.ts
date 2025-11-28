import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { StudentsModule } from './students/students.module';
import { SchoolsModule } from './schools/schools.module';
import { TransfersModule } from './transfers/transfers.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailModule } from './email/email.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { SessionsModule } from './sessions/sessions.module';
import { TimetableModule } from './timetable/timetable.module';
import { EventsModule } from './events/events.module';
import { GradesModule } from './grades/grades.module';
import { GoogleCalendarModule } from './integrations/google-calendar/google-calendar.module';
import { CloudinaryModule } from './storage/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    TenantModule,
    AuthModule,
    OnboardingModule,
    StudentsModule,
    SchoolsModule,
    TransfersModule,
    NotificationModule,
    AnalyticsModule,
    EmailModule,
    SessionsModule,
    TimetableModule,
    EventsModule,
    GradesModule,
    GoogleCalendarModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
