/**
 * Meetings Controller — REST API (12 endpoints)
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md (Section 4.1)
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodSchema } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentActor } from '../projects/project-access.service.js';
import { AttendanceQueryDto, MeetingQueryDto, MeetingQuerySchema } from './dto/attendance-query.dto.js';
import { CreateMeetingDto, CreateMeetingSchema } from './dto/create-meeting.dto.js';
import { RsvpDto, RsvpSchema } from './dto/rsvp.dto.js';
import { SaveMinutesDto, SaveMinutesSchema } from './dto/save-minutes.dto.js';
import { UpdateMeetingDto, UpdateMeetingSchema } from './dto/update-meeting.dto.js';
import { MeetingsService } from './meetings.service.js';
import { MeetingAiService } from './meeting-ai.service.js';

/**
 * Safely parse a Zod schema and convert ZodError → 400 BadRequest.
 * Prevents raw ZodError from leaking as 500 Internal Server Error.
 */
function parseOrThrow<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') ?? 'body';
    const msg = firstIssue?.message ?? 'Invalid request body';
    throw new BadRequestException(`[${path}] ${msg}`);
  }
  return result.data;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: CurrentActor['role'];
    departmentId?: string | null;
  };
}

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingAiService: MeetingAiService,
  ) {}

  private extractActor(req: AuthenticatedRequest): CurrentActor {
    return {
      id: req.user.id,
      role: req.user.role,
      departmentId: req.user.departmentId ?? null,
    };
  }

  /**
   * 1. POST /api/meetings — Create meeting (scope: PROJECT / DEPARTMENT / ONE_ON_ONE)
   */
  @Post()
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const dto = parseOrThrow(CreateMeetingSchema, body) as CreateMeetingDto;
    const actor = this.extractActor(req);
    return this.meetingsService.create(dto, actor);
  }

  /**
   * 2. GET /api/meetings — List meetings visible to actor
   */
  @Get()
  async findAll(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsedQuery = parseOrThrow(MeetingQuerySchema, query) as MeetingQueryDto;
    const actor = this.extractActor(req);
    return this.meetingsService.findAll(parsedQuery, actor);
  }

  /**
   * 3. GET /api/meetings/upcoming — Next 7 days meetings
   */
  @Get('upcoming')
  async findUpcoming(@Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.findUpcoming(actor);
  }

  /**
   * 4. GET /api/meetings/past — Past 30 days meetings
   */
  @Get('past')
  async findPast(@Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.findPast(actor);
  }

  /**
   * 5. GET /api/meetings/:id — Meeting details
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.findOne(id, actor);
  }

  /**
   * 6. PATCH /api/meetings/:id — Update meeting
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = parseOrThrow(UpdateMeetingSchema, body) as UpdateMeetingDto;
    const actor = this.extractActor(req);
    return this.meetingsService.update(id, dto, actor);
  }

  /**
   * 7. DELETE /api/meetings/:id — Soft delete meeting
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.remove(id, actor);
  }

  /**
   * 8. POST /api/meetings/:id/rsvp — Submit RSVP (Accepted / Declined)
   */
  @Post(':id/rsvp')
  async rsvp(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = parseOrThrow(RsvpSchema, body) as RsvpDto;
    const actor = this.extractActor(req);
    return this.meetingsService.rsvp(id, dto, actor);
  }

  /**
   * 9. GET /api/meetings/:id/attendees — Attendees list
   */
  @Get(':id/attendees')
  async getAttendees(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.getAttendees(id, actor);
  }

  /**
   * 10. POST /api/meetings/:id/minutes — Save meeting minutes (Creator or Admin)
   */
  @Post(':id/minutes')
  async saveMinutes(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = parseOrThrow(SaveMinutesSchema, body) as SaveMinutesDto;
    const actor = this.extractActor(req);
    return this.meetingsService.saveMinutes(id, dto, actor);
  }

  /**
   * 11. GET /api/meetings/:id/minutes — View meeting minutes
   */
  @Get(':id/minutes')
  async getMinutes(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.getMinutes(id, actor);
  }

  /**
   * 12. GET /api/meetings/:id/report — Attendance report (6 key metrics)
   */
  @Get(':id/report')
  async getAttendanceReport(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    return this.meetingsService.getAttendanceReport(id, actor);
  }

  // ============================================================
  // ⭐ M5.1 — AI Summary endpoints
  // ============================================================

  /**
   * 13. GET /api/meetings/:id/ai-summary — Get cached AI summary
   * Trả về { hasSummary: false } nếu chưa generate
   */
  @Get(':id/ai-summary')
  async getAiSummary(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    // Verify access trước (sẽ throw nếu không có quyền)
    await this.meetingsService.findOne(id, actor);
    const summary = await this.meetingAiService.getSummary(id);
    if (!summary) {
      return { hasSummary: false };
    }
    return {
      hasSummary: true,
      ...summary,
    };
  }

  /**
   * 14. POST /api/meetings/:id/ai-summary/generate — Generate hoặc regenerate
   * Chỉ PM creator / DEPT_HEAD (cùng phòng) / Admin
   */
  @Post(':id/ai-summary/generate')
  async generateAiSummary(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const actor = this.extractActor(req);
    // Verify access
    const meeting = await this.meetingsService.findOne(id, actor);
    // RBAC: chỉ creator hoặc Admin
    if (meeting.createdById !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ người tạo cuộc họp hoặc Admin mới có thể tạo AI summary');
    }
    return this.meetingAiService.generateSummary(id);
  }
}
