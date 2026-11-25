import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AlertsService } from '../alerts/alerts.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { NotificationLane, NotificationQueueService } from './notification-queue.service';
import { VehicleAlertNotifierService } from '../alerts/common/vehicle-alert-notifier.service';
import { AlertEvent } from '../../entities/alert-event.entity';
import {
  NOTIFICATION_SWEEP_BATCH_SIZE,
  NOTIFICATION_SWEEP_CRON_EXPRESSION,
  NOTIFICATION_SWEEP_LEASE_MS,
  NOTIFICATION_SWEEP_MAX_RETRY_BACKLOG,
  NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS,
} from '../../config/notification-sweep-cron.config';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';

enum SweepOutcome {
  Deferred = 'deferred',
  Dropped = 'dropped',
  InQueue = 'inQueue',
  LeasedElsewhere = 'leasedElsewhere',
  ReEnqueued = 'reEnqueued',
}

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
    const pendingAlerts = await this.alertsService.findNotificationsDueForSweep(cutoff, NOTIFICATION_SWEEP_BATCH_SIZE);
    const counts: Record<SweepOutcome, number> = { deferred: 0, dropped: 0, inQueue: 0, leasedElsewhere: 0, reEnqueued: 0 };
    let availableSlots = NOTIFICATION_SWEEP_MAX_RETRY_BACKLOG - this.notificationQueueService.countRetryJobs();

    for (const alert of pendingAlerts) {
      const outcome = await this.sweepAlert(alert, availableSlots);
      availableSlots -= outcome === SweepOutcome.ReEnqueued ? 1 : 0;
      counts[outcome]++;
    }

    this.logSweep(counts);
  }

  private async sweepAlert(alert: AlertEvent, availableSlots: number): Promise<SweepOutcome> {
    if (this.notificationQueueService.has(alert.id)) {
      return SweepOutcome.InQueue;
    }

    if (availableSlots <= 0) {
      return SweepOutcome.Deferred;
    }

    const { isLeased } = await this.alertsService.leaseNotificationForRetry(alert.id, alert.notification_attempts, NOTIFICATION_SWEEP_LEASE_MS);
    if (!isLeased) {
      return SweepOutcome.LeasedElsewhere;
    }

    return this.enqueueRetry(alert) ? SweepOutcome.ReEnqueued : SweepOutcome.Dropped;
  }

  private enqueueRetry(alert: AlertEvent): boolean {
    return this.vehicleAlertNotifierService.enqueueNotification(
      {
        alertEventId: alert.id,
        correlationId: `sweep-${alert.id}`,
        deliveredChannels: alert.notification_delivered_channels,
        detectedAt: alert.created_at,
        muted: alert.muted,
        severity: alert.severity,
        type: alert.type,
        userId: alert.userId,
        vehicleDisplayName: alert.vehicle_display_name,
        vin: alert.vin,
      },
      NotificationLane.Retry
    );
  }

  private logSweep(counts: Record<SweepOutcome, number>): void {
    if (Object.values(counts).every((count) => count === 0)) {
      return;
    }

    this.logger.log(
      `[NOTIFICATION_SWEEPER] Re-enqueued ${counts.reEnqueued} pending alert(s), skipped ${counts.inQueue} in-queue, ` +
      `${counts.leasedElsewhere} leased by another instance, deferred ${counts.deferred} (retry backlog full), dropped ${counts.dropped}`
    );
  }
}
