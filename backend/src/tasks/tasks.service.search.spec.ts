import { describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service.js';
import { TaskScope } from './dto/task-query.dto.js';
import { ProjectKind, Role } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ProjectAccessService } from '../projects/project-access.service.js';
import type { NotificationTriggersService } from '../notifications/notification-triggers.service.js';

/**
 * Regression test cho ô tìm kiếm trên Kanban / global search.
 *
 * Bug gốc: `GET /tasks` không hỗ trợ tham số `q` → mọi từ khóa tìm kiếm đều
 * trả về toàn bộ task (hoặc không lọc gì) → chức năng "tìm kiếm" như không
 * hoạt động.
 */
const makeService = (prisma: any, accessService: any) =>
  new TasksService(
    prisma as PrismaService,
    accessService as ProjectAccessService,
    { notifyTaskStatusChanged: vi.fn() } as unknown as NotificationTriggersService,
  );

describe('TasksService.findAll — tìm kiếm theo từ khóa', () => {
  it('truyền điều kiện lọc theo title/id/labels khi có q', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { task: { findMany } };
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    };
    const service = makeService(prisma, accessService);

    await service.findAll(
      { scope: TaskScope.PROJECT, projectId: 'team-1', q: 'báo cáo' },
      { id: 'user-1', role: Role.EMPLOYEE },
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { title: { contains: 'báo cáo', mode: 'insensitive' } },
      { id: { contains: 'báo cáo', mode: 'insensitive' } },
      { labels: { has: 'báo cáo' } },
    ]);
    expect(where.projectId).toBe('team-1');
  });

  it('không thêm điều kiện lọc khi q rỗng hoặc chỉ chứa khoảng trắng', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { task: { findMany } };
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    };
    const service = makeService(prisma, accessService);

    await service.findAll(
      { scope: TaskScope.PROJECT, projectId: 'team-1', q: '   ' },
      { id: 'user-1', role: Role.EMPLOYEE },
    );

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it('áp dụng tìm kiếm cho scope=mine (task được giao)', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { task: { findMany } };
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    };
    const service = makeService(prisma, accessService);

    await service.findAll(
      { scope: TaskScope.MINE, projectId: 'team-1', q: 'api' },
      { id: 'user-1', role: Role.EMPLOYEE },
    );

    const where = findMany.mock.calls[0][0].where;
    expect(where.assigneeId).toBe('user-1');
    expect(where.OR).toHaveLength(3);
  });
});
