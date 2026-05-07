import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthTokenPayload } from '@fleet/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMyNotifications(@CurrentUser() user: AuthTokenPayload) {
    return this.notificationsService.getUserNotifications(user.sub);
  }

  /** GET /notifications/fcm-status — returns all users with their FCM token status */
  @Get('fcm-status')
  fcmStatus() {
    return this.notificationsService.getFcmStatus();
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  /**
   * POST /notifications/test
   * Body (optional): { "targetUserId": "<uuid>" }
   * Defaults to the calling user when targetUserId is omitted.
   */
  @Post('test')
  testPush(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: { targetUserId?: string },
  ) {
    const userId = body?.targetUserId ?? user.sub;
    return this.notificationsService.sendTestNotification(userId);
  }
}
