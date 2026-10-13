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

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, ProjectsModule, TasksModule, DashboardModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
