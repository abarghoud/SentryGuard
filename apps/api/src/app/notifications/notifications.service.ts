import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { PushDeviceToken } from '../../entities/push-device-token.entity';
import { AlertEventSeverity } from '../../entities/alert-event.entity';

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

  public async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const preferences = await this.findOrCreatePreferences(userId);
    return this.toDto(preferences);
  }

  public async updatePreferences(userId: string, preferences: Partial<NotificationPreferencesDto>): Promise<NotificationPreferencesDto> {
    const currentPreferences = await this.findOrCreatePreferences(userId);
    Object.assign(currentPreferences, this.pickPreferenceUpdates(preferences));
    await this.preferencesRepository.save(currentPreferences);
    return this.toDto(currentPreferences);
  }

  public async registerPushToken(userId: string, token: string, platform?: string): Promise<{ success: boolean }> {
    await this.pushDeviceTokenRepository.upsert(
      { userId, token, platform, enabled: true },
      { conflictPaths: ['token'], skipUpdateIfNoValuesChanged: true }
    );
    return { success: true };
  }

  public async shouldSendTelegram(userId: string, severity: AlertEventSeverity): Promise<boolean> {
    const preferences = await this.findOrCreatePreferences(userId);
    return preferences.telegram_enabled && this.allowsSeverity(preferences, severity);
  }

  public async sendPushAlert(
    userId: string,
    title: string,
    body: string,
    severity: AlertEventSeverity,
    userLanguage: 'en' | 'fr'
  ): Promise<void> {
    const preferences = await this.findOrCreatePreferences(userId);
    if (!preferences.push_enabled || !this.allowsSeverity(preferences, severity)) {
      return;
    }

    const devices = await this.pushDeviceTokenRepository.find({ where: { userId, enabled: true } });
    await Promise.all(devices.map((device) => this.sendExpoPush(device, title, body, severity, preferences.critical_alerts_enabled, userId, userLanguage)));
  }

  private async findOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.preferencesRepository.findOne({ where: { userId } });
    if (preferences) {
      return preferences;
    }

    return await this.preferencesRepository.save(this.preferencesRepository.create({ userId }));
  }

  private pickPreferenceUpdates(preferences: Partial<NotificationPreferencesDto>): Partial<NotificationPreferencesDto> {
    return {
      ...(preferences.critical_only !== undefined ? { critical_only: preferences.critical_only } : {}),
      ...(preferences.critical_alerts_enabled !== undefined ? { critical_alerts_enabled: preferences.critical_alerts_enabled } : {}),
      ...(preferences.push_enabled !== undefined ? { push_enabled: preferences.push_enabled } : {}),
      ...(preferences.telegram_enabled !== undefined ? { telegram_enabled: preferences.telegram_enabled } : {}),
    };
  }

  private toDto(preferences: NotificationPreferences): NotificationPreferencesDto {
    return {
      critical_alerts_enabled: preferences.critical_alerts_enabled,
      critical_only: preferences.critical_only,
      push_enabled: preferences.push_enabled,
      telegram_enabled: preferences.telegram_enabled,
    };
  }

  private allowsSeverity(preferences: NotificationPreferences, severity: AlertEventSeverity): boolean {
    return !preferences.critical_only || severity === AlertEventSeverity.Critical;
  }

  private async sendExpoPush(
    device: PushDeviceToken,
    title: string,
    body: string,
    severity: AlertEventSeverity,
    criticalAlertsEnabled: boolean,
    userId: string,
    userLanguage: 'en' | 'fr'
  ): Promise<void> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        body: JSON.stringify(this.buildExpoPushBody(device.token, title, body, severity, criticalAlertsEnabled, userId, userLanguage)),
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
    criticalAlertsEnabled: boolean,
    userId: string,
    userLanguage: 'en' | 'fr'
  ): object {
    const isCriticalAlert = criticalAlertsEnabled && severity === AlertEventSeverity.Critical;
    const channelId = isCriticalAlert ? 'sentryguard-critical-alerts-v5' : 'sentryguard-alerts';

    return {
      body,
      channelId,
      data: { channelId, criticalAlertsEnabled, isCriticalAlert, severity, teslaRedirectUrl: this.buildTeslaRedirectUrl(userId, userLanguage) },
      priority: isCriticalAlert || severity === AlertEventSeverity.Critical ? 'high' : 'default',
      sound: isCriticalAlert ? { critical: true, name: 'default', volume: 1 } : 'default',
      title,
      to: token,
    };
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
      await this.disablePushDevice(device);
    }
  }

  private async parseExpoPushResponse(response: Response): Promise<ExpoPushResponse> {
    try {
      return (await response.json()) as ExpoPushResponse;
    } catch {
      return {};
    }
  }

  private async disablePushDevice(device: PushDeviceToken): Promise<void> {
    device.enabled = false;
    await this.pushDeviceTokenRepository.save(device);
  }
}
