import { NotificationPreferences } from '../domain/entities';
import { NotificationRepositoryRequirements } from '../domain/notification.repository.requirements';

export class NotificationMockRepository implements NotificationRepositoryRequirements {
  private preferences: NotificationPreferences = {
    critical_alerts_enabled: true,
    critical_only: false,
    muted_until: null,
    push_enabled: true,
    telegram_enabled: true,
  };

  public async getNotificationPreferences(): Promise<NotificationPreferences> {
    return { ...this.preferences };
  }

  public async registerPushToken(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async deletePushToken(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    this.preferences = { ...this.preferences, ...preferences };
    return { ...this.preferences };
  }

  public async muteNotifications(minutes: number): Promise<{ muted_until: string }> {
    const mutedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    this.preferences.muted_until = mutedUntil;
    return { muted_until: mutedUntil };
  }

  public async unmuteNotifications(): Promise<{ muted_until: null }> {
    this.preferences.muted_until = null;
    return { muted_until: null };
  }
}


