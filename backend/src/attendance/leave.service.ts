import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeaveBalanceService } from './leave-balance.service.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { AttendanceStatus, LeaveRequest, LeaveType, RequestStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalance: LeaveBalanceService,
  ) {}

  private parseDateOnly(dateString: string): Date {
    return new Date(`${dateString}T00:00:00.000Z`);
  }

  /**
   * Enumerate each date between startDate and endDate inclusive
   */
  private enumerateDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate.getTime());
    while (current <= endDate) {
      dates.push(new Date(current.getTime()));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /**
   * Calculate expected dayCount and validate against user input.
   * Allows 0.5 only when startDate equals endDate.
   */
  private calculateAndValidateDayCount(startDate: Date, endDate: Date, requestedDayCount: number): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffCalendarDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Single-day half-day option
    if (diffCalendarDays === 1 && requestedDayCount === 0.5) {
      return 0.5;
    }

    if (requestedDayCount !== diffCalendarDays) {
      throw new BadRequestException({
        code: 'DAY_COUNT_MISMATCH',
        message: `Số ngày không khớp với khoảng thời gian đã chọn. Tính tự động: ${diffCalendarDays} ngày, bạn nhập: ${requestedDayCount} ngày / Day count mismatch: calculated ${diffCalendarDays}, entered ${requestedDayCount}`,
      });
    }

    return diffCalendarDays;
  }

  async createRequest(userId: string, dto: CreateLeaveDto): Promise<LeaveRequest> {
    const startDate = this.parseDateOnly(dto.startDate);
    const endDate = this.parseDateOnly(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc / Start date cannot be after end date',
      });
    }

    const dayCount = this.calculateAndValidateDayCount(startDate, endDate, dto.dayCount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Check for overlapping requests
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          userId,
          status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.AUTO_APPROVED] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      if (overlap) {
        throw new ConflictException({
          code: 'LEAVE_OVERLAP',
          message: 'Khoảng thời gian này trùng với một đơn nghỉ phép khác đã tạo / Selected date range overlaps with an existing leave request',
        });
      }

      // 2. Validate leave balance for ANNUAL leave
      if (dto.leaveType === LeaveType.ANNUAL) {
        await this.leaveBalance.validateBalance(userId, dayCount, startDate.getFullYear(), tx);
      }

      // 3. Create leave request
      return tx.leaveRequest.create({
        data: {
          userId,
          startDate,
          endDate,
          leaveType: dto.leaveType,
          dayCount,
          reason: dto.reason,
          status: RequestStatus.PENDING,
        },
      });
    });
  }

  async getMyRequests(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getPendingRequests() {
    return this.prisma.leaveRequest.findMany({
      where: { status: RequestStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async approveRequest(id: string, reviewerId: string): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu nghỉ phép / Leave request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu nghỉ phép đã được xử lý / Request is already reviewed');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Upsert attendance record for EVERY date in the leave range
    const dates = this.enumerateDates(request.startDate, request.endDate);
    for (const date of dates) {
      await this.prisma.attendanceRecord.upsert({
        where: {
          userId_date: {
            userId: request.userId,
            date,
          },
        },
        create: {
          userId: request.userId,
          date,
          status: AttendanceStatus.ABSENT_APPROVED,
          checkInTime: null,
          note: `Nghỉ phép (${request.leaveType}): ${request.reason}`,
        },
        update: {
          status: AttendanceStatus.ABSENT_APPROVED,
          note: `Nghỉ phép (${request.leaveType}): ${request.reason}`,
        },
      });
    }

    return updated;
  }

  async rejectRequest(id: string, reviewerId: string): Promise<LeaveRequest> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu nghỉ phép / Leave request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu nghỉ phép đã được xử lý / Request is already reviewed');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}
