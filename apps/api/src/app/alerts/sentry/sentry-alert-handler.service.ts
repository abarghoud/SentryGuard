import { Injectable, Logger } from '@nestjs/common';

import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { SentryPresenceTrackerService } from './sentry-presence-tracker.service';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(SentryAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly alertNotifier: VehicleAlertNotifierService,
    private readonly presenceTracker: SentryPresenceTrackerService,
  ) { }

  public async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsSentryMode() || !telemetryMessage.validateSentryModeValue()) {
      this.logger.warn('Telemetry message does not contain SentryMode data', telemetryMessage);
      return;
    }

    const sentryMode = telemetryMessage.getSentryModeState();

    if (sentryMode === SentryModeState.Aware) {
      await this.dispatchSentryAlert(telemetryMessage);
      this.presenceTracker.watch(telemetryMessage.vin, (isFinal) => {
        const dispatch = isFinal
          ? this.dispatchSustainedPresenceFinal(telemetryMessage)
          : this.dispatchSustainedPresence(telemetryMessage);
        dispatch.catch((error: unknown) => {
          this.logger.error(`Failed to dispatch sustained-presence alert for VIN ${telemetryMessage.vin}`, error);
        });
      });
      return;
    }

    this.presenceTracker.clear(telemetryMessage.vin);

    if (sentryMode === SentryModeState.Panic) {
      await this.dispatchPanic(telemetryMessage);
    }
  }

  private async dispatchSentryAlert(telemetryMessage: TelemetryMessage): Promise<void> {
    await this.alertNotifier.dispatch({
      telemetryMessage,
      alertName: 'SENTRY_ALERT',
      latencyLabel: 'SENTRY_LATENCY',
      severity: AlertEventSeverity.Warning,
      telegramNotifier: this.telegramNotifier,
      type: AlertEventType.Sentry,
    });
  }

  private async dispatchSustainedPresence(telemetryMessage: TelemetryMessage): Promise<void> {
    await this.alertNotifier.dispatch({
      telemetryMessage,
      alertName: 'SENTRY_SUSTAINED_PRESENCE',
      latencyLabel: 'SENTRY_SUSTAINED_LATENCY',
      severity: AlertEventSeverity.Critical,
      telegramNotifier: this.sustainedPresenceNotifier,
      type: AlertEventType.SustainedPresence,
    });
  }

  private async dispatchSustainedPresenceFinal(telemetryMessage: TelemetryMessage): Promise<void> {
    await this.alertNotifier.dispatch({
      telemetryMessage,
      alertName: 'SENTRY_SUSTAINED_PRESENCE_FINAL',
      latencyLabel: 'SENTRY_SUSTAINED_LATENCY',
      severity: AlertEventSeverity.Critical,
      telegramNotifier: this.sustainedPresenceFinalNotifier,
      type: AlertEventType.SustainedPresenceFinal,
    });
  }

  private async dispatchPanic(telemetryMessage: TelemetryMessage): Promise<void> {
    await this.alertNotifier.dispatch({
      telemetryMessage,
      alertName: 'SENTRY_PANIC',
      latencyLabel: 'SENTRY_PANIC_LATENCY',
      severity: AlertEventSeverity.Critical,
      telegramNotifier: this.panicNotifier,
      type: AlertEventType.Panic,
    });
  }

  private readonly telegramNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendSentryAlert(userId, alertInfo, userLanguage, keyboard);
  };

  private readonly sustainedPresenceNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendSentryPresenceAlert(userId, alertInfo, userLanguage, keyboard);
  };

  private readonly sustainedPresenceFinalNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendSentryPresenceFinalAlert(userId, alertInfo, userLanguage, keyboard);
  };

  private readonly panicNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendSentryPanicAlert(userId, alertInfo, userLanguage, keyboard);
  };
}
