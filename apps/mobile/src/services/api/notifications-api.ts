import { requestApi } from './api-client';

export interface NotificationPreferences {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
  push_enabled: boolean;
  telegram_enabled: boolean;
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return requestApi<NotificationPreferences>('/notifications/preferences');
}

export function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return requestApi<NotificationPreferences>('/notifications/preferences', {
    body: JSON.stringify(preferences),
    method: 'POST',
  });
}

export function registerPushToken(token: string, platform: string): Promise<{ success: boolean }> {
  return requestApi<{ success: boolean }>('/notifications/push-token', {
    body: JSON.stringify({ platform, token }),
    method: 'POST',
  });
}
