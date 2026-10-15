import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      task: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            storyPoints: 8,
            estimatedHours: 16,
            actualHours: 12,
          },
        }),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(1),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(5),
      },
    };
    service = new DashboardService(mockPrisma as PrismaService);
  });

  describe('getEmployeeDashboard', () => {
    it('returns task counts and urgent tasks correctly', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(12) // total
        .mockResolvedValueOnce(2)  // todo
        .mockResolvedValueOnce(4)  // inProgress
        .mockResolvedValueOnce(1)  // inReview
        .mockResolvedValueOnce(1)  // blocked
        .mockResolvedValueOnce(4)  // done
        .mockResolvedValueOnce(2); // overdue

      const urgentTasksMock = [
        {
          id: 'task-1',
          title: 'Sửa lỗi giao diện',
          priority: 'URGENT',
          status: 'IN_PROGRESS',
          dueDate: new Date('2026-10-15T10:00:00Z'),
          project: { name: 'WorkSync', color: '#3B82F6' },
          storyPoints: 3,
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(urgentTasksMock);

      const result = await service.getEmployeeDashboard('user-1');

      expect(result.taskSummary.total).toBe(12);
      expect(result.taskSummary.inProgress).toBe(4);
      expect(result.taskSummary.blocked).toBe(1);
      expect(result.taskSummary.done).toBe(4);
      expect(result.taskSummary.totalStoryPoints).toBe(8);
      expect(result.urgentTasks).toHaveLength(1);
      expect(result.urgentTasks[0].title).toBe('Sửa lỗi giao diện');
      expect(result.urgentTasks[0].projectName).toBe('WorkSync');
      expect(result.weeklyVelocity).toHaveLength(7);
      expect(result.statusDistribution).toHaveLength(5);
      expect(result.priorityDistribution).toHaveLength(4);
    });
  });

  describe('getPmDashboard', () => {
    it('returns employee stats plus projectProgress and teamWorkload', async () => {
      // getEmployeeDashboard calls project.findMany first (userProjects), then getPmDashboard calls it again
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Mobile App',
          color: '#10B981',
          sprints: [
            {
              id: 'sp-1',
              name: 'Sprint 1',
              status: 'ACTIVE',
              endDate: new Date('2026-10-20T00:00:00Z'),
            },
          ],
          tasks: [
            { id: 't-1', status: 'DONE', sprintId: 'sp-1', assigneeId: 'pm-user' },
            { id: 't-2', status: 'IN_PROGRESS', sprintId: 'sp-1', assigneeId: 'pm-user' },
          ],
        },
      ]);

      mockPrisma.task.groupBy.mockResolvedValue([
        {
          assigneeId: 'user-2',
          _count: { id: 2 },
          _sum: { storyPoints: 5 },
        },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-2', name: 'Nguyễn Văn A', avatar: null },
      ]);

      const result = await service.getPmDashboard('pm-user');

      // Critical: PM must see projects where createdById=pm-user (real schema)
      // The previous query used wrong field 'creatorId' — now corrected to 'createdById'
      expect(result.projectProgress).toHaveLength(1);
      expect(result.projectProgress[0].progressPercent).toBe(50);
      expect(result.activeSprint?.name).toBe('Sprint 1');
      expect(result.teamWorkload).toHaveLength(1);
      expect(result.teamWorkload[0].userName).toBe('Nguyễn Văn A');
      expect(result.teamWorkload[0].openTaskCount).toBe(2);
      expect(result.teamWorkload[0].totalStoryPoints).toBe(5);
      expect(result.sprintBurndown).toHaveLength(7);
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.pmKpi).toBeDefined();
    });
  });

  describe('getHrDashboard', () => {
    it('returns workforce metrics, attendance distribution and compliance alerts', async () => {
      mockPrisma.user.count.mockResolvedValue(12);
      // task.count called 5x in Promise.all: total, IN_PROGRESS, BLOCKED, DONE, others
      mockPrisma.task.count.mockImplementation(
        ({ where }: { where: { status?: string } } = { where: {} }) => {
          if (where.status === 'IN_PROGRESS') return Promise.resolve(8);
          if (where.status === 'BLOCKED') return Promise.resolve(2);
          if (where.status === 'DONE') return Promise.resolve(10);
          return Promise.resolve(20);
        },
      );

      const result = await service.getHrDashboard('hr-user');

      expect(result.workforceSummary.totalEmployees).toBe(12);
      expect(result.attendanceKpi).toBeDefined();
      expect(result.attendanceDistribution).toBeDefined();
      expect(result.lateArrivalsByDepartment).toHaveLength(5);
      expect(result.leaveUsageByDepartment).toHaveLength(5);
      expect(result.pendingApprovals).toBeDefined();
      expect(result.complianceAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('getAdminDashboard', () => {
    it('returns system health and aggregate stats', async () => {
      // Admin dashboard now queries 8 separate task counts (system-wide, not personal)
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.project.count.mockResolvedValue(4);
      // task.count is called 8x in parallel — use mockImplementation to return same value
      mockPrisma.task.count.mockImplementation(
        ({ where }: { where: { status?: string | { not: string } } } = { where: {} }) => {
          if (where.status === 'DONE') return Promise.resolve(30);
          if (where.status === 'IN_PROGRESS') return Promise.resolve(12);
          if (where.status === 'BLOCKED') return Promise.resolve(2);
          if (typeof where.status === 'object' && where.status !== null && 'not' in where.status && where.status.not === 'DONE') return Promise.resolve(20); // overdue
          return Promise.resolve(50); // total
        },
      );

      const result = await service.getAdminDashboard('admin-user');

      expect(result.systemHealth.activeUsers).toBe(10);
      expect(result.systemHealth.totalProjects).toBe(4);
      expect(result.systemHealth.totalTasks).toBe(50);
      // System-wide task summary (not Admin's personal tasks)
      expect(result.taskSummary.total).toBe(50);
      expect(result.taskSummary.done).toBe(30);
      expect(result.taskSummary.inProgress).toBe(12);
      expect(result.taskSummary.blocked).toBe(2);
      expect(result.taskSummary.completionRate).toBe(60);
      // No personal urgent tasks / projects
      expect(result.urgentTasks).toEqual([]);
      expect(result.projectProgress).toEqual([]);
      expect(result.platformHealth).toBeDefined();
      expect(result.systemGauges).toBeDefined();
      expect(result.apiLatency).toBeDefined();
      expect(result.errorLogs).toHaveLength(3);
      expect(result.configStatus).toBeDefined();
    });
  });
});
