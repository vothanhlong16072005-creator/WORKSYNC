/**
 * QuickTask Controller
 *
 * Endpoints:
 *  POST   /api/quick-tasks          Tạo Quick Task
 *  GET    /api/quick-tasks          Lấy danh sách (filter theo role)
 *  GET    /api/quick-tasks/stats    Thống kê cho dashboard
 *  GET    /api/quick-tasks/:id      Chi tiết
 *  PATCH  /api/quick-tasks/:id      Cập nhật
 *  DELETE /api/quick-tasks/:id      Xóa
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { QuickTaskService, type CurrentActor } from './quick-tasks.service.js';
import { CreateQuickTaskDto, CreateQuickTaskSchema } from './dto/create-quick-task.dto.js';
import { UpdateQuickTaskDto, UpdateQuickTaskSchema } from './dto/update-quick-task.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: CurrentActor['role'];
    departmentId?: string | null;
  };
}

@Controller('quick-tasks')
@UseGuards(JwtAuthGuard)
export class QuickTaskController {
  constructor(private readonly quickTaskService: QuickTaskService) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const dto = CreateQuickTaskSchema.parse(body) as CreateQuickTaskDto;
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.create(dto, actor);
  }

  @Get('stats')
  async getStats(@Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.getStats(actor);
  }

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
  ) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.findAll(actor, { status, assigneeId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.findOne(id, actor);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = UpdateQuickTaskSchema.parse(body) as UpdateQuickTaskDto;
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.update(id, dto, actor);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.quickTaskService.remove(id, actor);
  }
}
