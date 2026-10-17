import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';
import {
  ListNotificationsDto,
  ListNotificationsSchema,
} from './dto/list-notifications.dto.js';
import {
  SubscribePushDto,
  SubscribePushSchema,
  UnsubscribePushDto,
  UnsubscribePushSchema,
} from './dto/subscribe-push.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    departmentId?: string | null;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = ListNotificationsSchema.parse(rawQuery) as ListNotificationsDto;
    return this.notificationsService.findAll(req.user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Delete()
  async deleteAllRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.deleteAllRead(req.user.id);
  }

  @Delete(':id')
  async deleteNotification(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.delete(req.user.id, id);
  }

  @Post('push-subscribe')
  @HttpCode(HttpStatus.OK)
  async pushSubscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = SubscribePushSchema.parse(body) as SubscribePushDto;
    return this.pushSubscriptionService.subscribe(req.user.id, dto);
  }

  @Post('push-unsubscribe')
  @HttpCode(HttpStatus.OK)
  async pushUnsubscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const dto = UnsubscribePushSchema.parse(body) as UnsubscribePushDto;
    return this.pushSubscriptionService.unsubscribe(req.user.id, dto.endpoint);
  }
}
