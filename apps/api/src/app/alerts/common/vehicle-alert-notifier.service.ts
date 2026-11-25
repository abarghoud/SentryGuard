import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { AlertEventSeverity, AlertEventType, NotificationChannel } from '../../../entities/alert-event.entity';
import { AlertsService, NotificationAttemptOutcome, NotificationAttemptResult } from '../alerts.service';
import { NotificationRetryPolicy } from './notification-attempt.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationLane, NotificationQueueService } from '../../notifications/notification-queue.service';
import { AlertNotifierPayload, AlertNotifierRegistry } from './alert-notifier.registry';
import { VehicleAlertSoundResolverService } from './vehicle-alert-sound-resolver.service';
import { AlertSound, DEFAULT_ALERT_SOUND } from '../enums/alert-sound.enum';
import {
  NOTIFICATION_RETRY_BASE_DELAY_MS,
  NOTIFICATION_RETRY_MAX_DELAY_MS,
  NOTIFICATION_SWEEP_MAX_ATTEMPTS,
} from '../../../config/notification-sweep-cron.config';
import { resolveVehicleLabel } from '../../../common/utils/vehicle-label.util';
import { CaughtError } from '../../../common/utils/caught-error';

export interface AlertDispatchConfig {
  telemetryMessage: TelemetryMessage;
  alertName: string;
  latencyLabel: string;
  reactionDelayMs?: number;
  severity: AlertEventSeverity;
  type: AlertEventType;
}

enum ChannelOutcomeStatus {
  AlreadyDelivered = 'already_delivered',
  Delivered = 'delivered',
  Failed = 'failed',
  Skipped = 'skipped',
}

interface ChannelOutcome {
  error?: unknown;
  status: ChannelOutcomeStatus;
}

interface DeliveryOutcomes {
  expo: ChannelOutcome;
  telegram: ChannelOutcome;
}

interface DeliveryReport {
  failedChannels: NotificationChannel[];
  hasDelivered: boolean;
  newlyDelivered: NotificationChannel[];
  outcomes: DeliveryOutcomes;
}

export class AlertChannelDeliveryError extends Error {
  constructor(
    message: string,
    public readonly deliveredChannels: NotificationChannel[]
  ) {
    super(message);
    this.name = 'AlertChannelDeliveryError';
  }
}

const notificationRetryPolicy: NotificationRetryPolicy = {
  baseDelayMs: NOTIFICATION_RETRY_BASE_DELAY_MS,
  maxAttempts: NOTIFICATION_SWEEP_MAX_ATTEMPTS,
  maxDelayMs: NOTIFICATION_RETRY_MAX_DELAY_MS,
};

interface RecordedAlert {
  alertEventId: string;
  detectedAt: Date;
  isMuted: boolean;
  userId: string;
}

@Injectable()
export class VehicleAlertNotifierService {
  private readonly logger = new Logger(VehicleAlertNotifierService.name);
  private static readonly DB_SLOW_THRESHOLD_MS = 100;
  private static readonly TELEGRAM_SLOW_THRESHOLD_MS = 500;

  constructor(
    private readonly userLanguageService: UserLanguageService,
    private readonly kafkaLogContextService: KafkaLogContextService,
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly alertNotifierRegistry: AlertNotifierRegistry,
    private readonly vehicleAlertSoundResolverService: VehicleAlertSoundResolverService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async dispatch(config: AlertDispatchConfig): Promise<{ userIds: string[] }> {
    const handlerStartTime = Date.now();
    const { telemetryMessage: message, alertName, latencyLabel } = config;

    try {
      const vehicles = await this.findVehiclesByVin(message.vin, message.correlationId);

      if (vehicles.length === 0) {
        return { userIds: [] };
      }

      const userIds = this.extractUniqueUserIds(vehicles);
      this.kafkaLogContextService.assignUserId(userIds.join(','));

      const alertInfo = this.buildAlertInfo(message.vin, vehicles[0].display_name);

      this.logMultiUserNotification(message.vin, userIds.length);

      const recordedAlerts = await this.recordAlerts(userIds, alertInfo, config);
      this.enqueueUserNotifications(recordedAlerts, alertInfo, message.correlationId, alertName, config);

      this.logAlertLatency(message, handlerStartTime, latencyLabel, config.reactionDelayMs ?? 0);

      return { userIds };
    } catch (error) {
      this.logger.error(`Error in ${alertName}: ${new CaughtError(error).describe()}`);
      throw error;
    }
  }

  public enqueueNotification(payload: AlertNotifierPayload, lane = NotificationLane.Immediate): boolean {
    return this.notificationQueueService.enqueue(
      () => this.kafkaLogContextService.runWithContext(
        {
          vin: payload.vin,
          correlationId: payload.correlationId ?? `notification-${payload.vin}`,
        },
        () => this.notifyUser(payload)
      ),
      {
        label: `${payload.type}:${payload.userId}`,
        vin: payload.vin,
        correlationId: payload.correlationId,
        alertEventId: payload.alertEventId,
        lane,
      }
    );
  }

  private async findVehiclesByVin(vin: string, correlationId?: string): Promise<Vehicle[]> {
    const dbStart = Date.now();
    const vehicles = await this.vehicleRepository.find({
      where: { vin },
      select: {
        userId: true,
        display_name: true
      },
    });
    const dbTime = Date.now() - dbStart;

    this.logger.log(`[DB_TIME][VEHICLE_LOOKUP] Vehicle lookup: ${dbTime}ms for VIN: ${vin} (correlation: ${correlationId})`);

    if (dbTime > VehicleAlertNotifierService.DB_SLOW_THRESHOLD_MS) {
      this.logger.warn(`[DB_SLOW][${correlationId}] Vehicle lookup: ${dbTime}ms for VIN: ${vin}`);
    }

    if (vehicles.length === 0) {
      this.logger.warn(`No vehicle found for VIN: ${vin}`);
    }

    return vehicles;
  }

  private extractUniqueUserIds(vehicles: Vehicle[]): string[] {
    return [...new Set(vehicles.map(vehicle => vehicle.userId))];
  }

  private buildAlertInfo(vin: string, displayName?: string): { vin: string; display_name?: string } {
    return { vin, display_name: displayName };
  }

  private logMultiUserNotification(vin: string, userCount: number): void {
    if (userCount > 1) {
      this.logger.log(`[MULTI_USER_VEHICLE] VIN ${vin} is associated with ${userCount} users, notifying all of them`);
    }
  }

  private async recordAlerts(
    userIds: string[],
    alertInfo: { vin: string; display_name?: string },
    config: AlertDispatchConfig
  ): Promise<RecordedAlert[]> {
    const detectedAt = new Date();

    return Promise.all(
      userIds.map(async (userId) => {
        const isMuted = await this.resolveIsMuted(userId, config.type);
        const alertEventId = await this.alertsService.record(
          userId,
          alertInfo.vin,
          config.type,
          config.severity,
          alertInfo.display_name,
          isMuted
        );
        return { alertEventId, detectedAt, isMuted, userId };
      })
    );
  }

  private async resolveIsMuted(userId: string, type: AlertEventType): Promise<boolean> {
    return type === AlertEventType.Sentry && (await this.notificationsService.isMuted(userId));
  }

  private enqueueUserNotifications(
    recordedAlerts: RecordedAlert[],
    alertInfo: { vin: string; display_name?: string },
    correlationId: string | undefined,
    alertName: string,
    config: AlertDispatchConfig
  ): void {
    for (const { userId, alertEventId, detectedAt, isMuted } of recordedAlerts) {
      this.enqueueNotification({
        alertEventId,
        correlationId,
        detectedAt,
        muted: isMuted,
        severity: config.severity,
        type: config.type,
        userId,
        vehicleDisplayName: alertInfo.display_name,
        vin: alertInfo.vin,
      });
    }

    this.logger.log(`[${alertName}] Enqueued ${recordedAlerts.length} notification job(s)`);
  }

  private async notifyUser(payload: AlertNotifierPayload): Promise<void> {
    try {
      await this.executeUserNotification(payload);
    } catch (error) {
      const isChannelFailure = error instanceof AlertChannelDeliveryError;
      if (!isChannelFailure) {
        this.logUnexpectedNotificationError(payload, error);
      }
      await this.handleNotificationFailure(payload, isChannelFailure ? error.deliveredChannels : []);
      throw error;
    }
  }

  private logUnexpectedNotificationError(payload: AlertNotifierPayload, error: unknown): void {
    this.logger.error(`[NOTIFICATION_ERROR] Failed to send ${payload.type} to user ${payload.userId} for VIN ${payload.vin}: ${new CaughtError(error).describe()}`);
  }

  private async executeUserNotification(payload: AlertNotifierPayload): Promise<void> {
    if (payload.muted) {
      await this.handleMutedNotification(payload);
      return;
    }
    await this.handleActiveNotification(payload);
  }

  private async handleMutedNotification(payload: AlertNotifierPayload): Promise<void> {
    await this.alertsService.markNotificationSent(payload.alertEventId);
    this.logger.log(`[${payload.type}] Alert suppressed for muted user ${payload.userId} (correlation: ${payload.correlationId})`);
  }

  private async handleActiveNotification(payload: AlertNotifierPayload): Promise<void> {
    const userLanguage = await this.userLanguageService.getUserLanguage(payload.userId);
    const alreadyDelivered = new Set(payload.deliveredChannels ?? []);
    const outcomes = await this.deliverNotifications(payload, userLanguage, alreadyDelivered);
    const report = this.toDeliveryReport(outcomes, alreadyDelivered);

    if (report.failedChannels.length > 0) {
      this.throwDeliveryFailure(payload, report);
    }

    await this.completeDelivery(payload, report);
  }

  private toDeliveryReport(outcomes: DeliveryOutcomes, alreadyDelivered: ReadonlySet<NotificationChannel>): DeliveryReport {
    const newlyDelivered = this.findChannelsWithStatus(outcomes, ChannelOutcomeStatus.Delivered);

    return {
      failedChannels: this.findChannelsWithStatus(outcomes, ChannelOutcomeStatus.Failed),
      hasDelivered: alreadyDelivered.size > 0 || newlyDelivered.length > 0,
      newlyDelivered,
      outcomes,
    };
  }

  private findChannelsWithStatus(outcomes: DeliveryOutcomes, status: ChannelOutcomeStatus): NotificationChannel[] {
    return this.toChannelEntries(outcomes)
      .filter(([, outcome]) => outcome.status === status)
      .map(([channel]) => channel);
  }

  private throwDeliveryFailure(payload: AlertNotifierPayload, report: DeliveryReport): never {
    const failedChannels = report.failedChannels.join(',');
    const failureTag = report.hasDelivered ? 'ALERT_CHANNEL_FAILED' : 'ALERT_DELIVERY_FAILED';

    this.logger.error(
      `[${failureTag}][${payload.correlationId}] user=${payload.userId} alert=${payload.alertEventId} ` +
      `failed=${failedChannels} channels=${this.formatChannelOutcomes(report.outcomes)}`
    );
    throw new AlertChannelDeliveryError(`Alert delivery failed on ${failedChannels}`, report.newlyDelivered);
  }

  private async completeDelivery(payload: AlertNotifierPayload, report: DeliveryReport): Promise<void> {
    if (!report.hasDelivered) {
      await this.handleUndeliverableNotification(payload, report.outcomes);
      return;
    }

    await this.recordDelivery(payload, report.newlyDelivered);
    this.logger.log(
      `[${payload.type}] Notified user ${payload.userId} for VIN ${payload.vin} channels=${this.formatChannelOutcomes(report.outcomes)} (correlation: ${payload.correlationId})`
    );
  }

  private async recordDelivery(payload: AlertNotifierPayload, newlyDelivered: NotificationChannel[]): Promise<void> {
    try {
      await this.alertsService.markNotificationSent(payload.alertEventId, newlyDelivered);
    } catch (error) {
      this.logger.error(
        `[NOTIFICATION_STATE_ERROR][${payload.correlationId}] alert=${payload.alertEventId} delivered=${newlyDelivered.join(',')} but could not be marked sent: ${new CaughtError(error).describe()}`
      );
      throw new AlertChannelDeliveryError('Alert delivered but not recorded as sent', newlyDelivered);
    }
  }

  private toChannelEntries({ expo, telegram }: DeliveryOutcomes): Array<[NotificationChannel, ChannelOutcome]> {
    return [
      [NotificationChannel.Expo, expo],
      [NotificationChannel.Telegram, telegram],
    ];
  }

  private async handleUndeliverableNotification(payload: AlertNotifierPayload, outcomes: DeliveryOutcomes): Promise<void> {
    if (await this.notificationsService.isMuted(payload.userId)) {
      await this.handleMutedNotification(payload);
      return;
    }

    this.logger.warn(
      `[ALERT_NO_CHANNEL][${payload.correlationId}] user=${payload.userId} type=${payload.type} VIN ${payload.vin} ` +
      `channels=${this.formatChannelOutcomes(outcomes)}: no notification channel reached the user`
    );
    await this.alertsService.markNotificationUndeliverable(payload.alertEventId);
  }

  private formatChannelOutcomes({ expo, telegram }: DeliveryOutcomes): string {
    return `{expo:${this.describeChannelOutcome(expo)}, telegram:${this.describeChannelOutcome(telegram)}}`;
  }

  private describeChannelOutcome(outcome: ChannelOutcome): string {
    switch (outcome.status) {
      case ChannelOutcomeStatus.AlreadyDelivered:
        return 'ok(earlier)';
      case ChannelOutcomeStatus.Delivered:
        return 'ok';
      case ChannelOutcomeStatus.Skipped:
        return 'none';
      case ChannelOutcomeStatus.Failed:
        return new CaughtError(outcome.error).summarizeReason();
    }
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

  private async deliverNotifications(
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

  private async sendTelegramNotification(payload: AlertNotifierPayload, userLanguage: 'en' | 'fr'): Promise<boolean> {
    if (!(await this.notificationsService.shouldSendTelegram(payload.userId, payload.severity))) {
      return false;
    }

    const telegramStart = Date.now();
    const wasSent = await this.alertNotifierRegistry.notify(payload, userLanguage);
    const telegramTime = Date.now() - telegramStart;

    if (telegramTime > VehicleAlertNotifierService.TELEGRAM_SLOW_THRESHOLD_MS) {
      this.logger.warn(`[TELEGRAM_SLOW][${payload.correlationId}] ${payload.type}: ${telegramTime}ms for user: ${payload.userId}`);
    }

    return wasSent;
  }

  private async handleNotificationFailure(payload: AlertNotifierPayload, deliveredChannels: NotificationChannel[]): Promise<void> {
    try {
      const result = await this.alertsService.recordNotificationAttemptFailure(payload.alertEventId, deliveredChannels, notificationRetryPolicy);
      this.logAttemptResult(payload, result);
    } catch (markingError) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to mark notification attempt for alert ${payload.alertEventId}: ${new CaughtError(markingError).describe()}`);
    }
  }

  private logAttemptResult(payload: AlertNotifierPayload, result: NotificationAttemptResult): void {
    const delivered = result.deliveredChannels.length > 0 ? result.deliveredChannels.join(',') : 'none';

    if (result.outcome === NotificationAttemptOutcome.RetryScheduled) {
      this.logger.warn(`[NOTIFICATION_RETRY_SCHEDULED] Alert ${payload.alertEventId} attempt ${result.attempts}/${NOTIFICATION_SWEEP_MAX_ATTEMPTS} failed, next attempt at ${result.nextAttemptAt?.toISOString()} (delivered=${delivered})`);
    } else if (result.outcome === NotificationAttemptOutcome.PermanentlyFailed) {
      this.logger.error(`[NOTIFICATION_FAILED] Alert ${payload.alertEventId} permanently failed after ${result.attempts} attempts (delivered=none)`);
    } else if (result.outcome === NotificationAttemptOutcome.GaveUpPartiallyDelivered) {
      this.logger.error(`[NOTIFICATION_FAILED] Alert ${payload.alertEventId} gave up on the remaining channel(s) after ${result.attempts} attempts (delivered=${delivered})`);
    }
  }

  private logAlertLatency(
    telemetryMessage: TelemetryMessage,
    handlerStartTime: number,
    latencyLabel: string,
    reactionDelayMs: number
  ): void {
    if (!telemetryMessage.correlationId) {
      return;
    }

    const measuredLatency = telemetryMessage.calculateEndToEndLatency();
    const endToEndLatency = measuredLatency === null ? null : measuredLatency - reactionDelayMs;
    const handlerProcessingTime = Date.now() - handlerStartTime;

    if (endToEndLatency !== null) {
      const isProcessingDelayed = telemetryMessage.isProcessingDelayed(handlerProcessingTime, 3000);

      if (isProcessingDelayed) {
        this.logger.error(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - DELAYED: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ❌`);
      } else {
        this.logger.log(`[${latencyLabel}] CorrelationId: ${telemetryMessage.correlationId} - Total: ${endToEndLatency}ms (Handler: ${handlerProcessingTime}ms) ✅`);
      }
    }
  }
}
