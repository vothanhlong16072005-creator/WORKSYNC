import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
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

      const startMinutes = (startH || 6) * 60 + (startM || 0);
      const endMinutes = (endH || 12) * 60 + (endM || 0);

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
    const config = await this.prisma.systemConfig.findFirst();
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
}
