/**
 * Sprints Controller — M3.5
 *
 * Endpoints:
 *  POST   /api/sprints              Tạo Sprint (PM/Admin)
 *  GET    /api/sprints              Lấy danh sách Sprint theo projectId
 *  GET    /api/sprints/:id          Chi tiết Sprint
 *  GET    /api/sprints/:id/burndown Lấy dữ liệu Burndown Chart
 *  PATCH  /api/sprints/:id          Cập nhật thông tin Sprint
 *  POST   /api/sprints/:id/start    Bắt đầu Sprint (PLANNING -> ACTIVE)
 *  POST   /api/sprints/:id/complete Hoàn thành Sprint (ACTIVE -> COMPLETED)
 *  DELETE /api/sprints/:id          Xóa Sprint (Soft-delete)
 */
import {
  BadRequestException,
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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentActor } from '../projects/project-access.service.js';
import { SprintsService } from './sprints.service.js';
import { CreateSprintDto, CreateSprintSchema } from './dto/create-sprint.dto.js';
import { UpdateSprintDto, UpdateSprintSchema } from './dto/update-sprint.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: CurrentActor['role'];
    departmentId?: string | null;
  };
}

@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const dto = CreateSprintSchema.parse(body) as CreateSprintDto;
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.create(dto, actor);
  }

  @Get()
  async findByProject(
    @Query('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!projectId) {
      throw new BadRequestException('Query param "projectId" là bắt buộc');
    }
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.findByProject(projectId, actor);
  }

  @Get(':id/burndown')
  async getBurndown(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.getBurndown(id, actor);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.findOne(id, actor);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = UpdateSprintSchema.parse(body) as UpdateSprintDto;
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.update(id, dto, actor);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.start(id, actor);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.complete(id, actor);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor: CurrentActor = {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
    return this.sprintsService.remove(id, actor);
  }
}
