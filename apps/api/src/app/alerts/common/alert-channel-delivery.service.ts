import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannel } from '../../../entities/alert-event.entity';
import { resolveVehicleLabel } from '../../../common/utils/vehicle-label.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { AlertSound, DEFAULT_ALERT_SOUND } from '../enums/alert-sound.enum';
import { AlertNotifierPayload, AlertNotifierRegistry } from './alert-notifier.registry';
import { ChannelOutcome, DeliveryOutcomes } from './alert-delivery.types';
import { ChannelOutcomeStatus } from './channel-outcome-status.enum';
import { VehicleAlertSoundResolverService } from './vehicle-alert-sound-resolver.service';

const TELEGRAM_SLOW_THRESHOLD_MS = 500;

@Injectable()
export class AlertChannelDeliveryService {
  private readonly logger = new Logger(AlertChannelDeliveryService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly alertNotifierRegistry: AlertNotifierRegistry,
    private readonly vehicleAlertSoundResolverService: VehicleAlertSoundResolverService
  ) {}

  public async deliver(
    payload: AlertNotifierPayload,
    userLanguage: 'en' | 'fr',
    alreadyDelivered: ReadonlySet<NotificationChannel>
  ): Promise<DeliveryOutcomes> {
    const [expo, telegram] = await Promise.all([
      this.deliverChannel(NotificationChannel.Expo, alreadyDelivered, () => this.sendPushNotification(payload, userLanguage)),
      this.deliverChannel(NotificationChannel.Telegram, alreadyDelivered, () => this.sendTelegramNotification(payload, userLanguage)),
    ]);

    return { expo, telegram };
  }

  private async deliverChannel(
    channel: NotificationChannel,
    alreadyDelivered: ReadonlySet<NotificationChannel>,
    send: () => Promise<boolean>
  ): Promise<ChannelOutcome> {
    if (alreadyDelivered.has(channel)) {
      return { status: ChannelOutcomeStatus.AlreadyDelivered };
    }

    const [result] = await Promise.allSettled([send()]);
    return this.toChannelOutcome(result);
  }

  private toChannelOutcome(result: PromiseSettledResult<boolean>): ChannelOutcome {
    if (result.status === 'rejected') {
      return { status: ChannelOutcomeStatus.Failed, error: result.reason };
    }

    return result.value ? { status: ChannelOutcomeStatus.Delivered } : { status: ChannelOutcomeStatus.Skipped };
  }

  private async sendPushNotification(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    return await this.notificationsService.sendPushAlert({
      alertSound: await this.resolveAlertSound(payload),
      correlationId: payload.correlationId,
      detectedAt: payload.detectedAt,
      severity: payload.severity,
      type: payload.type,
      userId: payload.userId,
      userLanguage,
      vehicleName: resolveVehicleLabel(payload.vehicleDisplayName, payload.vin),
      vin: payload.vin,
    });
  }

  private async resolveAlertSound(payload: AlertNotifierPayload): Promise<AlertSound> {
    try {
      return await this.vehicleAlertSoundResolverService.resolve(payload.userId, payload.vin, payload.type);
    } catch (error) {
      this.logger.warn(
        `[ALERT_SOUND_FALLBACK] Could not read the alert sound for VIN ${payload.vin}, falling back to the default:`,
        error
      );
      return DEFAULT_ALERT_SOUND;
    }
  }

  private async sendTelegramNotification(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    if (!(await this.notificationsService.shouldSendTelegram(payload.userId, payload.severity))) {
      return false;
    }

    const telegramStart = Date.now();
    const wasSent = await this.alertNotifierRegistry.notify(payload, userLanguage);
    this.logSlowTelegram(payload, Date.now() - telegramStart);
    return wasSent;
  }

  private logSlowTelegram(payload: AlertNotifierPayload, telegramTime: number): void {
    if (telegramTime > TELEGRAM_SLOW_THRESHOLD_MS) {
      this.logger.warn(`[TELEGRAM_SLOW][${payload.correlationId}] ${payload.type}: ${telegramTime}ms for user: ${payload.userId}`);
    }
  }
}
