import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DraftPayload, DraftTaskItem, DraftMeetingItem, OverdueTaskItem } from './types/daily-report.types.js';

@Injectable()
export class DailyReportsDraftService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateOnly(date = new Date(), timezone = 'Asia/Ho_Chi_Minh'): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return new Date(`${formatter.format(date)}T00:00:00.000Z`);
  }

  /**
   * Tổng hợp dữ liệu tự động từ 4 nguồn + task quá hạn để điền sẵn vào báo cáo ngày
   */
  async buildDraft(userId: string, date?: Date): Promise<DraftPayload> {
    const targetDate = date ?? this.getDateOnly();
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    // 1. Dữ liệu chấm công & thời gian làm việc hôm nay
    const [attendance, breaks] = await Promise.all([
      this.prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId, date: targetDate } },
      }),
      this.prisma.breakLog.findMany({
        where: { userId, date: targetDate },
      }),
    ]);

    // 2. Task thông thường hoàn thành hôm nay
    const completedTasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: 'DONE',
        completedAt: { gte: targetDate, lt: nextDate },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
        project: { select: { name: true } },
        workLogs: {
          select: { id: true, duration: true, description: true },
          where: { logDate: targetDate },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    // 3. QuickTask hoàn thành hôm nay
    const completedQuickTasks = await this.prisma.quickTask.findMany({
      where: {
        assigneeId: userId,
        status: 'DONE',
        completedAt: { gte: targetDate, lt: nextDate },
      },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
        project: { select: { name: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    // 4. Nhật ký công việc (WorkLogs) ghi nhận hôm nay
    const workLogs = await this.prisma.workLog.findMany({
      where: { userId, logDate: targetDate },
      select: {
        id: true,
        duration: true,
        description: true,
        logDate: true,
        task: { select: { id: true, title: true } },
      },
      orderBy: { logDate: 'asc' },
    });

    // 5. Cuộc họp đã tham dự hôm nay
    const attendedAttendees = await this.prisma.meetingAttendee.findMany({
      where: {
        userId,
        joinedAt: { gte: targetDate, lt: nextDate },
      },
      select: {
        joinedAt: true,
        meeting: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            roomCode: true,
          },
        },
      },
    });

    // 6. Task quá hạn / tồn đọng chưa hoàn thành
    const now = new Date();
    const overdueTasksRaw = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ['DONE'] },
        dueDate: { lt: now },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    // Định dạng danh sách cuộc họp
    const attendedMeetings: DraftMeetingItem[] = attendedAttendees.map((att) => {
      const dur = Math.round(
        (att.meeting.endTime.getTime() - att.meeting.startTime.getTime()) / 60000,
      );
      return {
        id: att.meeting.id,
        title: att.meeting.title,
        startTime: att.meeting.startTime.toISOString(),
        endTime: att.meeting.endTime.toISOString(),
        durationMinutes: dur > 0 ? dur : 0,
        roomCode: att.meeting.roomCode,
      };
    });

    // Định dạng danh sách task quá hạn
    const overdueTasks: OverdueTaskItem[] = overdueTasksRaw.map((t) => {
      const daysOverdue = t.dueDate
        ? Math.max(1, Math.round((now.getTime() - t.dueDate.getTime()) / 86400000))
        : 1;
      return {
        id: t.id,
        title: t.title,
        projectName: t.project?.name ?? 'Không phân loại',
        dueDate: t.dueDate ? t.dueDate.toISOString() : '',
        daysOverdue,
        priority: t.priority,
      };
    });

    const mappedCompletedTasks: DraftTaskItem[] = completedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectName: t.project?.name ?? 'Dự án chung',
      status: t.status,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      workLogs: t.workLogs,
    }));

    const mappedCompletedQuickTasks: DraftTaskItem[] = completedQuickTasks.map((q) => ({
      id: q.id,
      title: q.title,
      projectName: q.project?.name ?? 'Việc nhanh',
      status: q.status,
      completedAt: q.completedAt ? q.completedAt.toISOString() : null,
      workLogs: [],
    }));

    // Tính toán thời gian
    const totalWorkMinutes = workLogs.reduce((sum, wl) => sum + wl.duration, 0);
    const breakMinutes = breaks.reduce((sum, b) => {
      if (!b.endTime) return sum;
      return sum + Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000);
    }, 0);

    const checkIn = attendance?.checkInTime ?? null;
    const checkOut = attendance?.checkOutTime ?? null;
    const workHours =
      checkIn && checkOut
        ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100
        : null;

    // Tự động xây dựng nội dung văn bản gợi ý
    const suggestedContent = this.buildSuggestedContent({
      completedTasks: mappedCompletedTasks,
      completedQuickTasks: mappedCompletedQuickTasks,
      workLogs,
      attendedMeetings,
      totalWorkMinutes,
    });

    const suggestedBlockers = this.buildSuggestedBlockers(overdueTasks);
    const suggestedPlannedTomorrow = this.buildSuggestedTomorrow(overdueTasks);

    return {
      date: targetDate.toISOString().split('T')[0],
      attendance: {
        checkInTime: checkIn?.toISOString() ?? null,
        checkOutTime: checkOut?.toISOString() ?? null,
        status: attendance?.status ?? null,
        workHours,
        breakMinutes: breakMinutes > 0 ? breakMinutes : null,
      },
      completedTasks: mappedCompletedTasks,
      completedQuickTasks: mappedCompletedQuickTasks,
      workLogs: workLogs.map((wl) => ({
        id: wl.id,
        taskTitle: wl.task.title,
        duration: wl.duration,
        description: wl.description,
        logDate: wl.logDate.toISOString(),
      })),
      attendedMeetings,
      overdueTasks,
      suggestedContent,
      suggestedBlockers,
      suggestedPlannedTomorrow,
      totalWorkMinutes,
    };
  }

  private buildSuggestedContent(params: {
    completedTasks: DraftTaskItem[];
    completedQuickTasks: DraftTaskItem[];
    workLogs: { task: { title: string }; duration: number; description: string | null }[];
    attendedMeetings: DraftMeetingItem[];
    totalWorkMinutes: number;
  }): string {
    const lines: string[] = ['### Công việc đã hoàn thành hôm nay:'];

    if (params.completedTasks.length === 0 && params.completedQuickTasks.length === 0) {
      lines.push('- Đang tập trung xử lý các hạng mục công việc trong tiến trình sprint.');
    } else {
      for (const t of params.completedTasks) {
        lines.push(`- [x] **${t.title}** (${t.projectName})`);
      }
      for (const q of params.completedQuickTasks) {
        lines.push(`- [x] [Việc nhanh] **${q.title}**`);
      }
    }

    if (params.workLogs.length > 0) {
      lines.push('\n### Nhật ký thời gian (Work Logs):');
      for (const wl of params.workLogs) {
        const hours = (wl.duration / 60).toFixed(1);
        lines.push(`- ${wl.task.title}: ${hours}h ${wl.description ? `(${wl.description})` : ''}`);
      }
    }

    if (params.attendedMeetings.length > 0) {
      lines.push('\n### Cuộc họp đã tham dự:');
      for (const m of params.attendedMeetings) {
        lines.push(`- 👥 ${m.title} (${m.durationMinutes} phút)`);
      }
    }

    return lines.join('\n');
  }

  private buildSuggestedBlockers(overdueTasks: OverdueTaskItem[]): string {
    if (overdueTasks.length === 0) {
      return 'Không có khó khăn hay vướng mắc đáng kể. Tiến độ công việc ổn định.';
    }
    const lines = ['Các đầu việc đang bị chậm hoặc cần hỗ trợ:'];
    for (const t of overdueTasks.slice(0, 5)) {
      lines.push(`- ⚠️ **${t.title}** (Quá hạn ${t.daysOverdue} ngày - Ưu tiên ${t.priority})`);
    }
    return lines.join('\n');
  }

  private buildSuggestedTomorrow(overdueTasks: OverdueTaskItem[]): string {
    const lines = ['Kế hoạch thực hiện ngày mai:'];
    if (overdueTasks.length > 0) {
      for (const t of overdueTasks.slice(0, 3)) {
        lines.push(`- [ ] Ưu tiên giải quyết dứt điểm: **${t.title}**`);
      }
    }
    lines.push('- [ ] Tiếp tục triển khai các task tiếp theo trong Sprint hiện tại.');
    lines.push('- [ ] Tham gia các cuộc họp và cập nhật tiến độ công việc.');
    return lines.join('\n');
  }
}
