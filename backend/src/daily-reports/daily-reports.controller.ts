import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DailyReportsService } from './daily-reports.service.js';
import {
  SubmitDailyReportSchema,
  UpdateDailyReportSchema,
  ListDailyReportsQuerySchema,
} from './dto/submit-daily-report.dto.js';
import type { ActorContext } from './daily-reports.permissions.js';

function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') ?? 'param';
    const msg = firstIssue?.message ?? 'Tham số không hợp lệ';
    throw new BadRequestException(`[${path}] ${msg}`);
  }
  return result.data;
}

@Controller('daily-reports')
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  /**
   * 1. Lấy dữ liệu điền sẵn (draft) hôm nay từ 4 nguồn + task quá hạn
   */
  @Get('draft/today')
  async getTodayDraft(
    @CurrentUser() actor: ActorContext,
    @Query('date') date?: string,
  ) {
    return this.dailyReportsService.getDraft(actor.id, date);
  }

  /**
   * 2. Nộp báo cáo ngày
   */
  @Post()
  async submitReport(
    @CurrentUser() actor: ActorContext,
    @Body() rawBody: unknown,
  ) {
    const dto = parseOrThrow(SubmitDailyReportSchema, rawBody);
    return this.dailyReportsService.submitReport(actor, dto);
  }

  /**
   * 3. Lịch sử báo cáo cá nhân của tôi
   */
  @Get('mine')
  async getMyReports(
    @CurrentUser() actor: ActorContext,
    @Query() rawQuery: unknown,
  ) {
    const query = parseOrThrow(ListDailyReportsQuerySchema, rawQuery);
    return this.dailyReportsService.getMyReports(actor.id, query);
  }

  /**
   * 4. Ma trận báo cáo tuần của team (Mon -> Sun) dành cho PM / Trưởng phòng / Admin
   */
  @Get('team/weekly')
  async getTeamWeeklyOverview(
    @CurrentUser() actor: ActorContext,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.dailyReportsService.getTeamWeeklyOverview(actor, weekStart);
  }

  /**
   * 5. Chi tiết báo cáo của team theo ngày
   */
  @Get('team/daily')
  async getTeamDailyReports(
    @CurrentUser() actor: ActorContext,
    @Query() rawQuery: unknown,
  ) {
    const query = parseOrThrow(ListDailyReportsQuerySchema, rawQuery);
    return this.dailyReportsService.getTeamDailyReports(actor, query);
  }

  /**
   * 6. Lấy chi tiết một báo cáo
   */
  @Get(':id')
  async getReportById(
    @CurrentUser() actor: ActorContext,
    @Param('id') id: string,
  ) {
    return this.dailyReportsService.getReportById(actor, id);
  }

  /**
   * 7. Chỉnh sửa báo cáo (nếu chưa bị khoá)
   */
  @Patch(':id')
  async updateReport(
    @CurrentUser() actor: ActorContext,
    @Param('id') id: string,
    @Body() rawBody: unknown,
  ) {
    const dto = parseOrThrow(UpdateDailyReportSchema, rawBody);
    return this.dailyReportsService.updateReport(actor, id, dto);
  }
}
