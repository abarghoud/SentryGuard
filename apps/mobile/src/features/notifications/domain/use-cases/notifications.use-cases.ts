import { NotificationPreferences } from '../entities';
import { NotificationRepositoryRequirements } from '../notification.repository.requirements';
import {
  DeletePushTokenRequirements,
  GetNotificationPreferencesRequirements,
  MuteNotificationsRequirements,
  RegisterPushTokenRequirements,
  UnmuteNotificationsRequirements,
  UpdateNotificationPreferencesRequirements,
} from './notifications.use-cases.requirements';

export class GetNotificationPreferencesUseCase implements GetNotificationPreferencesRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(token?: string): Promise<NotificationPreferences> {
    return this.repository.getNotificationPreferences(token);
  }
}

export class UpdateNotificationPreferencesUseCase implements UpdateNotificationPreferencesRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(
    preferences: Partial<NotificationPreferences>,
    token?: string
  ): Promise<NotificationPreferences> {
    return this.repository.updateNotificationPreferences(preferences, token);
  }
}

export class RegisterPushTokenUseCase implements RegisterPushTokenRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(token: string, platform: string): Promise<{ success: boolean }> {
    return this.repository.registerPushToken(token, platform);
  }
}

export class DeletePushTokenUseCase implements DeletePushTokenRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(token: string): Promise<{ success: boolean }> {
    return this.repository.deletePushToken(token);
  }
}

export class MuteNotificationsUseCase implements MuteNotificationsRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(minutes: number): Promise<{ muted_until: string }> {
    return this.repository.muteNotifications(minutes);
  }
}

export class UnmuteNotificationsUseCase implements UnmuteNotificationsRequirements {
  public constructor(private readonly repository: NotificationRepositoryRequirements) {}

  public async execute(): Promise<{ muted_until: null }> {
    return this.repository.unmuteNotifications();
  }
}
