import { Injectable } from '@nestjs/common';
import { SupportedLanguage } from '../../../common/utils/language.util';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

export interface AlertNotifierPayload {
  alertEventId: string;
  userId: string;
  vin: string;
  vehicleDisplayName?: string | null;
  type: AlertEventType;
  severity: AlertEventSeverity;
  correlationId?: string;
}

type TelegramNotifier = (
  payload: AlertNotifierPayload,
  userLanguage: SupportedLanguage
) => Promise<void>;

@Injectable()
export class AlertNotifierRegistry {
  private readonly notifiers: Map<AlertEventType, TelegramNotifier>;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly keyboardBuilder: TelegramKeyboardBuilderService,
  ) {
    this.notifiers = new Map<AlertEventType, TelegramNotifier>([
      [AlertEventType.Sentry, (payload, userLanguage) => this.notifySentry(payload, userLanguage)],
      [AlertEventType.BreakIn, (payload, userLanguage) => this.notifyBreakIn(payload, userLanguage)],
    ]);
  }

  public async notify(payload: AlertNotifierPayload, userLanguage: SupportedLanguage): Promise<void> {
    const notifier = this.notifiers.get(payload.type);

    if (!notifier) {
      throw new Error(`No notifier registered for alert type ${payload.type}`);
    }

    await notifier(payload, userLanguage);
  }

  private buildAlertInfo(payload: AlertNotifierPayload): { vin: string; display_name?: string } {
    return {
      vin: payload.vin,
      display_name: payload.vehicleDisplayName ?? undefined,
    };
  }

  private async notifySentry(payload: AlertNotifierPayload, userLanguage: SupportedLanguage): Promise<void> {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(payload.userId, userLanguage);
    await this.telegramService.sendSentryAlert(payload.userId, this.buildAlertInfo(payload), userLanguage, keyboard, false);
  }

  private async notifyBreakIn(payload: AlertNotifierPayload, userLanguage: SupportedLanguage): Promise<void> {
    const keyboard = this.keyboardBuilder.buildBreakInAlertKeyboard(payload.userId, userLanguage);
    await this.telegramService.sendBreakInAlert(payload.userId, this.buildAlertInfo(payload), userLanguage, keyboard, false);
  }
}
