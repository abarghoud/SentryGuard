import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertEvent } from '../../entities/alert-event.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertNotificationStateService } from './alert-notification-state.service';
import { AlertNotificationRepository } from './alert-notification.repository';
import { alertNotificationRepositoryRequirementsSymbol } from './interfaces/alert-notification-repository.requirements';
import { ScheduledDataRetentionService } from './scheduled-data-retention.service';

@Module({
  controllers: [AlertsController],
  exports: [AlertNotificationStateService, AlertsService],
  imports: [TypeOrmModule.forFeature([AlertEvent])],
  providers: [
    AlertNotificationStateService,
    AlertsService,
    ScheduledDataRetentionService,
    { provide: alertNotificationRepositoryRequirementsSymbol, useClass: AlertNotificationRepository },
  ],
})
export class AlertsModule {}
