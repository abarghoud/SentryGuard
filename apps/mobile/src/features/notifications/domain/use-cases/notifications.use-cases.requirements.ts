import { NotificationPreferences } from '../entities';

export interface GetNotificationPreferencesRequirements {
  execute(token?: string): Promise<NotificationPreferences>;
}

export interface UpdateNotificationPreferencesRequirements {
  execute(preferences: Partial<NotificationPreferences>, token?: string): Promise<NotificationPreferences>;
}

export interface RegisterPushTokenRequirements {
  execute(token: string, platform: string): Promise<{ success: boolean }>;
}

export interface DeletePushTokenRequirements {
  execute(token: string): Promise<{ success: boolean }>;
}
