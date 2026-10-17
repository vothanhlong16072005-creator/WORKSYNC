import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWfhDto } from './dto/create-wfh.dto.js';
import { AttendanceStatus, RequestStatus, WfhRequest, Prisma } from '@prisma/client';

import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';

@Injectable()
export class WfhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly triggers: NotificationTriggersService,
  ) {}

  private parseDateOnly(dateString: string): Date {
    return new Date(`${dateString}T00:00:00.000Z`);
  }

  async createRequest(userId: string, dto: CreateWfhDto): Promise<WfhRequest> {
    const targetDate = this.parseDateOnly(dto.date);

    // 1. Validate date is not in the past (must be today or future)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = this.parseDateOnly(todayStr);
    if (targetDate < todayDate) {
      throw new BadRequestException({
        code: 'DATE_IN_PAST',
        message: 'Không thể tạo đơn WFH cho ngày trong quá khứ / Cannot create WFH request for past dates',
      });
    }

    // 2. Validate time range (expectedEnd > expectedStart)
    const [startH, startM] = dto.expectedStart.split(':').map(Number);
    const [endH, endM] = dto.expectedEnd.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException({
        code: 'INVALID_TIME_RANGE',
        message: 'Giờ kết thúc phải sau giờ bắt đầu / Expected end time must be after start time',
      });
    }

    // 3. Check if active WFH already exists on that date
    const existingWfh = await this.prisma.wfhRequest.findFirst({
      where: {
        userId,
        date: targetDate,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.AUTO_APPROVED] },
      },
    });

    if (existingWfh) {
      throw new ConflictException({
        code: 'WFH_REQUEST_EXISTS',
        message: 'Bạn đã có yêu cầu WFH cho ngày này / You already have an active WFH request for this date',
      });
    }

    // 4. Check if user already has an active leave request covering this date
    const existingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.AUTO_APPROVED] },
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });

    if (existingLeave) {
      throw new ConflictException({
        code: 'WFH_LEAVE_CONFLICT',
        message: 'Bạn đã có đơn nghỉ phép vào ngày này / You already have a leave request covering this date',
      });
    }

    const request = await this.prisma.wfhRequest.create({
      data: {
        userId,
        date: targetDate,
        reason: dto.reason,
        expectedStart: dto.expectedStart,
        expectedEnd: dto.expectedEnd,
        status: RequestStatus.PENDING,
      },
    });

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });
      await this.triggers.attendanceRequestCreated({
        id: request.id,
        userId,
        type: 'WFH',
        departmentId: user?.departmentId,
      });
    } catch (err) {
      // Non-blocking notification error
    }

    return request;
  }

  async getMyRequests(userId: string) {
    return this.prisma.wfhRequest.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getPendingRequests(status?: RequestStatus) {
    const where: Prisma.WfhRequestWhereInput = status ? { status } : { status: RequestStatus.PENDING };
    return this.prisma.wfhRequest.findMany({
      where,
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
      orderBy: { date: 'desc' },
    });
  }

  async revertRequest(id: string): Promise<WfhRequest> {
    const request = await this.prisma.wfhRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu WFH / WFH request not found');
    }

    const updated = await this.prisma.wfhRequest.update({
      where: { id },
      data: {
        status: RequestStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
        rejectionNote: null,
      },
    });

    return updated;
  }

  async approveRequest(id: string, reviewerId: string): Promise<WfhRequest> {
    const request = await this.prisma.wfhRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu WFH / WFH request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu WFH đã được xử lý / Request is already reviewed');
    }

    const updated = await this.prisma.wfhRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // If an attendance record for this day exists, sync its status to WFH
    await this.prisma.attendanceRecord.updateMany({
      where: {
        userId: request.userId,
        date: request.date,
      },
      data: {
        status: AttendanceStatus.WFH,
      },
    });

    try {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: reviewerId },
        select: { name: true },
      });
      await this.triggers.attendanceRequestReviewed({
        id: updated.id,
        userId: updated.userId,
        type: 'WFH',
        status: 'APPROVED',
        reviewerId,
        reviewerName: reviewer?.name,
      });
    } catch (err) {
      // Non-blocking notification error
    }

    return updated;
  }

  async rejectRequest(id: string, reviewerId: string, rejectionNote?: string): Promise<WfhRequest> {
    const request = await this.prisma.wfhRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu WFH / WFH request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu WFH đã được xử lý / Request is already reviewed');
    }

    const updated = await this.prisma.wfhRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionNote: rejectionNote ?? null,
      },
    });

    try {
      const reviewer = await this.prisma.user.findUnique({
        where: { id: reviewerId },
        select: { name: true },
      });
      await this.triggers.attendanceRequestReviewed({
        id: updated.id,
        userId: updated.userId,
        type: 'WFH',
        status: 'REJECTED',
        reviewerId,
        reviewerName: reviewer?.name,
      });
    } catch (err) {
      // Non-blocking notification error
    }

    return updated;
  }
}
