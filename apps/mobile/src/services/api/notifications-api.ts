import { requestApi } from './api-client';

export interface NotificationPreferences {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
  push_enabled: boolean;
  telegram_enabled: boolean;
}

export function getNotificationPreferences(token?: string): Promise<NotificationPreferences> {
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return requestApi<NotificationPreferences>(`/notifications/preferences${query}`);
}

export function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
  token?: string
): Promise<NotificationPreferences> {
  return requestApi<NotificationPreferences>('/notifications/preferences', {
    body: JSON.stringify(token ? { ...preferences, token } : preferences),
    method: 'POST',
  });
}

export function registerPushToken(token: string, platform: string): Promise<{ success: boolean }> {
  return requestApi<{ success: boolean }>('/notifications/push-token', {
    body: JSON.stringify({ platform, token }),
    method: 'POST',
  });
}
