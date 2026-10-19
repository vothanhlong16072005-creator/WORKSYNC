import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodSchema } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CalendarService } from './calendar.service.js';
import type { AuthActor } from './calendar.permissions.js';
import { CalendarQuerySchema } from './dto/calendar-query.dto.js';
import { RescheduleSchema } from './dto/reschedule.dto.js';
import type { ItemKind, RescheduleResult, TimelineResponse } from './types/timeline.types.js';

function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') ?? 'param';
    const msg = firstIssue?.message ?? 'Invalid request parameters';
    throw new BadRequestException(`[${path}] ${msg}`);
  }
  return result.data;
}

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('timeline')
  async getTimeline(
    @Query() rawQuery: unknown,
    @CurrentUser() actor: AuthActor,
  ): Promise<TimelineResponse> {
    const query = parseOrThrow(CalendarQuerySchema, rawQuery);
    return this.calendarService.getTimeline(query, actor);
  }

  @Patch('items/:kind/:id/reschedule')
  async rescheduleItem(
    @Param('kind') kind: ItemKind,
    @Param('id') id: string,
    @Body() rawBody: unknown,
    @CurrentUser() actor: AuthActor,
  ): Promise<RescheduleResult> {
    const dto = parseOrThrow(RescheduleSchema, rawBody);
    return this.calendarService.rescheduleItem(kind, id, dto, actor);
  }

  @Get('export')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="worksync-calendar.ics"')
  async exportIcs(
    @Query() rawQuery: unknown,
    @CurrentUser() actor: AuthActor,
  ): Promise<string> {
    const query = parseOrThrow(CalendarQuerySchema, rawQuery);
    return this.calendarService.exportIcs(query, actor);
  }
}
