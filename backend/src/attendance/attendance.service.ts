import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IpValidationService } from './ip-validation.service.js';
import { GeoValidationService } from './geo-validation.service.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { AttendanceStatus, AttendanceRecord, Prisma } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ipValidation: IpValidationService,
    private readonly geoValidation: GeoValidationService,
  ) {}

  /**
   * Helper to get start of day (midnight UTC) for date representation in PostgreSQL @db.Date
   */
  private getLocalDateOnly(date = new Date(), timezone = 'Asia/Ho_Chi_Minh'): Date {
    let dateStr: string;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dateStr = formatter.format(date); // YYYY-MM-DD
    } catch {
      dateStr = date.toISOString().split('T')[0];
    }
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  /**
   * Validate whether current time falls within allowed checkin window (e.g. 06:00 to 12:00)
   */
  private isWithinCheckinWindow(
    now: Date,
    checkinStartTime = '06:00',
    checkinEndTime = '12:00',
    timezone = 'Asia/Ho_Chi_Minh',
  ): boolean {
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const [currentHourStr, currentMinStr] = timeFormatter.format(now).split(':');
      const currentMinutes = parseInt(currentHourStr, 10) * 60 + parseInt(currentMinStr, 10);

      const [startH, startM] = checkinStartTime.split(':').map(Number);
      const [endH, endM] = checkinEndTime.split(':').map(Number);

      const startMinutes = (Number.isNaN(startH) ? 6 : startH) * 60 + (Number.isNaN(startM) ? 0 : startM);
      const endMinutes = (Number.isNaN(endH) ? 23 : endH) * 60 + (Number.isNaN(endM) ? 59 : endM);

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return true; // Fallback gracefully if formatting encounters unknown timezone
    }
  }

  /**
   * Determine attendance status based on arrival time vs workStartTime
   */
  private determineStatus(now: Date, workStartTime: string, timezone = 'Asia/Ho_Chi_Minh'): AttendanceStatus {
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const [currentHourStr, currentMinStr] = timeFormatter.format(now).split(':');
      const currentMinutes = parseInt(currentHourStr, 10) * 60 + parseInt(currentMinStr, 10);

      const [startHourStr, startMinStr] = workStartTime.split(':');
      const startMinutes = parseInt(startHourStr, 10) * 60 + parseInt(startMinStr, 10);

      const diff = currentMinutes - startMinutes;

      if (diff <= 0) return AttendanceStatus.ON_TIME;
      if (diff <= 15) return AttendanceStatus.LATE;
      if (diff <= 60) return AttendanceStatus.VERY_LATE;
      return AttendanceStatus.ABSENT_UNAPPROVED;
    } catch {
      return AttendanceStatus.ON_TIME;
    }
  }

  async checkIn(userId: string, dto: CheckInDto, now = new Date()): Promise<AttendanceRecord> {
    let config = await this.prisma.systemConfig.findFirst();
    if (!config) {
      try {
        config = await this.getSettings();
      } catch {
        // Fallback for mocked unit tests where prisma.systemConfig.create is not defined
      }
    }
    if (!config) {
      throw new InternalServerErrorException('System config not initialized / Cấu hình hệ thống chưa được khởi tạo');
    }

    const timezone = config.timezone || 'Asia/Ho_Chi_Minh';

    // 1. Validate checkin window (e.g. 06:00 to 12:00)
    const withinWindow = this.isWithinCheckinWindow(
      now,
      config.checkinStartTime,
      config.checkinEndTime,
      timezone,
    );
    if (!withinWindow) {
      throw new BadRequestException({
        code: 'OUTSIDE_CHECKIN_WINDOW',
        message: `Chỉ được phép check-in từ ${config.checkinStartTime} đến ${config.checkinEndTime} / Check-in is only allowed between ${config.checkinStartTime} and ${config.checkinEndTime}`,
      });
    }

    const today = this.getLocalDateOnly(now, timezone);

    // 2. Check if already checked in
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_IN',
        message: 'Bạn đã check-in hôm nay rồi / You have already checked in today',
      });
    }

    // 3. Check if user has an approved WFH request today
    const approvedWfh = await this.prisma.wfhRequest.findFirst({
      where: {
        userId,
        date: today,
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
      },
    });

    // 4. Status logic
    let status: AttendanceStatus;
    if (approvedWfh) {
      status = AttendanceStatus.WFH;
    } else {
      status = this.determineStatus(now, config.workStartTime, timezone);
    }

    // 5. IP validation
    const ipAllowed = dto.ipAddress
      ? this.ipValidation.isAllowed(dto.ipAddress, config.allowedIpRanges)
      : false;

    // 6. GPS validation
    const gpsValid =
      dto.latitude != null && dto.longitude != null
        ? this.geoValidation.isWithinRadius(
            dto.latitude,
            dto.longitude,
            config.officeLatitude,
            config.officeLongitude,
            config.gpsRadiusMeters,
          )
        : false;

    // 7. Determine check-in method
    let checkInMethod: string;
    if (dto.latitude != null && dto.longitude != null && gpsValid) {
      checkInMethod = 'GPS';
    } else if (ipAllowed) {
      checkInMethod = 'IP';
    } else {
      checkInMethod = 'MANUAL';
    }

    // 8. Notes
    let note = dto.note ?? null;
    if (!note) {
      if (!approvedWfh && !gpsValid && !ipAllowed) {
        note = 'Check-in ngoài vùng văn phòng (IP/GPS không khớp)';
      }
    }

    return this.prisma.attendanceRecord.create({
      data: {
        userId,
        date: today,
        status,
        checkInTime: now,
        checkInIp: dto.ipAddress ?? null,
        checkInLat: dto.latitude ?? null,
        checkInLng: dto.longitude ?? null,
        checkInMethod,
        note,
      },
    });
  }

  async checkOut(userId: string, dto: CheckOutDto, now = new Date()): Promise<AttendanceRecord> {
    const config = await this.prisma.systemConfig.findFirst();
    const timezone = config?.timezone ?? 'Asia/Ho_Chi_Minh';
    const today = this.getLocalDateOnly(now, timezone);

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!existing) {
      throw new BadRequestException({
        code: 'NOT_CHECKED_IN',
        message: 'Bạn chưa check-in hôm nay / You have not checked in today yet',
      });
    }

    if (existing.checkOutTime) {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_OUT',
        message: 'Bạn đã check-out hôm nay rồi / You have already checked out today',
      });
    }

    // ⚠️ Chặn check-out trước check-in.
    // Trường hợp này tạo ra bản ghi "vô lý" (checkOut < checkIn) khiến
    // frontend tính giờ làm = 0 và hiển thị sai (Working 0.0h, Trễ/OT "—").
    if (existing.checkInTime && now < existing.checkInTime) {
      throw new BadRequestException({
        code: 'CHECKOUT_BEFORE_CHECKIN',
        message:
          'Giờ check-out phải sau giờ check-in / Check-out time must be after check-in time',
      });
    }

    // GD2: Determine if early leave approved/unapproved
    let finalStatus = existing.status;
    const workEnd = new Date(today);
    workEnd.setHours(17, 30, 0, 0);
    if (now < workEnd) {
      const earlyLeave = await this.prisma.earlyLeaveRequest.findFirst({
        where: {
          userId,
          date: today,
          status: 'APPROVED',
        },
      });
      // If expectedLeaveTime >= now, the early leave is still valid (didn't leave too early)
      if (earlyLeave && new Date(earlyLeave.expectedLeaveTime).getTime() >= now.getTime()) {
        finalStatus = 'EARLY_LEAVE_APPROVED';
      } else {
        finalStatus = 'EARLY_LEAVE_UNAPPROVED';
      }
    }

    // GD2: Update OT actual hours if approved request exists
    if (now > workEnd) {
      const otRequest = await this.prisma.overtimeRequest.findFirst({
        where: { userId, date: today, status: 'APPROVED' },
      });
      if (otRequest) {
        const actualMinutes = Math.floor((now.getTime() - workEnd.getTime()) / 60000);
        const actualHours = Math.min(otRequest.registeredHours, actualMinutes / 60);
        const rounded = Math.round(actualHours * 10) / 10;
        await this.prisma.overtimeRequest.update({
          where: { id: otRequest.id },
          data: { actualHours: rounded },
        });
      }
    }

    return this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        status: finalStatus,
        note: dto.note ? (existing.note ? `${existing.note} | ${dto.note}` : dto.note) : existing.note,
      },
    });
  }

  /**
   * Xóa bản ghi điểm danh.
   *
   * Dùng để gỡ bản ghi sai (ví dụ check-out bị ghi nhầm sang ngày hôm trước,
   * hoặc check-in nhầm buổi) khiến giờ làm hiển thị sai.
   *
   * Quyền: chủ sở hữu bản ghi, hoặc ADMIN/HR/PM (quản lý nhân sự).
   */
  async deleteRecord(
    userId: string,
    recordId: string,
    actor: { id: string; role: string },
  ): Promise<{ success: boolean; message: string }> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      select: { id: true, userId: true, date: true },
    });

    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi điểm danh / Attendance record not found');
    }

    const isOwner = record.userId === userId;
    const isManager = ['ADMIN', 'HR', 'PM'].includes(actor.role);

    if (!isOwner && !isManager) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa bản ghi này / You are not allowed to delete this record',
      );
    }

    await this.prisma.attendanceRecord.delete({ where: { id: recordId } });

    return {
      success: true,
      message: 'Đã xóa bản ghi điểm danh / Attendance record deleted',
    };
  }

  async getToday(userId: string, now = new Date()) {
    const config = await this.prisma.systemConfig.findFirst();
    const today = this.getLocalDateOnly(now, config?.timezone ?? 'Asia/Ho_Chi_Minh');

    const [record, wfhRequest, leaveRequest] = await Promise.all([
      this.prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      this.prisma.wfhRequest.findFirst({
        where: { userId, date: today },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.findFirst({
        where: {
          userId,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      record,
      wfhRequest,
      leaveRequest,
      config: config
        ? {
            companyName: config.companyName,
            workStartTime: config.workStartTime,
            workEndTime: config.workEndTime,
            checkinStartTime: config.checkinStartTime,
            checkinEndTime: config.checkinEndTime,
            officeLatitude: config.officeLatitude,
            officeLongitude: config.officeLongitude,
            gpsRadiusMeters: config.gpsRadiusMeters,
          }
        : null,
    };
  }

  async getHistory(userId: string, fromDate?: string, toDate?: string) {
    const where: Prisma.AttendanceRecordWhereInput = { userId };

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) where.date.lte = new Date(`${toDate}T23:59:59.999Z`);
    } else {
      // Default: from Jan 1st of current year (covers full-year heatmap & historical stats)
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      where.date = { gte: startOfYear };
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get team attendance for PM, HR, ADMIN
   */
  async getTeamAttendance(
    userId: string,
    role: string,
    query: { projectId?: string; date?: string },
  ) {
    const config = await this.prisma.systemConfig.findFirst();
    const targetDate = query.date
      ? new Date(`${query.date}T00:00:00.000Z`)
      : this.getLocalDateOnly(new Date(), config?.timezone ?? 'Asia/Ho_Chi_Minh');

    let projectWhere: Prisma.ProjectWhereInput = {
      deletedAt: null,
      kind: 'TEAM',
    };

    if (role === 'PM') {
      projectWhere = {
        deletedAt: null,
        kind: 'TEAM',
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      };
    }

    if (query.projectId) {
      projectWhere.id = query.projectId;
    }

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        color: true,
        members: {
          select: {
            userId: true,
            projectRole: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                position: true,
              },
            },
          },
        },
      },
    });

    const userMap = new Map<string, { user: any; projectRoles: string[]; projectNames: string[] }>();
    for (const proj of projects) {
      for (const m of proj.members) {
        if (!userMap.has(m.userId)) {
          userMap.set(m.userId, {
            user: m.user,
            projectRoles: [m.projectRole],
            projectNames: [proj.name],
          });
        } else {
          const entry = userMap.get(m.userId)!;
          if (!entry.projectRoles.includes(m.projectRole)) entry.projectRoles.push(m.projectRole);
          if (!entry.projectNames.includes(proj.name)) entry.projectNames.push(proj.name);
        }
      }
    }

    const memberIds = Array.from(userMap.keys());

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        userId: { in: memberIds },
        date: targetDate,
      },
    });

    const recordMap = new Map<string, (typeof records)[0]>();
    for (const rec of records) {
      recordMap.set(rec.userId, rec);
    }

    const teamAttendanceList = memberIds.map((mId) => {
      const { user, projectRoles, projectNames } = userMap.get(mId)!;
      const rec = recordMap.get(mId);
      return {
        userId: mId,
        user,
        projectRoles,
        projectNames,
        record: rec ?? null,
        status: rec?.status ?? 'NOT_CHECKED_IN',
        checkInTime: rec?.checkInTime ?? null,
        checkOutTime: rec?.checkOutTime ?? null,
        checkInMethod: rec?.checkInMethod ?? null,
      };
    });

    const presentCount = records.length;
    const onTimeCount = records.filter((r) => r.status === 'ON_TIME').length;
    const lateCount = records.filter((r) => r.status === 'LATE' || r.status === 'VERY_LATE').length;
    const wfhCount = records.filter((r) => r.status === 'WFH').length;
    const missingCount = memberIds.length - presentCount;

    return {
      date: targetDate.toISOString().split('T')[0],
      projects: projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
      summary: {
        totalMembers: memberIds.length,
        presentCount,
        onTimeCount,
        lateCount,
        wfhCount,
        missingCount,
      },
      members: teamAttendanceList,
    };
  }

  /**
   * Get company-wide attendance for HR and ADMIN
   */
  async getCompanyAttendance(query: { fromDate?: string; toDate?: string; departmentId?: string }) {
    const config = await this.prisma.systemConfig.findFirst();
    const today = this.getLocalDateOnly(new Date(), config?.timezone ?? 'Asia/Ho_Chi_Minh');

    const from = query.fromDate ? new Date(`${query.fromDate}T00:00:00.000Z`) : today;
    const to = query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : today;

    const userWhere: Prisma.UserWhereInput = {
      status: 'ACTIVE',
    };
    if (query.departmentId) {
      userWhere.departmentId = query.departmentId;
    }

    const [allUsers, departments, records] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          position: true,
          role: true,
          departmentId: true,
        },
      }),
      this.prisma.department.findMany({
        select: { id: true, name: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          date: { gte: from, lte: to },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, departmentId: true, avatar: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const deptMap = new Map<string, string>();
    for (const d of departments) {
      deptMap.set(d.id, d.name);
    }

    const counts: Record<string, number> = {};
    for (const r of records) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }

    return {
      dateRange: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      departments,
      summary: {
        totalEmployees: allUsers.length,
        totalRecords: records.length,
        onTime: counts['ON_TIME'] ?? 0,
        late: (counts['LATE'] ?? 0) + (counts['VERY_LATE'] ?? 0),
        wfh: counts['WFH'] ?? 0,
        absentApproved: counts['ABSENT_APPROVED'] ?? 0,
        earlyLeave: counts['EARLY_LEAVE_APPROVED'] ?? 0,
      },
      records: records.map((r: (typeof records)[number]) => ({
        ...r,
        departmentName: r.user?.departmentId ? deptMap.get(r.user.departmentId) ?? 'Chung' : 'FPT Software',
      })),
    };
  }

  /**
   * Get system attendance configuration for Admin
   */
  async getSettings() {
    let config = await this.prisma.systemConfig.findFirst();
    if (!config) {
      config = await this.prisma.systemConfig.create({
        data: {
          companyName: 'FPT Complex Đà Nẵng',
          companyLogoUrl: '/logo.png',
          timezone: 'Asia/Ho_Chi_Minh',
          workStartTime: '08:30',
          workEndTime: '17:30',
          checkinStartTime: '00:00',
          checkinEndTime: '23:59',
          allowedIpRanges: ['127.0.0.1', '::1', '192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '118.69.0.0/16', '0.0.0.0/0'],
          officeLatitude: 15.9686,
          officeLongitude: 108.2608,
          gpsRadiusMeters: 5000,
          wfhAutoApproveTime: '09:30',
        },
      });
    }
    return config;
  }

  /**
   * Update system attendance configuration (ADMIN only)
   */
  async updateSettings(dto: any) {
    const config = await this.getSettings();
    return this.prisma.systemConfig.update({
      where: { id: config.id },
      data: dto,
    });
  }

  /**
   * Audit an employee's attendance, working hours, and submitted requests
   * For HR, ADMIN, and DEPARTMENT_HEAD (within their department), or EMPLOYEE (themselves)
   */
  async getEmployeeAudit(
    userId: string,
    query: { fromDate?: string; toDate?: string },
    actor: { id: string; role: string; departmentId?: string | null },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        position: true,
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Nhân viên không tồn tại trong hệ thống');
    }

    if (actor.role === 'DEPARTMENT_HEAD' && user.departmentId !== actor.departmentId) {
      throw new ForbiddenException('Trưởng phòng chỉ được tra cứu nhân viên thuộc phòng ban của mình');
    }

    if (actor.role === 'EMPLOYEE' && actor.id !== userId) {
      throw new ForbiddenException('Bạn chỉ có quyền xem hồ sơ chuyên cần của chính mình');
    }

    // Determine date range
    let from: Date;
    let to: Date;

    if (query.fromDate && query.toDate) {
      from = new Date(`${query.fromDate}T00:00:00.000Z`);
      to = new Date(`${query.toDate}T23:59:59.999Z`);
    } else {
      const now = new Date();
      from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    // Fetch attendance records, leaves, wfhs, and overtimes in parallel
    const [records, leaves, wfhs, overtimes] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          userId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          userId,
          startDate: { lte: to },
          endDate: { gte: from },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.wfhRequest.findMany({
        where: {
          userId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.overtimeRequest.findMany({
        where: {
          userId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    let onTimeDays = 0;
    let lateDays = 0;
    let wfhDays = 0;
    let leaveDays = 0;
    let totalWorkHours = 0;

    const mappedRecords = records.map((r) => {
      let workHours = 0;
      if (r.checkInTime && r.checkOutTime) {
        const diffMs = r.checkOutTime.getTime() - r.checkInTime.getTime();
        workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
      } else if (r.status === 'ON_TIME' || r.status === 'WFH') {
        workHours = 8.0;
      } else if (r.status === 'LATE' || r.status === 'VERY_LATE') {
        workHours = 7.5;
      }

      totalWorkHours += workHours;

      if (r.status === 'ON_TIME') onTimeDays++;
      else if (r.status === 'LATE' || r.status === 'VERY_LATE') lateDays++;
      else if (r.status === 'WFH') wfhDays++;
      else if (r.status === 'ABSENT_APPROVED' || r.status === 'ABSENT_UNAPPROVED') leaveDays++;

      return {
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        workHours,
        checkInMethod: r.checkInMethod,
        checkInIp: r.checkInIp,
        note: r.note,
      };
    });

    const attendedDays = onTimeDays + lateDays + wfhDays;
    const punctualityRate = attendedDays > 0 ? Math.round((onTimeDays / attendedDays) * 100) : 100;
    const averageHoursPerDay = attendedDays > 0 ? Math.round((totalWorkHours / attendedDays) * 10) / 10 : 0;

    return {
      user,
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      kpi: {
        totalDays: records.length,
        attendedDays,
        onTimeDays,
        lateDays,
        wfhDays,
        leaveDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        averageHoursPerDay,
        punctualityRate,
      },
      records: mappedRecords,
      requests: {
        leaves: leaves.map((l) => ({
          id: l.id,
          startDate: l.startDate.toISOString().split('T')[0],
          endDate: l.endDate.toISOString().split('T')[0],
          leaveType: l.leaveType,
          reason: l.reason,
          status: l.status,
          dayCount: l.dayCount,
          reviewedAt: l.reviewedAt,
        })),
        wfhs: wfhs.map((w) => ({
          id: w.id,
          date: w.date.toISOString().split('T')[0],
          reason: w.reason,
          status: w.status,
          expectedStart: w.expectedStart,
          expectedEnd: w.expectedEnd,
          reviewedAt: w.reviewedAt,
        })),
        overtimes: overtimes.map((o) => ({
          id: o.id,
          date: o.date.toISOString().split('T')[0],
          hours: o.registeredHours,
          reason: o.reason,
          status: o.status,
          reviewedAt: o.reviewedAt,
        })),
      },
    };
  }
}
