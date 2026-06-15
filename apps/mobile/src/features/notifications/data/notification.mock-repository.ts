import { NotificationPreferences } from '../domain/entities';
import { NotificationRepositoryRequirements } from '../domain/notification.repository.requirements';

export class NotificationMockRepository implements NotificationRepositoryRequirements {
  private preferences: NotificationPreferences = {
    critical_alerts_enabled: true,
    critical_only: false,
    push_enabled: true,
    telegram_enabled: true,
  };

  public async getNotificationPreferences(): Promise<NotificationPreferences> {
    return { ...this.preferences };
  }

  public async registerPushToken(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    this.preferences = { ...this.preferences, ...preferences };
    return { ...this.preferences };
  }
}


