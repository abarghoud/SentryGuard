import { apiClient, tokenStore } from '../../core/api';
import { NotificationApiRepository } from './data/notification.api-repository';
import { NotificationMockRepository } from './data/notification.mock-repository';
import { NotificationRepositoryRequirements } from './domain/notification.repository.requirements';
import { NotificationPreferences } from './domain/entities';
import {
  DeletePushTokenUseCase,
  GetNotificationPreferencesUseCase,
  RegisterPushTokenUseCase,
  UpdateNotificationPreferencesUseCase,
} from './domain/use-cases/notifications.use-cases';
import { DndPolicyAccess } from './infrastructure/dnd-policy-access';
import { PushNotificationService } from './infrastructure/push-notification.service';

class DynamicNotificationRepository implements NotificationRepositoryRequirements {
  public constructor(
    private readonly apiRepo: NotificationRepositoryRequirements,
    private readonly mockRepo: NotificationRepositoryRequirements
  ) {}

  private getRepo(): NotificationRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getNotificationPreferences(token?: string): Promise<NotificationPreferences> {
    return this.getRepo().getNotificationPreferences(token);
  }

  public async registerPushToken(token: string, platform: string): Promise<{ success: boolean }> {
    return this.getRepo().registerPushToken(token, platform);
  }

  public async deletePushToken(token: string): Promise<{ success: boolean }> {
    return this.getRepo().deletePushToken(token);
  }

  public async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
    token?: string
  ): Promise<NotificationPreferences> {
    return this.getRepo().updateNotificationPreferences(preferences, token);
  }
}

export const notificationRepository = new DynamicNotificationRepository(
  new NotificationApiRepository(apiClient),
  new NotificationMockRepository()
);

export const getNotificationPreferencesUseCase = new GetNotificationPreferencesUseCase(notificationRepository);
export const updateNotificationPreferencesUseCase = new UpdateNotificationPreferencesUseCase(notificationRepository);
export const registerPushTokenUseCase = new RegisterPushTokenUseCase(notificationRepository);
export const deletePushTokenUseCase = new DeletePushTokenUseCase(notificationRepository);

export const dndPolicyAccess = new DndPolicyAccess();
export const pushNotificationService = new PushNotificationService(dndPolicyAccess);

