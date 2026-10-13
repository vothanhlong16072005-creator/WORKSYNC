import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEarlyLeaveDto } from './dto/create-early-leave.dto.js';
import { ReviewEarlyLeaveDto } from './dto/review-early-leave.dto.js';

@Injectable()
export class EarlyLeaveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new early leave request
   * Validation:
   * - expectedLeaveTime must be before 17:30 (work end)
   * - date must not be in the past
   * - user must not have an existing request for the same date
   */
  async createRequest(userId: string, dto: CreateEarlyLeaveDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(dto.date);
    requestDate.setHours(0, 0, 0, 0);

    if (requestDate.getTime() < today.getTime()) {
      throw new BadRequestException('Cannot request early leave for past dates');
    }

    // expectedLeaveTime must be before 17:30
    const expectedTime = new Date(dto.expectedLeaveTime);
    const workEnd = new Date(requestDate);
    workEnd.setHours(17, 30, 0, 0);
    if (expectedTime.getTime() >= workEnd.getTime()) {
      throw new BadRequestException('Expected leave time must be before 17:30 (work end)');
    }

    // Check if request already exists for this date
    const existing = await this.prisma.earlyLeaveRequest.findUnique({
      where: { userId_date: { userId, date: requestDate } },
    });
    if (existing) {
      throw new ConflictException('Bạn đã có đơn về sớm cho ngày này / You already have an early leave request for this date');
    }

    return this.prisma.earlyLeaveRequest.create({
      data: {
        userId,
        date: requestDate,
        expectedLeaveTime: expectedTime,
        reason: dto.reason,
      },
    });
  }

  async getMyRequests(userId: string) {
    return this.prisma.earlyLeaveRequest.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getPendingRequests() {
    return this.prisma.earlyLeaveRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  }

  async approve(id: string, reviewerId: string) {
    const request = await this.prisma.earlyLeaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Early leave request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }
    return this.prisma.earlyLeaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async reject(id: string, reviewerId: string, dto: ReviewEarlyLeaveDto) {
    const request = await this.prisma.earlyLeaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Early leave request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }
    return this.prisma.earlyLeaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reason: dto.rejectionNote
          ? `${request.reason} | REJECTED: ${dto.rejectionNote}`
          : `${request.reason} | REJECTED`,
      },
    });
  }

  /**
   * Check if a user has an approved early leave request for a given date.
   * Used by attendance.service.ts when processing check-out.
   */
  async findApprovedForDate(userId: string, date: Date) {
    return this.prisma.earlyLeaveRequest.findFirst({
      where: {
        userId,
        date,
        status: 'APPROVED',
      },
    });
  }
}
