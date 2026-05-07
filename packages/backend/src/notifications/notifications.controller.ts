import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  /** POST /notifications/test — sends a real FCM push to the calling user */
  @Post('test')
  testPush(@CurrentUser() user: AuthTokenPayload) {
    return this.notificationsService.sendTestNotification(user.sub);
  }
}
