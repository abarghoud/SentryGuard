import { NotificationPreferences } from './entities';

export interface NotificationRepositoryRequirements {
  getNotificationPreferences(token?: string): Promise<NotificationPreferences>;
  registerPushToken(token: string, platform: string): Promise<{ success: boolean }>;
  updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
    token?: string
  ): Promise<NotificationPreferences>;
}
