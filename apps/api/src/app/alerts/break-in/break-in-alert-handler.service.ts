import { Injectable, Logger } from '@nestjs/common';

import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

import { ChargePortLatchTrackerService } from './charge-port-latch-tracker.service';

@Injectable()
export class BreakInAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(BreakInAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly alertNotifier: VehicleAlertNotifierService,
    private readonly chargeTracker: ChargePortLatchTrackerService,
    private readonly offensiveResponseService: AlertsOffensiveResponseService,
  ) {}

  public async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    this.trackChargePortEvents(telemetryMessage);

    if (!telemetryMessage.validateContainsCenterDisplay()) {
      return;
    }

    if (telemetryMessage.isCenterDisplayLocked()) {
      this.scheduleAlertVerification(telemetryMessage);
    }
  }

  private trackChargePortEvents(telemetryMessage: TelemetryMessage): void {
    const latchDatum = telemetryMessage.data.find(d => d.key === 'ChargePortLatch');
    if (latchDatum) {
      const eventTime = new Date(telemetryMessage.createdAt).getTime();
      this.chargeTracker.trackLatchEvent(telemetryMessage.vin, eventTime, latchDatum.value.chargePortLatchValue);
    }
  }

  private scheduleAlertVerification(telemetryMessage: TelemetryMessage): void {
    const delay = parseInt(process.env.BREAK_IN_ALERT_CHECK_DELAY_MS || '2000', 10);
    setTimeout(async () => {
      await this.verifyAndDispatchAlert(telemetryMessage);
    }, delay);
  }

  private async verifyAndDispatchAlert(telemetryMessage: TelemetryMessage): Promise<void> {
    try {
      const eventTime = new Date(telemetryMessage.createdAt).getTime();
      if (this.chargeTracker.hasLatchEventAround(telemetryMessage.vin, eventTime)) {
        this.logger.log(`[False Positive Prevented] Suppressing break-in alert for VIN ${telemetryMessage.vin} due to correlated ChargePortLatch event.`);
        return;
      }

      const { userIds } = await this.alertNotifier.dispatch({
        telemetryMessage,
        alertName: 'BREAK_IN_ALERT',
        latencyLabel: 'BREAK_IN_LATENCY',
        severity: AlertEventSeverity.Critical,
        telegramNotifier: this.telegramNotifier,
        type: AlertEventType.BreakIn,
      });

      this.offensiveResponseService.handleBreakInOffensiveResponse(telemetryMessage.vin, userIds, telemetryMessage.createdAt).catch((error: unknown) => {
        this.logger.warn(`[OFFENSIVE] Failed to execute offensive response for VIN ${telemetryMessage.vin}`, error);
      });
    } catch (error) {
      this.logger.error('Failed to dispatch delayed break-in alert:', error);
    }
  }

  private readonly telegramNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildBreakInAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendBreakInAlert(userId, alertInfo, userLanguage, keyboard);
  };
}
