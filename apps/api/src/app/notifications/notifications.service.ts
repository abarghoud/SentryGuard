import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';
import i18n from '../../i18n';
import { NOTIFICATION_REQUEST_TIMEOUT_MS } from '../../config/notification-timeout.config';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { AlertSound } from '../alerts/enums/alert-sound.enum';

export interface PushAlertContext {
  alertSound: AlertSound;
  correlationId?: string;
  severity: AlertEventSeverity;
  type: AlertEventType;
  userId: string;
  userLanguage: 'en' | 'fr';
  vehicleName?: string;
  vin?: string;
}

export interface NotificationPreferencesDto {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
  muted_until: string | null;
  push_enabled: boolean;
  telegram_enabled: boolean;
}

interface ExpoPushResponse {
  data?: {
    details?: {
      error?: string;
    };
    id?: string;
    message?: string;
    status?: string;
  };
}

interface PushAlertContent {
  body: string;
  title: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepository: Repository<NotificationPreferences>,
    @InjectRepository(PushDeviceToken)
    private readonly pushDeviceTokenRepository: Repository<PushDeviceToken>,
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>
  ) {}

  public async getPreferences(userId: string, token?: string): Promise<NotificationPreferencesDto> {
    const preferences = await this.findOrCreatePreferences(userId);
    const device = token ? await this.findPushDevice(userId, token) : null;
    return this.toDto(preferences, device);
  }

  public async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferencesDto>,
    token?: string
  ): Promise<NotificationPreferencesDto> {
    const currentPreferences = await this.findOrCreatePreferences(userId);
    Object.assign(currentPreferences, this.pickGlobalPreferenceUpdates(preferences));
    await this.preferencesRepository.save(currentPreferences);

    const device = token ? await this.resolvePushDeviceForUpdate(userId, token, preferences) : null;
    return this.toDto(currentPreferences, device);
  }

  public async registerPushToken(userId: string, token: string, platform?: string): Promise<{ success: boolean }> {
    const existingDevice = await this.findPushDevice(userId, token);
    if (existingDevice) {
      await this.refreshPushDeviceMetadata(existingDevice, platform);
      return { success: true };
    }

    await this.pushDeviceTokenRepository.upsert(
      { userId, token, platform, push_enabled: true },
      { conflictPaths: ['userId', 'token'], skipUpdateIfNoValuesChanged: true }
    );
    return { success: true };
  }

  private async refreshPushDeviceMetadata(device: PushDeviceToken, platform?: string): Promise<void> {
    if (!platform || device.platform === platform) {
      return;
    }

    device.platform = platform;
    await this.pushDeviceTokenRepository.save(device);
  }

  public async removePushToken(userId: string, token: string): Promise<{ success: boolean }> {
    await this.pushDeviceTokenRepository.delete({ token, userId });
    return { success: true };
  }

  public async shouldSendTelegram(userId: string, _severity: AlertEventSeverity): Promise<boolean> {
    const preferences = await this.findOrCreatePreferences(userId);
    return preferences.telegram_enabled;
  }

  public async mute(userId: string, minutes: number): Promise<Date> {
    const preferences = await this.findOrCreatePreferences(userId);
    const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
    preferences.muted_until = mutedUntil;
    await this.preferencesRepository.save(preferences);
    await this.telegramConfigRepository.update({ userId }, { muted_until: mutedUntil });
    this.logger.log(`[NOTIFICATIONS_MUTE] User ${userId} muted for ${minutes}min until ${mutedUntil.toISOString()}`);
    return mutedUntil;
  }

  public async unmute(userId: string): Promise<void> {
    const preferences = await this.findOrCreatePreferences(userId);
    preferences.muted_until = null;
    await this.preferencesRepository.save(preferences);
    await this.telegramConfigRepository.update({ userId }, { muted_until: null });
    this.logger.log(`[NOTIFICATIONS_UNMUTE] User ${userId} alerts unmuted`);
  }

  public async isMuted(userId: string): Promise<boolean> {
    const preferences = await this.preferencesRepository.findOne({ where: { userId } });
    if (preferences?.muted_until) {
      return new Date() < preferences.muted_until;
    }

    const config = await this.telegramConfigRepository.findOne({
      where: { status: TelegramLinkStatus.LINKED, userId },
    });
    return Boolean(config?.muted_until && new Date() < config.muted_until);
  }

  public async sendPushAlert(context: PushAlertContext): Promise<boolean> {
    const { correlationId, severity, type, userId } = context;

    if (await this.shouldSuppressPush(userId, type)) {
      this.logger.log(`[EXPO_PUSH][${correlationId || 'none'}] Sentry push alert suppressed for muted user: ${userId}`);
      return false;
    }

    const eligibleDevices = await this.findEligibleDevices(userId, severity);

    if (eligibleDevices.length === 0) {
      return false;
    }

    this.logger.log(`[EXPO_PUSH][${correlationId || 'none'}] Sending push to ${eligibleDevices.length} device(s) for user: ${userId}`);

    await this.dispatchPushToDevices(eligibleDevices, context);

    return true;
  }

  private async shouldSuppressPush(userId: string, type: AlertEventType): Promise<boolean> {
    return type === AlertEventType.Sentry && (await this.isMuted(userId));
  }

  private async findEligibleDevices(userId: string, severity: AlertEventSeverity): Promise<PushDeviceToken[]> {
    const devices = await this.pushDeviceTokenRepository.find({ where: { userId, push_enabled: true } });
    return devices.filter((device) => this.shouldSendPushToDevice(device, severity));
  }

  private async dispatchPushToDevices(devices: PushDeviceToken[], context: PushAlertContext): Promise<void> {
    const content = this.resolveAlertTexts(context.type, context.userLanguage, context.vehicleName);
    const results = await Promise.allSettled(
      devices.map((device) => this.sendExpoPush(device, content, context))
    );

    const hasSuccess = results.some((result) => result.status === 'fulfilled');

    if (!hasSuccess) {
      const firstError = (results[0] as PromiseRejectedResult).reason;
      throw firstError;
    }
  }

  private resolveAlertTexts(type: AlertEventType, lng: 'en' | 'fr', vehicleName?: string): PushAlertContent {
    const context = vehicleName ? 'withVehicle' : undefined;
    const [bodyKey, titleKey] = type === AlertEventType.BreakIn
      ? ['A break-in attempt was detected.', 'Intrusion alert']
      : ['A Sentry event was detected.', 'Sentry alert'];

    return {
      body: i18n.t(bodyKey, { lng }),
      title: i18n.t(titleKey, { context, lng, vehicleName }),
    };
  }

  private async findOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.preferencesRepository.findOne({ where: { userId } });
    if (preferences) {
      return preferences;
    }

    return await this.preferencesRepository.save(this.preferencesRepository.create({ userId }));
  }

  private async findPushDevice(userId: string, token: string): Promise<PushDeviceToken | null> {
    return await this.pushDeviceTokenRepository.findOne({ where: { token, userId } });
  }

  private async updatePushDevicePreferences(
    userId: string,
    token: string,
    preferences: Partial<NotificationPreferencesDto>
  ): Promise<PushDeviceToken> {
    const device =
      (await this.findPushDevice(userId, token)) ??
      this.pushDeviceTokenRepository.create({ push_enabled: preferences.push_enabled ?? false, token, userId });
    Object.assign(device, this.pickPushDeviceUpdates(preferences));
    return await this.pushDeviceTokenRepository.save(device);
  }

  private async resolvePushDeviceForUpdate(
    userId: string,
    token: string,
    preferences: Partial<NotificationPreferencesDto>
  ): Promise<PushDeviceToken | null> {
    if (this.hasPushDeviceUpdates(preferences)) {
      return await this.updatePushDevicePreferences(userId, token, preferences);
    }

    return await this.findPushDevice(userId, token);
  }

  private hasPushDeviceUpdates(preferences: Partial<NotificationPreferencesDto>): boolean {
    return (
      preferences.critical_alerts_enabled !== undefined ||
      preferences.critical_only !== undefined ||
      preferences.push_enabled !== undefined
    );
  }

  private pickGlobalPreferenceUpdates(preferences: Partial<NotificationPreferencesDto>): Partial<NotificationPreferences> {
    return {
      ...(preferences.telegram_enabled !== undefined ? { telegram_enabled: preferences.telegram_enabled } : {}),
    };
  }

  private pickPushDeviceUpdates(preferences: Partial<NotificationPreferencesDto>): Partial<PushDeviceToken> {
    return {
      ...(preferences.critical_only !== undefined ? { critical_only: preferences.critical_only } : {}),
      ...(preferences.critical_alerts_enabled !== undefined ? { critical_alerts_enabled: preferences.critical_alerts_enabled } : {}),
      ...(preferences.push_enabled !== undefined ? { push_enabled: preferences.push_enabled } : {}),
    };
  }

  private toDto(preferences: NotificationPreferences, device: PushDeviceToken | null): NotificationPreferencesDto {
    return {
      critical_alerts_enabled: device?.critical_alerts_enabled ?? false,
      critical_only: device?.critical_only ?? false,
      muted_until: preferences.muted_until ? preferences.muted_until.toISOString() : null,
      push_enabled: device?.push_enabled ?? false,
      telegram_enabled: preferences.telegram_enabled,
    };
  }

  private shouldSendPushToDevice(device: PushDeviceToken, severity: AlertEventSeverity): boolean {
    return !device.critical_only || severity === AlertEventSeverity.Critical;
  }

  private async sendExpoPush(
    device: PushDeviceToken,
    content: PushAlertContent,
    context: PushAlertContext
  ): Promise<void> {
    const { correlationId } = context;

    try {
      const pushStart = Date.now();
      const response = await withTimeout(
        (signal) => fetch('https://exp.host/--/api/v2/push/send', {
          body: JSON.stringify(this.buildExpoPushBody(device, content, context)),
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          method: 'POST',
          signal,
        }),
        NOTIFICATION_REQUEST_TIMEOUT_MS,
        `Expo push request timed out after ${NOTIFICATION_REQUEST_TIMEOUT_MS}ms`
      );

      const pushTime = Date.now() - pushStart;
      this.logger.log(`[EXPO_PUSH_LATENCY][${correlationId || 'none'}] Push sent to device ${device.id} in ${pushTime}ms`);

      await this.handleExpoPushResponse(device, response);
    } catch (error) {
      this.logger.error(`[NOTIFICATION_ERROR] Failed to send push notification: ${error instanceof Error ? error.message : 'unknown error'} (correlation: ${correlationId || 'none'})`);
      throw error;
    }
  }

  private buildExpoPushBody(device: PushDeviceToken, content: PushAlertContent, context: PushAlertContext): object {
    const { alertSound, severity, type } = context;
    const criticalAlertsEnabled = device.critical_alerts_enabled;
    const isPriorityAlert = criticalAlertsEnabled && this.shouldUsePriorityChannel(severity, type);
    const channelId = this.resolveChannelId(alertSound, isPriorityAlert);

    const pushMessage: Record<string, unknown> = {
      body: content.body,
      categoryId: type === AlertEventType.Sentry ? 'sentry_alert' : undefined,
      channelId,
      data: {
        alertSound,
        channelId,
        criticalAlertsEnabled,
        isCriticalAlert: isPriorityAlert,
        isPriorityAlert,
        severity: context.severity,
        teslaRedirectUrl: this.buildTeslaRedirectUrl(context.userId, context.userLanguage),
        type: context.type,
        vin: context.vin,
      },
      priority: 'high',
      title: content.title,
      to: device.token,
      ...this.resolveIosSound(alertSound, criticalAlertsEnabled && severity === AlertEventSeverity.Critical),
    };

    return pushMessage;
  }

  private resolveChannelId(alertSound: AlertSound, isPriorityAlert: boolean): string {
    if (alertSound === AlertSound.PhoneDefault) {
      return isPriorityAlert ? 'sentryguard-critical-alerts-v5' : 'sentryguard-alerts';
    }

    const soundBase = alertSound.replace('.wav', '');
    return isPriorityAlert ? `sentryguard-critical-${soundBase}` : `sentryguard-alerts-${soundBase}`;
  }

  private resolveIosSound(alertSound: AlertSound, isIosCritical: boolean): Record<string, unknown> {
    if (!isIosCritical) {
      return { sound: alertSound === AlertSound.PhoneDefault ? 'default' : alertSound };
    }

    if (alertSound === AlertSound.PhoneDefault) {
      return { interruptionLevel: 'critical', sound: 'default' };
    }

    return { interruptionLevel: 'critical', sound: { critical: true, name: alertSound, volume: 1.0 } };
  }

  private shouldUsePriorityChannel(severity: AlertEventSeverity, type: AlertEventType): boolean {
    return severity === AlertEventSeverity.Critical;
  }

  private buildTeslaRedirectUrl(userId: string, userLanguage: 'en' | 'fr'): string {
    const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE || 'http://localhost:3000';
    return `${baseUrl}/redirect/tesla-app?userId=${encodeURIComponent(userId)}&lang=${userLanguage}`;
  }

  private async handleExpoPushResponse(device: PushDeviceToken, response: Response): Promise<void> {
    const result = await this.parseExpoPushResponse(response);

    if (result.data?.details?.error === 'DeviceNotRegistered') {
      await this.removePushDevice(device);
    }

    if (!response.ok || result.data?.status === 'error') {
      const message = result.data?.message ?? response.statusText ?? 'Expo push rejected';
      this.logger.warn(`[NOTIFICATION_ERROR] Expo push rejected token ${device.id}: ${message}`);
      throw new Error(message);
    }
  }

  private async parseExpoPushResponse(response: Response): Promise<ExpoPushResponse> {
    try {
      return (await response.json()) as ExpoPushResponse;
    } catch {
      return {};
    }
  }

  private async removePushDevice(device: PushDeviceToken): Promise<void> {
    await this.pushDeviceTokenRepository.delete({ id: device.id });
  }
}
