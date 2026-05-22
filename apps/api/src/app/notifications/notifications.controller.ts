import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { NotificationPreferencesDto, NotificationsService } from './notifications.service';

interface RegisterPushTokenBody {
  platform?: string;
  token?: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('preferences')
  public async getPreferences(@CurrentUser() user: User): Promise<NotificationPreferencesDto> {
    return await this.notificationsService.getPreferences(user.userId);
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post('preferences')
  public async updatePreferences(
    @CurrentUser() user: User,
    @Body() preferences: Partial<NotificationPreferencesDto>
  ): Promise<NotificationPreferencesDto> {
    return await this.notificationsService.updatePreferences(user.userId, preferences);
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post('push-token')
  public async registerPushToken(@CurrentUser() user: User, @Body() body: RegisterPushTokenBody): Promise<{ success: boolean }> {
    if (!body.token) {
      return { success: false };
    }

    return await this.notificationsService.registerPushToken(user.userId, body.token, body.platform);
  }
}
