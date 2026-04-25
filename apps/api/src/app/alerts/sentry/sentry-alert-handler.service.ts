import { Injectable, Logger } from '@nestjs/common';

import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { OffensiveResponseService } from '../services/offensive-response.service';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(SentryAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly alertNotifier: VehicleAlertNotifierService,
    private readonly offensiveResponseService: OffensiveResponseService,
  ) { }

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsSentryMode() || !telemetryMessage.validateSentryModeValue()) {
      this.logger.warn('Telemetry message does not contain SentryMode data', telemetryMessage);
      return;
    }

    const sentryMode = telemetryMessage.getSentryModeState();

    if (sentryMode === SentryModeState.Aware) {
      await this.alertNotifier.dispatch({
        telemetryMessage,
        alertName: 'SENTRY_ALERT',
        latencyLabel: 'SENTRY_LATENCY',
        telegramNotifier: this.telegramNotifier,
      });

      this.offensiveResponseService.handleOffensiveResponse(telemetryMessage.vin).catch((error: unknown) => {
        this.logger.warn(`[OFFENSIVE] Failed to execute offensive response for VIN ${telemetryMessage.vin}`, error);
      });
    }
  }

  private readonly telegramNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendSentryAlert(userId, alertInfo, userLanguage, keyboard);
  };
}
