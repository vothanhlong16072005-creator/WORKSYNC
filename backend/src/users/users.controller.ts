/**
 * Users Controller — M3.5
 * Endpoints:
 *  GET /api/users/assignable  Danh sách user có thể giao việc (theo role)
 */
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
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

  @Get()
  async findAll(): Promise<DepartmentUserSummary[]> {
    return this.usersService.findAllActive();
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name?: string;
      avatar?: string | null;
      position?: string | null;
      language?: any;
    },
  ) {
    const user = await this.usersService.updateProfile(req.user.id, {
      name: body.name ? body.name.trim() : undefined,
      avatar: body.avatar !== undefined ? body.avatar : undefined,
      position: body.position ? body.position.trim() : undefined,
      language: body.language,
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      position: user.position,
      language: user.language,
      departmentId: user.departmentId,
    };
  }
}
