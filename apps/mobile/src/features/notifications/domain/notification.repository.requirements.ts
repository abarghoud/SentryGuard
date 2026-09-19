import { NotificationPreferences } from './entities';

export interface NotificationRepositoryRequirements {
  deletePushToken(token: string): Promise<{ success: boolean }>;
  getNotificationPreferences(token?: string): Promise<NotificationPreferences>;
  muteNotifications(minutes: number): Promise<{ muted_until: string }>;
  registerPushToken(token: string, platform: string): Promise<{ success: boolean }>;
  unmuteNotifications(): Promise<{ muted_until: null }>;
  updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
    token?: string
  ): Promise<NotificationPreferences>;
}
