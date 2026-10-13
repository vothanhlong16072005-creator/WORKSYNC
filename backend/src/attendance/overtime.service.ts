import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOvertimeDto } from './dto/create-overtime.dto.js';
import { ReviewOvertimeDto } from './dto/review-overtime.dto.js';
import { calculateActualOTHours } from './utils/time-calculator.js';

@Injectable()
export class OvertimeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new overtime request
   * Validation:
   * - registeredEnd must be after registeredStart
   * - registeredHours must be <= 12 (overtime cap)
   * - registeredEnd must be after 17:30 (work end)
   * - user must not have an existing request for the same date
   */
  async createRequest(userId: string, dto: CreateOvertimeDto) {
    const requestDate = new Date(dto.date);
    requestDate.setHours(0, 0, 0, 0);

    const start = new Date(dto.registeredStart);
    const end = new Date(dto.registeredEnd);

    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const workEnd = new Date(requestDate);
    workEnd.setHours(17, 30, 0, 0);
    if (start < workEnd) {
      throw new BadRequestException('Overtime start must be after 17:30 (work end)');
    }

    const diffMs = end.getTime() - start.getTime();
    const hours = Math.round((diffMs / 3600000) * 10) / 10;
    if (hours <= 0) {
      throw new BadRequestException('Overtime hours must be positive');
    }
    if (hours > 12) {
      throw new BadRequestException('Overtime cannot exceed 12 hours per day');
    }

    const existing = await this.prisma.overtimeRequest.findUnique({
      where: { userId_date: { userId, date: requestDate } },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã có đơn OT cho ngày này / You already have an OT request for this date');
    }

    return this.prisma.overtimeRequest.create({
      data: {
        userId,
        date: requestDate,
        registeredStart: start,
        registeredEnd: end,
        registeredHours: hours,
        reason: dto.reason,
      },
    });
  }

  async getMyRequests(userId: string) {
    return this.prisma.overtimeRequest.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getPendingRequests() {
    return this.prisma.overtimeRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  }

  async approve(id: string, reviewerId: string) {
    const request = await this.prisma.overtimeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Overtime request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }
    return this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async reject(id: string, reviewerId: string, dto: ReviewOvertimeDto) {
    const request = await this.prisma.overtimeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Overtime request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }
    return this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Update actual hours when user checks out.
   * HRM standard: actualOT = min(registered, checkOut - 17:30)
   */
  async updateActualHours(userId: string, date: Date, checkOut: Date) {
    const request = await this.prisma.overtimeRequest.findFirst({
      where: { userId, date, status: 'APPROVED' },
    });
    if (!request) return null;

    const actual = calculateActualOTHours(checkOut, request.registeredHours);
    return this.prisma.overtimeRequest.update({
      where: { id: request.id },
      data: { actualHours: actual },
    });
  }
}
