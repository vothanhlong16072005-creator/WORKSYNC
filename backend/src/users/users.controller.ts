/**
 * Users Controller — M3.5
 * Endpoints:
 *  GET /api/users/assignable  Danh sách user có thể giao việc (theo role)
 */
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersService, type DepartmentUserSummary } from './users.service.js';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
    departmentId?: string | null;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('assignable')
  async findAssignable(@Req() req: AuthenticatedRequest): Promise<DepartmentUserSummary[]> {
    return this.usersService.findByDepartmentOrMine({
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    });
  }
}
