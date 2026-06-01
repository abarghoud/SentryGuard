import { ApiClientRequirements } from '../../../core/api/api-client';
import { NotificationPreferences } from '../domain/entities';
import { NotificationRepositoryRequirements } from '../domain/notification.repository.requirements';

export class NotificationApiRepository implements NotificationRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getNotificationPreferences(token?: string): Promise<NotificationPreferences> {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return this.client.request<NotificationPreferences>(`/notifications/preferences${query}`);
  }

  public async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
    token?: string
  ): Promise<NotificationPreferences> {
    return this.client.request<NotificationPreferences>('/notifications/preferences', {
      body: JSON.stringify(token ? { ...preferences, token } : preferences),
      method: 'POST',
    });
  }

  public async registerPushToken(token: string, platform: string): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/notifications/push-token', {
      body: JSON.stringify({ platform, token }),
      method: 'POST',
    });
  }
}
