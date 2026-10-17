import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectKind, Role, SprintStatus, TaskStatus } from '@prisma/client';
import { SprintsService } from '../sprints.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ProjectAccessService, CurrentActor } from '../../projects/project-access.service.js';

describe('SprintsService', () => {
  let service: SprintsService;
  let prisma: {
    sprint: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    task: {
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let projectAccessService: {
    requireReadableProject: ReturnType<typeof vi.fn>;
    isProjectPM: ReturnType<typeof vi.fn>;
  };

  const adminActor: CurrentActor = { id: 'admin-1', role: Role.ADMIN, departmentId: null };
  const pmActor: CurrentActor = { id: 'pm-1', role: Role.PM, departmentId: 'dept-eng' };
  const deptHeadActor: CurrentActor = { id: 'dept-head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-eng' };
  const empActor: CurrentActor = { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' };

  beforeEach(() => {
    prisma = {
      sprint: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      task: {
        updateMany: vi.fn(),
      },
    };

    projectAccessService = {
      requireReadableProject: vi.fn().mockResolvedValue({ projectId: 'proj-1', kind: ProjectKind.TEAM }),
      isProjectPM: vi.fn(),
    };

    service = new SprintsService(
      prisma as unknown as PrismaService,
      projectAccessService as unknown as ProjectAccessService,
    );
  });

  describe('1 & 3: PM và Admin tạo sprint thành công', () => {
    it('1. PM của project tạo sprint -> 201', async () => {
      projectAccessService.isProjectPM.mockResolvedValue(true);
      prisma.sprint.create.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        projectId: 'proj-1',
        status: SprintStatus.PLANNING,
      });

      const result = await service.create(
        { projectId: 'proj-1', name: 'Sprint 1', durationDays: 14 },
        pmActor,
      );

      expect(result).toBeDefined();
      expect(prisma.sprint.create).toHaveBeenCalled();
    });

    it('3. Admin tạo sprint thành công dù không phải PM -> 201', async () => {
      projectAccessService.isProjectPM.mockResolvedValue(false);
      prisma.sprint.create.mockResolvedValue({
        id: 'sprint-admin',
        name: 'Sprint Admin',
        projectId: 'proj-1',
        status: SprintStatus.PLANNING,
      });

      const result = await service.create(
        { projectId: 'proj-1', name: 'Sprint Admin', durationDays: 14 },
        adminActor,
      );

      expect(result).toBeDefined();
    });
  });

  describe('2: DEPT_HEAD không có quyền tạo sprint', () => {
    it('2. DEPT_HEAD tạo sprint -> 403 ForbiddenException', async () => {
      projectAccessService.isProjectPM.mockResolvedValue(false);

      await expect(
        service.create(
          { projectId: 'proj-1', name: 'Sprint Dept Head', durationDays: 14 },
          deptHeadActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('4, 5 & 6: Start sprint lifecycle', () => {
    it('4. PM của project start sprint PLANNING -> ACTIVE -> 200', async () => {
      prisma.sprint.findFirst
        // Lần 1: tìm sprint
        .mockResolvedValueOnce({
          id: 'sprint-1',
          projectId: 'proj-1',
          name: 'Sprint 1',
          status: SprintStatus.PLANNING,
          startDate: null,
          endDate: null,
          durationDays: 14,
        })
        // Lần 2: check conflict ACTIVE sprint
        .mockResolvedValueOnce(null);

      projectAccessService.isProjectPM.mockResolvedValue(true);
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        status: SprintStatus.ACTIVE,
      });

      const result = await service.start('sprint-1', pmActor);
      expect(result.status).toBe(SprintStatus.ACTIVE);
      expect(prisma.sprint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sprint-1' },
          data: expect.objectContaining({ status: SprintStatus.ACTIVE }),
        }),
      );
    });

    it('5. Start sprint không phải PLANNING -> 400 BadRequestException', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE, // Đã active rồi
      });
      projectAccessService.isProjectPM.mockResolvedValue(true);

      await expect(service.start('sprint-1', pmActor)).rejects.toThrow(BadRequestException);
    });

    it('6. Start khi project đã có 1 ACTIVE sprint khác -> 409 ConflictException', async () => {
      prisma.sprint.findFirst
        // Sprint muốn start
        .mockResolvedValueOnce({
          id: 'sprint-2',
          projectId: 'proj-1',
          status: SprintStatus.PLANNING,
        })
        // Sprint đang active
        .mockResolvedValueOnce({
          id: 'sprint-1',
          name: 'Sprint 1 Đang Chạy',
          projectId: 'proj-1',
          status: SprintStatus.ACTIVE,
        });
      projectAccessService.isProjectPM.mockResolvedValue(true);

      await expect(service.start('sprint-2', pmActor)).rejects.toThrow(ConflictException);
    });
  });

  describe('7 & 8: Complete sprint lifecycle', () => {
    it('7. PM complete ACTIVE sprint -> COMPLETED với completedAt', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
      });
      projectAccessService.isProjectPM.mockResolvedValue(true);
      prisma.sprint.update.mockResolvedValue({
        id: 'sprint-1',
        status: SprintStatus.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.complete('sprint-1', pmActor);
      expect(result.status).toBe(SprintStatus.COMPLETED);
    });

    it('8. DEPT_HEAD complete -> 403 ForbiddenException', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-1',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
      });
      projectAccessService.isProjectPM.mockResolvedValue(false);

      await expect(service.complete('sprint-1', deptHeadActor)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('9 & 10: Remove sprint', () => {
    it('9. Remove PLANNING sprint -> success soft-delete', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-plan',
        projectId: 'proj-1',
        status: SprintStatus.PLANNING,
      });
      projectAccessService.isProjectPM.mockResolvedValue(true);
      prisma.task.updateMany.mockResolvedValue({ count: 2 });
      prisma.sprint.update.mockResolvedValue({ id: 'sprint-plan', deletedAt: new Date() });

      const result = await service.remove('sprint-plan', pmActor);
      expect(result).toBeDefined();
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { sprintId: 'sprint-plan' },
        data: { sprintId: null },
      });
    });

    it('10. Remove ACTIVE sprint bởi PM -> 400 BadRequestException', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-active',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
      });
      projectAccessService.isProjectPM.mockResolvedValue(true);

      await expect(service.remove('sprint-active', pmActor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('11 & 12: Burndown calculation', () => {
    it('11. Burndown sprint không có tasks -> tính toán an toàn không crash', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-empty',
        name: 'Empty Sprint',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-15'),
        durationDays: 14,
        tasks: [],
      });

      const burndown = await service.getBurndown('sprint-empty', pmActor);
      expect(burndown.sprintId).toBe('sprint-empty');
      expect(burndown.totalStoryPoints).toBe(0);
      expect(burndown.dailyData.length).toBeGreaterThan(0);
      expect(burndown.dailyData[0].ideal).toBe(0);
    });

    it('12. Burndown sprint có tasks -> tính đúng ideal và actual', async () => {
      prisma.sprint.findFirst.mockResolvedValue({
        id: 'sprint-with-tasks',
        name: 'Sprint With Tasks',
        projectId: 'proj-1',
        status: SprintStatus.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-15'),
        durationDays: 14,
        tasks: [
          {
            id: 'task-1',
            status: TaskStatus.DONE,
            storyPoints: 5,
            updatedAt: new Date('2026-10-02'),
            createdAt: new Date('2026-10-01'),
          },
          {
            id: 'task-2',
            status: TaskStatus.IN_PROGRESS,
            storyPoints: 3,
            updatedAt: new Date('2026-10-03'),
            createdAt: new Date('2026-10-01'),
          },
        ],
      });

      const burndown = await service.getBurndown('sprint-with-tasks', pmActor);
      expect(burndown.totalStoryPoints).toBe(8);
      expect(burndown.completedStoryPoints).toBe(5);
      expect(burndown.remainingStoryPoints).toBe(3);
      expect(burndown.dailyData[0].ideal).toBe(8); // Điểm bắt đầu
      expect(burndown.dailyData[burndown.dailyData.length - 1].ideal).toBe(0); // Điểm kết thúc lý tưởng
    });
  });
});
