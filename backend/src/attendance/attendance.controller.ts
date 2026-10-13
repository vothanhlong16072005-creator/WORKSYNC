import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AttendanceService } from './attendance.service.js';
import { WfhService } from './wfh.service.js';
import { LeaveService } from './leave.service.js';
import { LeaveBalanceService } from './leave-balance.service.js';
import { AutoApproveService } from './auto-approve.service.js';
import { ExportService } from './export.service.js';
import { EarlyLeaveService } from './early-leave.service.js';
import { OvertimeService } from './overtime.service.js';
import { BreakService } from './break.service.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { CreateWfhDto } from './dto/create-wfh.dto.js';
import { CreateLeaveDto } from './dto/create-leave.dto.js';
import { ReviewRequestDto } from './dto/review-request.dto.js';
import { CreateEarlyLeaveDto } from './dto/create-early-leave.dto.js';
import { ReviewEarlyLeaveDto } from './dto/review-early-leave.dto.js';
import { CreateOvertimeDto } from './dto/create-overtime.dto.js';
import { ReviewOvertimeDto } from './dto/review-overtime.dto.js';
import { OFFICE_PRESETS } from './utils/office-presets.js';

interface RequestActor {
  id: string;
  email: string;
  role: string;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly wfhService: WfhService,
    private readonly leaveService: LeaveService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly autoApproveService: AutoApproveService,
    private readonly exportService: ExportService,
    private readonly earlyLeaveService: EarlyLeaveService,
    private readonly overtimeService: OvertimeService,
    private readonly breakService: BreakService,
  ) {}

  @Post('check-in')
  async checkIn(
    @CurrentUser() user: RequestActor,
    @Body() dto: CheckInDto,
    @Req() req: Request,
  ) {
    // If client IP is not passed in body, fallback to express request IP
    if (!dto.ipAddress) {
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '127.0.0.1';
      dto.ipAddress = rawIp;
    }
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Post('check-out')
  async checkOut(
    @CurrentUser() user: RequestActor,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(user.id, dto);
  }

  @Get('today')
  async getToday(@CurrentUser() user: RequestActor) {
    return this.attendanceService.getToday(user.id);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: RequestActor,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.attendanceService.getHistory(user.id, fromDate, toDate);
  }

  @Get('leave-balance')
  async getLeaveBalance(@CurrentUser() user: RequestActor) {
    return this.leaveBalanceService.getBalance(user.id);
  }

  // --- GD1: Office Presets & Export ---

  @Get('office-presets')
  async getOfficePresets() {
    return OFFICE_PRESETS;
  }

  @Get('export/excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportExcel(
    @CurrentUser() user: RequestActor,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    // PM/HR/Admin can export other users' data; EMPLOYEE only their own
    const isManager = ['ADMIN', 'HR', 'PM'].includes(user.role);
    const targetUserId = isManager && userId ? userId : user.id;
    const includeUserInfo = isManager && !!userId;

    const buffer = await this.exportService.generateExcel({
      userId: targetUserId,
      fromDate,
      toDate,
      includeUserInfo,
    });

    const filename = `attendance_${user.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res?.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res?.send(buffer);
  }

  @Get('export/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPDF(
    @CurrentUser() user: RequestActor,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    const isManager = ['ADMIN', 'HR', 'PM'].includes(user.role);
    const targetUserId = isManager && userId ? userId : user.id;
    const includeUserInfo = isManager && !!userId;

    const buffer = await this.exportService.generatePDF(
      { userId: targetUserId, fromDate, toDate, includeUserInfo },
      'WorkSync',
    );

    const filename = `attendance_${user.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    res?.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res?.send(buffer);
  }

  @Get('requests')
  async getMyRequests(@CurrentUser() user: RequestActor) {
    const [wfh, leaves] = await Promise.all([
      this.wfhService.getMyRequests(user.id),
      this.leaveService.getMyRequests(user.id),
    ]);
    return { wfh, leaves };
  }

  @Post('wfh')
  async createWfh(
    @CurrentUser() user: RequestActor,
    @Body() dto: CreateWfhDto,
  ) {
    return this.wfhService.createRequest(user.id, dto);
  }

  @Post('leave-request')
  async createLeave(
    @CurrentUser() user: RequestActor,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.createRequest(user.id, dto);
  }

  // --- HR / PM Approval Queue Endpoints ---

  @Get('wfh-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async getPendingWfhRequests() {
    return this.wfhService.getPendingRequests();
  }

  @Patch('wfh-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async approveWfh(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
  ) {
    return this.wfhService.approveRequest(id, user.id);
  }

  @Patch('wfh-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async rejectWfh(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
    @Body() dto: ReviewRequestDto,
  ) {
    return this.wfhService.rejectRequest(id, user.id, dto.rejectionNote);
  }

  @Patch('wfh-requests/auto-approve-pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR')
  async autoApprovePending() {
    return this.autoApproveService.autoApprovePending();
  }

  @Get('leave-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async getPendingLeaveRequests() {
    return this.leaveService.getPendingRequests();
  }

  @Patch('leave-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
  ) {
    return this.leaveService.approveRequest(id, user.id);
  }

  @Patch('leave-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async rejectLeave(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
  ) {
    return this.leaveService.rejectRequest(id, user.id);
  }

  // --- GD2: Early Leave ---

  @Post('early-leave')
  async createEarlyLeave(
    @CurrentUser() user: RequestActor,
    @Body() dto: CreateEarlyLeaveDto,
  ) {
    return this.earlyLeaveService.createRequest(user.id, dto);
  }

  @Get('early-leave/mine')
  async getMyEarlyLeave(@CurrentUser() user: RequestActor) {
    return this.earlyLeaveService.getMyRequests(user.id);
  }

  @Get('early-leave/pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async getPendingEarlyLeave() {
    return this.earlyLeaveService.getPendingRequests();
  }

  @Patch('early-leave/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async approveEarlyLeave(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
  ) {
    return this.earlyLeaveService.approve(id, user.id);
  }

  @Patch('early-leave/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async rejectEarlyLeave(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
    @Body() dto: ReviewEarlyLeaveDto,
  ) {
    return this.earlyLeaveService.reject(id, user.id, dto);
  }

  // --- GD2: Overtime ---

  @Post('overtime')
  async createOvertime(
    @CurrentUser() user: RequestActor,
    @Body() dto: CreateOvertimeDto,
  ) {
    return this.overtimeService.createRequest(user.id, dto);
  }

  @Get('overtime/mine')
  async getMyOvertime(@CurrentUser() user: RequestActor) {
    return this.overtimeService.getMyRequests(user.id);
  }

  @Get('overtime/pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async getPendingOvertime() {
    return this.overtimeService.getPendingRequests();
  }

  @Patch('overtime/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async approveOvertime(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
  ) {
    return this.overtimeService.approve(id, user.id);
  }

  @Patch('overtime/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'HR', 'PM')
  async rejectOvertime(
    @Param('id') id: string,
    @CurrentUser() user: RequestActor,
    @Body() dto: ReviewOvertimeDto,
  ) {
    return this.overtimeService.reject(id, user.id, dto);
  }

  // --- GD2: Break Tracking ---

  @Post('break/start')
  async startBreak(
    @CurrentUser() user: RequestActor,
    @Body() body: { reason?: string },
  ) {
    return this.breakService.startBreak(user.id, body?.reason);
  }

  @Post('break/end')
  async endBreak(@CurrentUser() user: RequestActor) {
    return this.breakService.endBreak(user.id);
  }

  @Get('break/today')
  async getTodayBreaks(@CurrentUser() user: RequestActor) {
    return this.breakService.getTodayBreaks(user.id);
  }
}
