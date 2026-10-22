import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DailyReportsService } from '../daily-reports.service.js';
import { Role } from '@prisma/client';

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let mockPrisma: any;
  let mockDraftService: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockPrisma = {
      dailyReport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      project: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      department: {
        findUnique: vi.fn(),
      },
    };

    mockDraftService = {
      buildDraft: vi.fn().mockResolvedValue({
        date: '2026-10-22',
        attendance: { checkInTime: '2026-10-22T08:30:00.000Z', workHours: 8.5 },
        completedTasks: [{ id: 't-1', title: 'Hoàn thiện API Daily Report' }],
        completedQuickTasks: [],
        workLogs: [],
        attendedMeetings: [],
        overdueTasks: [],
        suggestedContent: '### Công việc hoàn thành',
        suggestedBlockers: 'Không có khó khăn',
        suggestedPlannedTomorrow: 'Tiếp tục sprint',
        totalWorkMinutes: 480,
      }),
    };

    mockNotificationsService = {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new DailyReportsService(
      mockPrisma,
      mockDraftService,
      mockNotificationsService,
    );
  });

  it('1. getDraft calls draftService with userId and target date', async () => {
    const draft = await service.getDraft('u-1', '2026-10-22');
    expect(mockDraftService.buildDraft).toHaveBeenCalled();
    expect(draft.date).toBe('2026-10-22');
    expect(draft.completedTasks).toHaveLength(1);
  });

  it('2. submitReport creates daily report successfully when not locked', async () => {
    mockPrisma.dailyReport.findUnique.mockResolvedValue(null);
    mockPrisma.dailyReport.upsert.mockResolvedValue({
      id: 'rep-1',
      userId: 'u-1',
      date: new Date('2026-10-22T00:00:00.000Z'),
      content: 'Báo cáo ngày 22/10',
      tasksDone: ['Task 1'],
      user: { id: 'u-1', name: 'Võ Thành Long', department: { id: 'dept-1' } },
    });
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.department.findUnique.mockResolvedValue(null);

    const result = await service.submitReport(
      { id: 'u-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
      {
        date: '2026-10-22',
        content: 'Báo cáo ngày 22/10',
        tasksDone: ['Task 1'],
      },
    );

    expect(result.id).toBe('rep-1');
    expect(mockPrisma.dailyReport.upsert).toHaveBeenCalled();
  });

  it('3. submitReport throws ForbiddenException when report is locked', async () => {
    mockPrisma.dailyReport.findUnique.mockResolvedValue({
      id: 'rep-locked',
      isLocked: true,
    });

    await expect(
      service.submitReport(
        { id: 'u-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
        {
          date: '2026-10-20',
          content: 'Thử sửa báo cáo cũ',
          tasksDone: [],
        },
      ),
    ).rejects.toThrow(/đã bị khoá sau nửa đêm/i);
  });

  it('4. updateReport rejects if report is locked', async () => {
    mockPrisma.dailyReport.findUnique.mockResolvedValue({
      id: 'rep-1',
      userId: 'u-1',
      isLocked: true,
    });

    await expect(
      service.updateReport(
        { id: 'u-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
        'rep-1',
        { content: 'Nội dung mới' },
      ),
    ).rejects.toThrow(/đã bị khoá/i);
  });

  it('5. lockMidnightReports locks past reports', async () => {
    mockPrisma.dailyReport.updateMany.mockResolvedValue({ count: 5 });
    const count = await service.lockMidnightReports();
    expect(count).toBe(5);
    expect(mockPrisma.dailyReport.updateMany).toHaveBeenCalledWith({
      where: {
        date: { lt: expect.any(Date) },
        isLocked: false,
      },
      data: { isLocked: true },
    });
  });
});
