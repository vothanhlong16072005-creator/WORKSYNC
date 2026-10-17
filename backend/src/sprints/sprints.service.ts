/**
 * Sprints Service — M3.5
 * Quản lý vòng đời Sprint (PLANNING -> ACTIVE -> COMPLETED),
 * Kiểm soát quyền hạn (PM/Admin CRUD, DEPT_HEAD/Employee read-only),
 * Tính toán biểu đồ Burndown (Ideal vs Actual story points).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, SprintStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentActor, ProjectAccessService } from '../projects/project-access.service.js';
import { CreateSprintDto } from './dto/create-sprint.dto.js';
import { UpdateSprintDto } from './dto/update-sprint.dto.js';
import { BurndownDayPoint, SprintBurndownResponse } from './dto/sprint-burndown.dto.js';

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  /**
   * Tạo Sprint mới trong dự án.
   * RBAC: Chỉ PM của dự án hoặc Admin mới có quyền tạo Sprint.
   */
  async create(dto: CreateSprintDto, actor: CurrentActor) {
    await this.projectAccessService.requireReadableProject(dto.projectId, actor);

    const isPM = await this.projectAccessService.isProjectPM(dto.projectId, actor.id);
    if (!isPM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền tạo Sprint');
    }

    const durationDays = dto.durationDays || 14;
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.sprint.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        goal: dto.goal || null,
        durationDays,
        startDate,
        endDate,
        status: SprintStatus.PLANNING,
        createdById: actor.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  /**
   * Lấy danh sách Sprint của một dự án.
   * RBAC: Mọi thành viên dự án, DEPT_HEAD phòng ban, HR, Admin đều có thể xem (read-only).
   */
  async findByProject(projectId: string, actor: CurrentActor) {
    await this.projectAccessService.requireReadableProject(projectId, actor);

    const sprints = await this.prisma.sprint.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE -> PLANNING -> COMPLETED
        { startDate: 'desc' },
      ],
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            storyPoints: true,
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return sprints.map((sprint) => {
      const totalTasks = sprint.tasks.length;
      const doneTasks = sprint.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const totalStoryPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedStoryPoints = sprint.tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        ...sprint,
        progress: {
          totalTasks,
          doneTasks,
          totalStoryPoints,
          completedStoryPoints,
          percent,
        },
      };
    });
  }

  /**
   * Xem chi tiết một Sprint.
   */
  async findOne(id: string, actor: CurrentActor) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: {
          select: { id: true, name: true, workflowType: true, pmId: true, departmentId: true },
        },
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    await this.projectAccessService.requireReadableProject(sprint.projectId, actor);

    const totalTasks = sprint.tasks.length;
    const doneTasks = sprint.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const totalStoryPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = sprint.tasks
      .filter((t) => t.status === TaskStatus.DONE)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return {
      ...sprint,
      progress: {
        totalTasks,
        doneTasks,
        totalStoryPoints,
        completedStoryPoints,
        remainingStoryPoints: totalStoryPoints - completedStoryPoints,
        percent,
      },
    };
  }

  /**
   * Bắt đầu Sprint (Start Sprint).
   * Chuyển trạng thái từ PLANNING -> ACTIVE.
   * Ràng buộc: Mỗi dự án chỉ được phép có DUY NHẤT 1 sprint ACTIVE tại 1 thời điểm.
   */
  async start(id: string, actor: CurrentActor) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    const isPM = await this.projectAccessService.isProjectPM(sprint.projectId, actor.id);
    if (!isPM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền bắt đầu Sprint');
    }

    if (sprint.status !== SprintStatus.PLANNING) {
      throw new BadRequestException('Chỉ có thể bắt đầu sprint đang ở trạng thái PLANNING');
    }

    // Kiểm tra xem dự án đã có Sprint nào đang ACTIVE chưa
    const existingActive = await this.prisma.sprint.findFirst({
      where: {
        projectId: sprint.projectId,
        status: SprintStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (existingActive) {
      throw new ConflictException(
        `Dự án hiện đang có Sprint "${existingActive.name}" đang chạy. Vui lòng hoàn thành sprint trước khi bắt đầu sprint mới.`,
      );
    }

    const startDate = sprint.startDate || new Date();
    const endDate = sprint.endDate || new Date(startDate.getTime() + (sprint.durationDays || 14) * 24 * 60 * 60 * 1000);

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
  }

  /**
   * Hoàn thành Sprint (Complete Sprint).
   * Chuyển trạng thái từ ACTIVE -> COMPLETED.
   */
  async complete(id: string, actor: CurrentActor) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    const isPM = await this.projectAccessService.isProjectPM(sprint.projectId, actor.id);
    if (!isPM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền hoàn thành Sprint');
    }

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Chỉ có thể hoàn thành sprint đang ở trạng thái ACTIVE');
    }

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cập nhật thông tin Sprint.
   */
  async update(id: string, dto: UpdateSprintDto, actor: CurrentActor) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    const isPM = await this.projectAccessService.isProjectPM(sprint.projectId, actor.id);
    if (!isPM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền cập nhật Sprint');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.goal !== undefined) data.goal = dto.goal;
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.sprint.update({
      where: { id },
      data,
    });
  }

  /**
   * Xóa Sprint (Soft delete).
   * Không cho phép xóa Sprint đang ACTIVE trừ khi là Admin.
   */
  async remove(id: string, actor: CurrentActor) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    const isPM = await this.projectAccessService.isProjectPM(sprint.projectId, actor.id);
    if (!isPM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền xóa Sprint');
    }

    if (sprint.status === SprintStatus.ACTIVE && actor.role !== Role.ADMIN) {
      throw new BadRequestException('Không thể xóa sprint đang ACTIVE. Vui lòng hoàn thành sprint trước khi xóa.');
    }

    // Gỡ các task liên kết với sprint này về backlog
    await this.prisma.task.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });

    return this.prisma.sprint.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Tính toán dữ liệu Burndown Chart cho Sprint.
   * Tạo đường lý tưởng (Ideal line) và đường thực tế (Actual line) dựa trên Story Points.
   */
  async getBurndown(id: string, actor: CurrentActor): Promise<SprintBurndownResponse> {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            storyPoints: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint không tồn tại');
    }

    await this.projectAccessService.requireReadableProject(sprint.projectId, actor);

    // Tính tổng Story Points, nếu chưa gắn SP thì mặc định mỗi task = 1 SP
    let totalStoryPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    if (totalStoryPoints === 0 && sprint.tasks.length > 0) {
      totalStoryPoints = sprint.tasks.length;
    }

    const doneTasks = sprint.tasks.filter((t) => t.status === TaskStatus.DONE);
    let completedStoryPoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints || (totalStoryPoints === sprint.tasks.length ? 1 : 0)), 0);
    if (totalStoryPoints === 0) {
      completedStoryPoints = 0;
    }

    const remainingStoryPoints = Math.max(0, totalStoryPoints - completedStoryPoints);

    // Xác định khung thời gian của sprint
    const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
    const durationDays = sprint.durationDays || 14;
    const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const today = new Date();

    const dailyData: BurndownDayPoint[] = [];

    // Tạo các mốc ngày trong sprint
    for (let i = 0; i <= totalDays; i++) {
      const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = dayDate.toISOString().split('T')[0];

      // Đường lý tưởng giảm tuyến tính từ totalStoryPoints về 0
      const ideal = Math.max(0, Math.round((totalStoryPoints - (totalStoryPoints / totalDays) * i) * 10) / 10);

      // Đường thực tế: Nếu ngày trước hoặc bằng hôm nay (hoặc sprint đã complete)
      let actual = totalStoryPoints;
      if (dayDate <= today || sprint.status === SprintStatus.COMPLETED) {
        // Đếm các task đã hoàn thành trước hoặc trong ngày dayDate
        const finishedPoints = doneTasks
          .filter((t) => new Date(t.updatedAt) <= new Date(dayDate.getTime() + 24 * 60 * 60 * 1000))
          .reduce((sum, t) => sum + (t.storyPoints || (totalStoryPoints === sprint.tasks.length ? 1 : 0)), 0);

        actual = Math.max(0, totalStoryPoints - finishedPoints);
      } else {
        // Ngày tương lai: giữ nguyên mức hiện tại
        actual = remainingStoryPoints;
      }

      dailyData.push({
        date: dateStr,
        ideal,
        actual,
      });
    }

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      startDate: sprint.startDate ? sprint.startDate.toISOString() : null,
      endDate: sprint.endDate ? sprint.endDate.toISOString() : null,
      totalStoryPoints,
      completedStoryPoints,
      remainingStoryPoints,
      dailyData,
    };
  }
}
