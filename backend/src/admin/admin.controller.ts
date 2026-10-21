import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { Role, UserStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return {
      success: true,
      data: await this.adminService.getOverview(),
    };
  }

  @Get('users')
  async getAllUsers() {
    return {
      success: true,
      data: await this.adminService.getAllUsers(),
    };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: Role,
  ) {
    return {
      success: true,
      data: await this.adminService.updateUserRole(id, role),
    };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    return {
      success: true,
      data: await this.adminService.updateUserStatus(id, status),
    };
  }

  @Get('departments')
  async getAllDepartments() {
    return {
      success: true,
      data: await this.adminService.getAllDepartments(),
    };
  }

  @Post('departments')
  async createDepartment(
    @Body() body: { name: string; code: string; description?: string; managerId?: string },
  ) {
    return {
      success: true,
      data: await this.adminService.createDepartment(body),
    };
  }

  @Get('projects')
  async getAllProjects() {
    return {
      success: true,
      data: await this.adminService.getAllProjects(),
    };
  }

  @Get('documents')
  async getAllDocuments() {
    return {
      success: true,
      data: await this.adminService.getAllDocuments(),
    };
  }

  @Get('meetings')
  async getAllMeetings() {
    return {
      success: true,
      data: await this.adminService.getAllMeetings(),
    };
  }
}
