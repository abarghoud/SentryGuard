import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';
import i18n from '../../i18n';

export interface NotificationPreferencesDto {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepository: Repository<NotificationPreferences>,
    @InjectRepository(PushDeviceToken)
    private readonly pushDeviceTokenRepository: Repository<PushDeviceToken>
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
    await this.pushDeviceTokenRepository.upsert(
      { userId, token, platform, push_enabled: true },
      { conflictPaths: ['token'], skipUpdateIfNoValuesChanged: true }
    );
    return { success: true };
  }

  public async removePushToken(userId: string, token: string): Promise<{ success: boolean }> {
    await this.pushDeviceTokenRepository.delete({ token, userId });
    return { success: true };
  }

  public async shouldSendTelegram(userId: string, _severity: AlertEventSeverity): Promise<boolean> {
    const preferences = await this.findOrCreatePreferences(userId);
    return preferences.telegram_enabled;
  }

  public async sendPushAlert(
    userId: string,
    severity: AlertEventSeverity,
    type: AlertEventType,
    userLanguage: 'en' | 'fr'
  ): Promise<void> {
    const { body, title } = this.resolveAlertTexts(type, userLanguage);
    const devices = await this.pushDeviceTokenRepository.find({ where: { userId, push_enabled: true } });
    const eligibleDevices = devices.filter((device) => this.shouldSendPushToDevice(device, severity));
    await Promise.all(
      eligibleDevices.map((device) => this.sendExpoPush(device, title, body, severity, type, device.critical_alerts_enabled, userId, userLanguage))
    );
  }

  private resolveAlertTexts(type: AlertEventType, lng: 'en' | 'fr'): { body: string; title: string } {
    if (type === AlertEventType.BreakIn) {
      return {
        body: i18n.t('A break-in attempt was detected.', { lng }),
        title: i18n.t('Intrusion alert', { lng }),
      };
    }

    return {
      body: i18n.t('A Sentry event was detected.', { lng }),
      title: i18n.t('Sentry alert', { lng }),
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
      push_enabled: device?.push_enabled ?? false,
      telegram_enabled: preferences.telegram_enabled,
    };
  }

  private shouldSendPushToDevice(device: PushDeviceToken, severity: AlertEventSeverity): boolean {
    return !device.critical_only || severity === AlertEventSeverity.Critical;
  }

  private async sendExpoPush(
    device: PushDeviceToken,
    title: string,
    body: string,
    severity: AlertEventSeverity,
    type: AlertEventType,
    criticalAlertsEnabled: boolean,
    userId: string,
    userLanguage: 'en' | 'fr'
  ): Promise<void> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        body: JSON.stringify(this.buildExpoPushBody(device.token, title, body, severity, type, criticalAlertsEnabled, userId, userLanguage)),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        method: 'POST',
      });

      await this.handleExpoPushResponse(device, response);
    } catch (error) {
      this.logger.warn(`Failed to send push notification: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private buildExpoPushBody(
    token: string,
    title: string,
    body: string,
    severity: AlertEventSeverity,
    type: AlertEventType,
    criticalAlertsEnabled: boolean,
    userId: string,
    userLanguage: 'en' | 'fr'
  ): object {
    const isPriorityAlert = criticalAlertsEnabled && this.shouldUsePriorityChannel(severity, type);
    const channelId = isPriorityAlert ? 'sentryguard-critical-alerts-v5' : 'sentryguard-alerts';

    return {
      body,
      channelId,
      data: {
        channelId,
        criticalAlertsEnabled,
        isCriticalAlert: isPriorityAlert,
        isPriorityAlert,
        severity,
        teslaRedirectUrl: this.buildTeslaRedirectUrl(userId, userLanguage),
        type,
      },
      priority: isPriorityAlert || severity === AlertEventSeverity.Critical ? 'high' : 'default',
      title,
      to: token,
    };
  }

  private shouldUsePriorityChannel(severity: AlertEventSeverity, type: AlertEventType): boolean {
    return severity === AlertEventSeverity.Critical || type === AlertEventType.Sentry;
  }

  private buildTeslaRedirectUrl(userId: string, userLanguage: 'en' | 'fr'): string {
    const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE || 'http://localhost:3000';
    return `${baseUrl}/redirect/tesla-app?userId=${encodeURIComponent(userId)}&lang=${userLanguage}`;
  }

  private async handleExpoPushResponse(device: PushDeviceToken, response: Response): Promise<void> {
    const result = await this.parseExpoPushResponse(response);

    if (!response.ok || result.data?.status === 'error') {
      this.logger.warn(`Expo push rejected token ${device.id}: ${result.data?.message ?? response.statusText}`);
    }

    if (result.data?.details?.error === 'DeviceNotRegistered') {
      await this.removePushDevice(device);
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
