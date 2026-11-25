import { Injectable } from '@nestjs/common';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { TelegramAlertInfo } from '../../telegram/telegram.types';
import { AlertEventSeverity, AlertEventType, NotificationChannel } from '../../../entities/alert-event.entity';

export interface AlertNotifierPayload {
  alertEventId: string;
  detectedAt: Date;
  userId: string;
  vin: string;
  vehicleDisplayName?: string | null;
  type: AlertEventType;
  severity: AlertEventSeverity;
  correlationId?: string;
  muted?: boolean;
  deliveredChannels?: NotificationChannel[];
}

type TelegramNotifier = (
  payload: AlertNotifierPayload,
  userLanguage: 'en' | 'fr'
) => Promise<boolean>;

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

  public async notify(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    const notifier = this.notifiers.get(payload.type);

    if (!notifier) {
      throw new Error(`No notifier registered for alert type ${payload.type}`);
    }

    return notifier(payload, userLanguage);
  }

  private buildAlertInfo(payload: AlertNotifierPayload): TelegramAlertInfo {
    return {
      detectedAt: payload.detectedAt,
      vin: payload.vin,
      display_name: payload.vehicleDisplayName ?? undefined,
    };
  }

  private async notifySentry(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    const keyboard = this.keyboardBuilder.buildSentryAlertKeyboard(payload.userId, userLanguage);
    return this.telegramService.sendSentryAlert(payload.userId, this.buildAlertInfo(payload), userLanguage, keyboard, false);
  }

  private async notifyBreakIn(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    const keyboard = this.keyboardBuilder.buildBreakInAlertKeyboard(payload.userId, userLanguage);
    return this.telegramService.sendBreakInAlert(payload.userId, this.buildAlertInfo(payload), userLanguage, keyboard, false);
  }
}
