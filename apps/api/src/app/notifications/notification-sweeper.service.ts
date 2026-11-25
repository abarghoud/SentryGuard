import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AlertNotificationStateService } from '../alerts/alert-notification-state.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { NotificationLane } from './notification-lane.enum';
import { NotificationQueueService } from './notification-queue.service';
import { VehicleAlertNotifierService } from '../alerts/common/vehicle-alert-notifier.service';
import { AlertEvent } from '../../entities/alert-event.entity';
import {
  NOTIFICATION_SWEEP_BATCH_SIZE,
  NOTIFICATION_SWEEP_CRON_EXPRESSION,
  NOTIFICATION_SWEEP_LEASE_MS,
  NOTIFICATION_SWEEP_MAX_RETRY_BACKLOG,
  NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS,
  NOTIFICATION_SWEEP_TIME_BUDGET_MS,
} from '../../config/notification-sweep-cron.config';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';

enum SweepOutcome {
  Deferred = 'deferred',
  Dropped = 'dropped',
  InQueue = 'inQueue',
  LeasedElsewhere = 'leasedElsewhere',
  ReEnqueued = 'reEnqueued',
}

type SweepCounts = Record<SweepOutcome, number>;

@Injectable()
export class NotificationSweeperService {
  private readonly logger = new Logger(NotificationSweeperService.name);

  constructor(
    private readonly alertNotificationStateService: AlertNotificationStateService,
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
    const deadline = Date.now() + NOTIFICATION_SWEEP_TIME_BUDGET_MS;
    const rounds = [await this.sweepRound()];

    while (this.hasAlertsLeftToRetry(rounds) && (await this.waitForRetryLane(deadline)).hasTimeLeft) {
      rounds.push(await this.sweepRound());
    }

    this.logSweep(rounds);
  }

  private hasAlertsLeftToRetry(rounds: SweepCounts[]): boolean {
    const lastRound = rounds[rounds.length - 1];
    return lastRound.deferred > 0 && lastRound.reEnqueued > 0;
  }

  private async waitForRetryLane(deadline: number): Promise<{ hasTimeLeft: boolean }> {
    await this.notificationQueueService.waitForRetryLaneIdle(deadline - Date.now());
    return { hasTimeLeft: Date.now() < deadline };
  }

  private async sweepRound(): Promise<SweepCounts> {
    const cutoff = new Date(Date.now() - NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS);
    const pendingAlerts = await this.alertNotificationStateService.findNotificationsDueForSweep(cutoff, NOTIFICATION_SWEEP_BATCH_SIZE);
    const counts: SweepCounts = { deferred: 0, dropped: 0, inQueue: 0, leasedElsewhere: 0, reEnqueued: 0 };
    let availableSlots = this.notificationQueueService.countFreeRetrySlots(NOTIFICATION_SWEEP_MAX_RETRY_BACKLOG);

    for (const alert of pendingAlerts) {
      const outcome = await this.sweepAlert(alert, availableSlots);
      availableSlots = this.countRemainingSlots(availableSlots, outcome);
      counts[outcome]++;
    }

    return counts;
  }

  private countRemainingSlots(availableSlots: number, outcome: SweepOutcome): number {
    if (outcome === SweepOutcome.Dropped) {
      return 0;
    }

    return outcome === SweepOutcome.ReEnqueued ? availableSlots - 1 : availableSlots;
  }

  private async sweepAlert(alert: AlertEvent, availableSlots: number): Promise<SweepOutcome> {
    if (this.notificationQueueService.has(alert.id)) {
      return SweepOutcome.InQueue;
    }

    return availableSlots > 0 ? this.leaseAndEnqueue(alert) : SweepOutcome.Deferred;
  }

  private async leaseAndEnqueue(alert: AlertEvent): Promise<SweepOutcome> {
    const { isLeased } = await this.alertNotificationStateService.leaseNotification(alert.id, alert.notification_attempts, NOTIFICATION_SWEEP_LEASE_MS);
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

  private logSweep(rounds: SweepCounts[]): void {
    const lastRound = rounds[rounds.length - 1];
    const total = (outcome: SweepOutcome): number => rounds.reduce((sum, round) => sum + round[outcome], 0);

    if (Object.values(SweepOutcome).every((outcome) => total(outcome) === 0)) {
      return;
    }

    this.logger.log(
      `[NOTIFICATION_SWEEPER] Re-enqueued ${total(SweepOutcome.ReEnqueued)} pending alert(s), skipped ${lastRound.inQueue} in-queue, ` +
      `${total(SweepOutcome.LeasedElsewhere)} leased by another instance, deferred ${lastRound.deferred} (retry backlog full), ` +
      `dropped ${total(SweepOutcome.Dropped)}, in ${rounds.length} round(s)`
    );
  }
}
