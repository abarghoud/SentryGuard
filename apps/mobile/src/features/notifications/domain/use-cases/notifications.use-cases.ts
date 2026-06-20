import { NotificationPreferences } from '../entities';
import { NotificationRepositoryRequirements } from '../notification.repository.requirements';
import {
  DeletePushTokenRequirements,
  GetNotificationPreferencesRequirements,
  RegisterPushTokenRequirements,
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
