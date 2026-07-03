import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  exports: [NotificationsService],
  imports: [TypeOrmModule.forFeature([NotificationPreferences, PushDeviceToken]), DevicesModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
