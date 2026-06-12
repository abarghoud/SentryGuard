import { apiClient } from '../../core/api';
import { NotificationApiRepository } from './data/notification.api-repository';
import {
  GetNotificationPreferencesUseCase,
  RegisterPushTokenUseCase,
  UpdateNotificationPreferencesUseCase,
} from './domain/use-cases/notifications.use-cases';
import { DndPolicyAccess } from './infrastructure/dnd-policy-access';
import { PushNotificationService } from './infrastructure/push-notification.service';

export const notificationRepository = new NotificationApiRepository(apiClient);

export const getNotificationPreferencesUseCase = new GetNotificationPreferencesUseCase(notificationRepository);
export const updateNotificationPreferencesUseCase = new UpdateNotificationPreferencesUseCase(notificationRepository);
export const registerPushTokenUseCase = new RegisterPushTokenUseCase(notificationRepository);

export const dndPolicyAccess = new DndPolicyAccess();
export const pushNotificationService = new PushNotificationService(dndPolicyAccess);
