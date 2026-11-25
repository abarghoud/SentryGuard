import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannel } from '../enums/notification-channel.enum';
import { CaughtError } from '../../../common/utils/caught-error';
import {
  NOTIFICATION_RETRY_BASE_DELAY_MS,
  NOTIFICATION_RETRY_MAX_DELAY_MS,
  NOTIFICATION_SWEEP_MAX_ATTEMPTS,
} from '../../../config/notification-sweep-cron.config';
import { UserLanguageService } from '../../user/user-language.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AlertNotificationStateService } from '../alert-notification-state.service';
import { NotificationAttemptOutcome } from '../enums/notification-attempt-outcome.enum';
import { AlertChannelDeliveryError } from './alert-channel-delivery.error';
import { AlertChannelDeliveryService } from './alert-channel-delivery.service';
import { AlertDeliveryReport } from './alert-delivery-report';
import { AlertNotifierPayload } from './alert-notifier.registry';
import { NotificationAttemptResult, NotificationRetryPolicy } from './notification-attempt.types';

const notificationRetryPolicy: NotificationRetryPolicy = {
  baseDelayMs: NOTIFICATION_RETRY_BASE_DELAY_MS,
  maxAttempts: NOTIFICATION_SWEEP_MAX_ATTEMPTS,
  maxDelayMs: NOTIFICATION_RETRY_MAX_DELAY_MS,
};

@Injectable()
export class UserAlertNotificationService {
  private readonly logger = new Logger(UserAlertNotificationService.name);

  constructor(
    private readonly userLanguageService: UserLanguageService,
    private readonly alertNotificationStateService: AlertNotificationStateService,
    private readonly notificationsService: NotificationsService,
    private readonly alertChannelDeliveryService: AlertChannelDeliveryService
  ) {}

  public async notify(payload: AlertNotifierPayload): Promise<void> {
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
    await this.alertNotificationStateService.markNotificationSent(payload.alertEventId);
    this.logger.log(`[${payload.type}] Alert suppressed for muted user ${payload.userId} (correlation: ${payload.correlationId})`);
  }

  private async handleActiveNotification(payload: AlertNotifierPayload): Promise<void> {
    const userLanguage = await this.userLanguageService.getUserLanguage(payload.userId);
    const alreadyDelivered = new Set(payload.deliveredChannels ?? []);
    const outcomes = await this.alertChannelDeliveryService.deliver(payload, userLanguage, alreadyDelivered);
    const report = new AlertDeliveryReport(outcomes, alreadyDelivered);

    if (report.failedChannels.length > 0) {
      this.throwDeliveryFailure(payload, report);
    }

    await this.completeDelivery(payload, report);
  }

  private throwDeliveryFailure(payload: AlertNotifierPayload, report: AlertDeliveryReport): never {
    const failedChannels = report.failedChannels.join(',');
    const failureTag = report.hasDelivered ? 'ALERT_CHANNEL_FAILED' : 'ALERT_DELIVERY_FAILED';

    this.logger.error(
      `[${failureTag}][${payload.correlationId}] user=${payload.userId} alert=${payload.alertEventId} ` +
      `failed=${failedChannels} channels=${report.describeChannels()}`
    );
    throw new AlertChannelDeliveryError(`Alert delivery failed on ${failedChannels}`, report.newlyDelivered);
  }

  private async completeDelivery(payload: AlertNotifierPayload, report: AlertDeliveryReport): Promise<void> {
    if (!report.hasDelivered) {
      await this.handleUndeliverableNotification(payload, report);
      return;
    }

    await this.recordDelivery(payload, report.newlyDelivered);
    this.logger.log(
      `[${payload.type}] Notified user ${payload.userId} for VIN ${payload.vin} channels=${report.describeChannels()} (correlation: ${payload.correlationId})`
    );
  }

  private async recordDelivery(payload: AlertNotifierPayload, newlyDelivered: NotificationChannel[]): Promise<void> {
    try {
      await this.alertNotificationStateService.markNotificationSent(payload.alertEventId, newlyDelivered);
    } catch (error) {
      this.logger.error(
        `[NOTIFICATION_STATE_ERROR][${payload.correlationId}] alert=${payload.alertEventId} delivered=${newlyDelivered.join(',')} but could not be marked sent: ${new CaughtError(error).describe()}`
      );
      throw new AlertChannelDeliveryError('Alert delivered but not recorded as sent', newlyDelivered);
    }
  }

  private async handleUndeliverableNotification(payload: AlertNotifierPayload, report: AlertDeliveryReport): Promise<void> {
    if (await this.notificationsService.isMuted(payload.userId)) {
      await this.handleMutedNotification(payload);
      return;
    }

    this.logger.warn(
      `[ALERT_NO_CHANNEL][${payload.correlationId}] user=${payload.userId} type=${payload.type} VIN ${payload.vin} ` +
      `channels=${report.describeChannels()}: no notification channel reached the user`
    );
    await this.alertNotificationStateService.markNotificationUndeliverable(payload.alertEventId);
  }

  private async handleNotificationFailure(payload: AlertNotifierPayload, deliveredChannels: NotificationChannel[]): Promise<void> {
    try {
      const result = await this.alertNotificationStateService.recordNotificationAttemptFailure(payload.alertEventId, deliveredChannels, notificationRetryPolicy);
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
}
