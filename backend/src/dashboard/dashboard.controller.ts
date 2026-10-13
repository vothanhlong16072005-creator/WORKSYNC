import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  async getMyDashboard(@CurrentUser() user: AuthUser) {
    if (user.role === 'ADMIN') {
      return { success: true, data: await this.dashboardService.getAdminDashboard(user.id) };
    }
    if (user.role === 'PM') {
      return { success: true, data: await this.dashboardService.getPmDashboard(user.id) };
    }
    if (user.role === 'HR') {
      return { success: true, data: await this.dashboardService.getHrDashboard(user.id) };
    }
    return { success: true, data: await this.dashboardService.getEmployeeDashboard(user.id) };
  }

  @Get('employee')
  async getEmployee(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.dashboardService.getEmployeeDashboard(user.id) };
  }

  @Get('pm')
  @Roles('PM', 'ADMIN')
  async getPm(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.dashboardService.getPmDashboard(user.id) };
  }

  @Get('hr')
  @Roles('HR', 'ADMIN')
  async getHr(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.dashboardService.getHrDashboard(user.id) };
  }

  @Get('admin')
  @Roles('ADMIN')
  async getAdmin(@CurrentUser() user: AuthUser) {
    return { success: true, data: await this.dashboardService.getAdminDashboard(user.id) };
  }
}
