import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AlertsService } from '../alerts/alerts.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { NotificationQueueService } from './notification-queue.service';
import { VehicleAlertNotifierService } from '../alerts/common/vehicle-alert-notifier.service';
import {
  NOTIFICATION_SWEEP_CRON_EXPRESSION,
  NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS,
} from '../../config/notification-sweep-cron.config';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';

@Injectable()
export class NotificationSweeperService {
  private readonly logger = new Logger(NotificationSweeperService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly distributedLockService: DistributedLockService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly vehicleAlertNotifierService: VehicleAlertNotifierService,
  ) {}

  @Cron(NOTIFICATION_SWEEP_CRON_EXPRESSION)
  public async sweep(): Promise<void> {
    const wasExecuted = await this.distributedLockService.withLock(
      SchedulerLockKey.NotificationSweep,
      () => this.executeSweep()
    );

    if (!wasExecuted) {
      this.logger.warn('[NOTIFICATION_SWEEPER] Lock already held by another instance, skipping');
    }
  }

  private async executeSweep(): Promise<void> {
    const cutoff = new Date(Date.now() - NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS);
    const pendingAlerts = await this.alertsService.findPendingNotificationsBefore(cutoff);

    let reEnqueuedCount = 0;
    let skippedCount = 0;

    for (const alert of pendingAlerts) {
      if (this.notificationQueueService.has(alert.id)) {
        skippedCount++;
        continue;
      }

      this.vehicleAlertNotifierService.enqueueNotification({
        alertEventId: alert.id,
        userId: alert.userId,
        vin: alert.vin,
        vehicleDisplayName: alert.vehicle_display_name,
        type: alert.type,
        severity: alert.severity,
        correlationId: `sweep-${alert.id}`,
      });
      reEnqueuedCount++;
    }

    if (reEnqueuedCount > 0 || skippedCount > 0) {
      this.logger.log(
        `[NOTIFICATION_SWEEPER] Re-enqueued ${reEnqueuedCount} pending alert(s), skipped ${skippedCount} in-queue`
      );
    }
  }
}
