import { Injectable, Logger } from '@nestjs/common';

import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { AlertsAutoSentryService } from '../../offensive-response/alerts-auto-sentry.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

import { BreakInEventTrackerService, BreakInTrackedEvent } from './break-in-event-tracker.service';

@Injectable()
export class BreakInAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(BreakInAlertHandlerService.name);
  private readonly pendingVerifications = new Set<Promise<void>>();

  constructor(
    private readonly alertNotifier: VehicleAlertNotifierService,
    private readonly eventTracker: BreakInEventTrackerService,
    private readonly offensiveResponseService: AlertsOffensiveResponseService,
    private readonly autoSentryService: AlertsAutoSentryService,
  ) {}

  public async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    this.trackBreakInEvents(telemetryMessage);

    if (!telemetryMessage.validateContainsCenterDisplay()) {
      return;
    }

    if (telemetryMessage.isCenterDisplayLocked()) {
      this.scheduleAlertVerification(telemetryMessage);
    }
  }

  private trackBreakInEvents(telemetryMessage: TelemetryMessage): void {
    const eventTime = new Date(telemetryMessage.createdAt).getTime();

    const latchDatum = telemetryMessage.data.find(d => d.key === 'ChargePortLatch');
    if (latchDatum?.value.chargePortLatchValue === 'ChargePortLatchDisengaged') {
      this.eventTracker.track(telemetryMessage.vin, BreakInTrackedEvent.ChargePortLatchDisengaged, eventTime);
    }

    if (telemetryMessage.extractOpenDoors().length > 0) {
      this.eventTracker.track(telemetryMessage.vin, BreakInTrackedEvent.DoorOpened, eventTime);
    }
  }

  private scheduleAlertVerification(telemetryMessage: TelemetryMessage): void {
    const delay = parseInt(process.env.BREAK_IN_ALERT_CHECK_DELAY_MS || '3000', 10);

    const verification = new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          await this.verifyAndDispatchAlert(telemetryMessage);
        } finally {
          this.pendingVerifications.delete(verification);
          resolve();
        }
      }, delay);
    });

    this.pendingVerifications.add(verification);
  }

  public async flushPendingVerifications(timeoutMs: number): Promise<void> {
    if (this.pendingVerifications.size === 0) {
      return;
    }

    this.logger.log(`⏳ Waiting for ${this.pendingVerifications.size} pending display-lock alert verification(s) to flush...`);

    const deadline = Date.now() + timeoutMs;

    while (this.pendingVerifications.size > 0 && Date.now() < deadline) {
      const current = [...this.pendingVerifications];
      const remaining = deadline - Date.now();

      await Promise.race([
        Promise.allSettled(current),
        new Promise<void>((resolve) => setTimeout(resolve, remaining)),
      ]);
    }

    this.logger.log('✅ Pending display-lock alert verifications flushed');
  }

  private async verifyAndDispatchAlert(telemetryMessage: TelemetryMessage): Promise<void> {
    try {
      const eventTime = new Date(telemetryMessage.createdAt).getTime();
      if (this.eventTracker.hasEventAround(telemetryMessage.vin, BreakInTrackedEvent.ChargePortLatchDisengaged, eventTime)) {
        this.logger.log(`[False Positive Prevented] Suppressing break-in alert for VIN ${telemetryMessage.vin} due to correlated ChargePortLatch event.`);
        return;
      }

      if (this.eventTracker.hasEventAround(telemetryMessage.vin, BreakInTrackedEvent.DoorOpened, eventTime)) {
        this.logger.log(`[False Positive Prevented] Suppressing break-in alert for VIN ${telemetryMessage.vin} due to door/trunk opening within the grace period.`);
        return;
      }

      const { userIds } = await this.alertNotifier.dispatch({
        telemetryMessage,
        alertName: 'BREAK_IN_ALERT',
        latencyLabel: 'BREAK_IN_LATENCY',
        severity: AlertEventSeverity.Critical,
        type: AlertEventType.BreakIn,
      });

      this.offensiveResponseService.handleBreakInOffensiveResponse(telemetryMessage.vin, userIds, telemetryMessage.createdAt).catch((error: unknown) => {
        this.logger.warn(`[OFFENSIVE] Failed to execute offensive response for VIN ${telemetryMessage.vin}`, error);
      });

      this.autoSentryService.handleBreakInAutoSentry(telemetryMessage.vin, userIds, telemetryMessage.createdAt).catch((error: unknown) => {
        this.logger.warn(`[AUTO_SENTRY] Failed to execute auto sentry for VIN ${telemetryMessage.vin}`, error);
      });
    } catch (error) {
      this.logger.error('Failed to dispatch delayed break-in alert:', error);
    }
  }
}
