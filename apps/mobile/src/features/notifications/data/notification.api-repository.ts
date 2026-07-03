import { ApiClientRequirements } from '../../../core/api/api-client';
import { InstallationStoreRequirements } from '../../../core/api/installation-store';
import { NotificationPreferences } from '../domain/entities';
import { NotificationRepositoryRequirements } from '../domain/notification.repository.requirements';

export class NotificationApiRepository implements NotificationRepositoryRequirements {
  public constructor(
    private readonly client: ApiClientRequirements,
    private readonly installationStore: InstallationStoreRequirements
  ) {}

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
    const installationId = await this.resolveInstallationId();
    return this.client.request<{ success: boolean }>('/notifications/push-token', {
      body: JSON.stringify(installationId ? { installationId, platform, token } : { platform, token }),
      method: 'POST',
    });
  }

  private async resolveInstallationId(): Promise<string | null> {
    try {
      return await this.installationStore.getInstallationId();
    } catch {
      return null;
    }
  }

  public async deletePushToken(token: string): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/notifications/push-token', {
      body: JSON.stringify({ token }),
      method: 'DELETE',
    });
  }
}
