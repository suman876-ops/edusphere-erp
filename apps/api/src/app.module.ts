import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuthGuard } from './common/auth.guard';
import { PrismaModule } from './common/prisma.module';
import { CampusesModule } from './campuses/campuses.module';
import { StudentsModule } from './students/students.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FeesModule } from './fees/fees.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StructureModule } from './structure/structure.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    CampusesModule,
    StudentsModule,
    AttendanceModule,
    FeesModule,
    DashboardModule,
    StructureModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
