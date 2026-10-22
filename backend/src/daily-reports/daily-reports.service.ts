import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { DailyReportsDraftService } from './daily-reports.draft.service.js';
import {
  canViewReportsOf,
  canSubmitOnBehalf,
  canEditReport,
  type ActorContext,
} from './daily-reports.permissions.js';
import type {
  SubmitDailyReportDto,
  UpdateDailyReportDto,
  ListDailyReportsQueryDto,
} from './dto/submit-daily-report.dto.js';
import type {
  MemberWeekSummary,
  WeekDaySummary,
} from './types/daily-report.types.js';
import { NotificationType, Role } from '@prisma/client';

@Injectable()
export class DailyReportsService {
  private readonly logger = new Logger(DailyReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly draftService: DailyReportsDraftService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private parseDateOnly(dateStr?: string): Date {
    if (!dateStr) {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return new Date(`${formatter.format(now)}T00:00:00.000Z`);
    }
    return new Date(`${dateStr.split('T')[0]}T00:00:00.000Z`);
  }

  /**
   * 1. Lấy dữ liệu điền sẵn (draft) cho người dùng
   */
  async getDraft(userId: string, dateStr?: string) {
    const targetDate = this.parseDateOnly(dateStr);
    return this.draftService.buildDraft(userId, targetDate);
  }

  /**
   * 2. Nộp báo cáo ngày (Submit report)
   */
  async submitReport(actor: ActorContext, dto: SubmitDailyReportDto) {
    const reportDate = this.parseDateOnly(dto.date);
    const today = this.parseDateOnly();

    let targetUserId = actor.id;
    let submittedById: string | null = null;

    // Trường hợp nộp hộ nhân sự
    if (dto.targetUserId && dto.targetUserId !== actor.id) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.targetUserId },
        select: { id: true, departmentId: true },
      });
      if (!targetUser) throw new NotFoundException('Không tìm thấy nhân sự mục tiêu');

      const isProjectMember = await this.checkIsProjectMember(actor.id, targetUser.id);
      const sameDepartment = Boolean(
        actor.departmentId && actor.departmentId === targetUser.departmentId,
      );

      const hasPermission = canSubmitOnBehalf(actor, { sameDepartment, isProjectMember });
      if (!hasPermission) {
        throw new ForbiddenException('Bạn không có quyền nộp báo cáo hộ nhân sự này');
      }

      targetUserId = targetUser.id;
      submittedById = actor.id;
    }

    // Kiểm tra xem báo cáo ngày này đã tồn tại và bị khoá hay chưa
    const existing = await this.prisma.dailyReport.findUnique({
      where: { userId_date: { userId: targetUserId, date: reportDate } },
    });

    if (existing && existing.isLocked) {
      throw new ForbiddenException(
        'Báo cáo của ngày này đã bị khoá sau nửa đêm, không thể ghi đè hoặc nộp lại',
      );
    }

    const isPastDate = reportDate.getTime() < today.getTime();
    const now = new Date();

    const report = await this.prisma.dailyReport.upsert({
      where: { userId_date: { userId: targetUserId, date: reportDate } },
      create: {
        userId: targetUserId,
        date: reportDate,
        content: dto.content,
        tasksDone: dto.tasksDone,
        blockers: dto.blockers,
        plannedTomorrow: dto.plannedTomorrow,
        aiDrafted: dto.aiDrafted ?? false,
        lateSubmission: isPastDate,
        submittedAt: now,
        submittedById,
      },
      update: {
        content: dto.content,
        tasksDone: dto.tasksDone,
        blockers: dto.blockers,
        plannedTomorrow: dto.plannedTomorrow,
        aiDrafted: dto.aiDrafted ?? false,
        lateSubmission: isPastDate,
        submittedAt: now,
        submittedById,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Gửi thông báo đến PM và Trưởng phòng ban
    this.notifyManagersOnReportSubmitted(report).catch((err) =>
      this.logger.warn(`Failed to send report notifications: ${err.message}`),
    );

    return report;
  }

  /**
   * 3. Lấy danh sách báo cáo cá nhân
   */
  async getMyReports(userId: string, query: ListDailyReportsQueryDto) {
    const where: any = { userId };

    if (query.date) {
      where.date = this.parseDateOnly(query.date);
    } else if (query.weekStart) {
      const start = this.parseDateOnly(query.weekStart);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.date = { gte: start, lt: end };
    }

    const [items, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.dailyReport.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  /**
   * 4. Lấy ma trận báo cáo của team theo tuần (dành cho PM / Trưởng phòng / Admin)
   */
  async getTeamWeeklyOverview(actor: ActorContext, weekStartStr?: string) {
    const startOfWeek = this.getMondayOfWeek(this.parseDateOnly(weekStartStr));
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Xác định tập hợp user mà actor có quyền giám sát
    const targetUserIds = await this.getAudienceUserIds(actor);

    const members = await this.prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const reports = await this.prisma.dailyReport.findMany({
      where: {
        userId: { in: targetUserIds },
        date: { gte: startOfWeek, lt: endOfWeek },
      },
      select: {
        id: true,
        userId: true,
        date: true,
        content: true,
        isLocked: true,
        submittedAt: true,
      },
    });

    const reportMap = new Map<string, typeof reports[0]>();
    for (const r of reports) {
      const key = `${r.userId}_${r.date.toISOString().split('T')[0]}`;
      reportMap.set(key, r);
    }

    // Tạo danh sách 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật
    const daysInWeek: { dateStr: string; dayOfWeek: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek.getTime() + i * 86400000);
      daysInWeek.push({
        dateStr: d.toISOString().split('T')[0],
        dayOfWeek: d.getUTCDay(),
      });
    }

    const summaries: MemberWeekSummary[] = members.map((m) => {
      let submittedCount = 0;
      const days: WeekDaySummary[] = daysInWeek.map((day) => {
        const key = `${m.id}_${day.dateStr}`;
        const found = reportMap.get(key);
        if (found) {
          submittedCount++;
          return {
            date: day.dateStr,
            dayOfWeek: day.dayOfWeek,
            isSubmitted: true,
            isLocked: found.isLocked,
            reportId: found.id,
            summaryText: found.content.slice(0, 100),
          };
        }
        return {
          date: day.dateStr,
          dayOfWeek: day.dayOfWeek,
          isSubmitted: false,
          isLocked: new Date(day.dateStr).getTime() < startOfWeek.getTime(),
        };
      });

      return {
        userId: m.id,
        userName: m.name,
        userEmail: m.email,
        userAvatar: m.avatar,
        departmentName: m.department?.name,
        submittedCount,
        days,
      };
    });

    return {
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: new Date(endOfWeek.getTime() - 86400000).toISOString().split('T')[0],
      totalMembers: members.length,
      summaries,
    };
  }

  /**
   * 5. Lấy danh sách báo cáo chi tiết của team theo ngày
   */
  async getTeamDailyReports(actor: ActorContext, query: ListDailyReportsQueryDto) {
    const targetUserIds = await this.getAudienceUserIds(actor);
    const date = this.parseDateOnly(query.date);

    const where: any = {
      userId: { in: targetUserIds },
      date,
    };

    if (query.userId && targetUserIds.includes(query.userId)) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.dailyReport.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  /**
   * 6. Lấy chi tiết một báo cáo
   */
  async getReportById(actor: ActorContext, id: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo ngày');

    const sameDepartment = Boolean(
      actor.departmentId && actor.departmentId === report.user.department?.id,
    );
    const isProjectMember = await this.checkIsProjectMember(actor.id, report.userId);

    const canView = canViewReportsOf(actor, report.userId, { sameDepartment, isProjectMember });
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền xem báo cáo của nhân sự này');
    }

    return report;
  }

  /**
   * 7. Chỉnh sửa báo cáo
   */
  async updateReport(actor: ActorContext, id: string, dto: UpdateDailyReportDto) {
    const report = await this.prisma.dailyReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo ngày');

    const canEdit = canEditReport(actor, report);
    if (!canEdit) {
      if (report.isLocked) {
        throw new ForbiddenException('Báo cáo đã bị khoá sau midnight, không thể chỉnh sửa');
      }
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa báo cáo này');
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.tasksDone ? { tasksDone: dto.tasksDone } : {}),
        ...(dto.blockers !== undefined ? { blockers: dto.blockers } : {}),
        ...(dto.plannedTomorrow !== undefined ? { plannedTomorrow: dto.plannedTomorrow } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * 8. Khoá tất cả báo cáo của những ngày trước nửa đêm hôm nay
   */
  async lockMidnightReports(): Promise<number> {
    const today = this.parseDateOnly();
    const result = await this.prisma.dailyReport.updateMany({
      where: {
        date: { lt: today },
        isLocked: false,
      },
      data: { isLocked: true },
    });
    this.logger.log(`Locked ${result.count} past daily reports.`);
    return result.count;
  }

  // --- Helpers ---

  private getMondayOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
    date.setUTCDate(diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private async checkIsProjectMember(pmId: string, memberId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        pmId,
        members: { some: { userId: memberId } },
        deletedAt: null,
      },
      select: { id: true },
    });
    return Boolean(project);
  }

  private async getAudienceUserIds(actor: ActorContext): Promise<string[]> {
    if (actor.role === Role.ADMIN || actor.role === Role.HR) {
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    if (actor.role === Role.DEPARTMENT_HEAD) {
      if (!actor.departmentId) return [actor.id];
      const deptUsers = await this.prisma.user.findMany({
        where: { departmentId: actor.departmentId, deletedAt: null },
        select: { id: true },
      });
      return deptUsers.map((u) => u.id);
    }

    if (actor.role === Role.PM) {
      const pmProjects = await this.prisma.project.findMany({
        where: { pmId: actor.id, deletedAt: null },
        select: {
          members: { select: { userId: true } },
        },
      });
      const ids = new Set<string>([actor.id]);
      for (const p of pmProjects) {
        for (const m of p.members) {
          ids.add(m.userId);
        }
      }
      return Array.from(ids);
    }

    // Role EMPLOYEE chỉ xem chính mình
    return [actor.id];
  }

  private async notifyManagersOnReportSubmitted(report: any) {
    const recipientIds = new Set<string>();

    // 1. Trưởng phòng ban
    if (report.user?.department?.id) {
      const dept = await this.prisma.department.findUnique({
        where: { id: report.user.department.id },
        select: { managerId: true },
      });
      if (dept?.managerId && dept.managerId !== report.userId) {
        recipientIds.add(dept.managerId);
      }
    }

    // 2. PM của các dự án mà user tham gia
    const userProjects = await this.prisma.project.findMany({
      where: {
        members: { some: { userId: report.userId } },
        deletedAt: null,
      },
      select: { pmId: true },
    });
    for (const p of userProjects) {
      if (p.pmId && p.pmId !== report.userId) {
        recipientIds.add(p.pmId);
      }
    }

    // Gửi thông báo
    for (const managerId of recipientIds) {
      await this.notificationsService.create({
        userId: managerId,
        type: NotificationType.DAILY_REPORT,
        category: 'DAILY_REPORT',
        title: `Báo cáo ngày: ${report.user.name}`,
        body: `${report.user.name} đã hoàn tất nộp báo cáo ngày ${report.date.toISOString().split('T')[0]}.`,
        data: {
          reportId: report.id,
          employeeId: report.userId,
          date: report.date.toISOString().split('T')[0],
        },
        actorId: report.userId,
      });
    }
  }
}
