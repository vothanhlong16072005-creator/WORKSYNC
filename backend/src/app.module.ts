import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { QuickTaskModule } from './quick-tasks/quick-tasks.module.js';
import { SprintsModule } from './sprints/sprints.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { CalendarModule } from './calendar/calendar.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    DashboardModule,
    AttendanceModule,
    QuickTaskModule,
    SprintsModule,
    MeetingsModule,
    NotificationsModule,
    DocumentsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
