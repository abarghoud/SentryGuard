import { Injectable } from '@nestjs/common';

import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';

@Injectable()
export class BreakInAlertHandlerService implements TelemetryEventHandler {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
    private readonly alertNotifier: VehicleAlertNotifierService
  ) { }

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    if (!telemetryMessage.validateContainsCenterDisplay()) {
      return;
    }

    if (telemetryMessage.isCenterDisplayLocked()) {
      await this.alertNotifier.dispatch({
        telemetryMessage,
        alertName: 'BREAK_IN_ALERT',
        latencyLabel: 'BREAK_IN_LATENCY',
        telegramNotifier: this.telegramNotifier
      });
    }
  }

  private readonly telegramNotifier = async (userId: string, alertInfo: { vin: string; display_name?: string }, userLanguage: 'en' | 'fr') => {
    const keyboard = this.keyboardBuilder.buildBreakInAlertKeyboard(userId, userLanguage);
    await this.telegramService.sendBreakInAlert(userId, alertInfo, userLanguage, keyboard);
  };
}
