import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationRepositoryRequirements } from '../notification.repository.requirements';
import {
  DeletePushTokenUseCase,
  GetNotificationPreferencesUseCase,
  MuteNotificationsUseCase,
  RegisterPushTokenUseCase,
  UnmuteNotificationsUseCase,
  UpdateNotificationPreferencesUseCase,
} from './notifications.use-cases';
import { NotificationPreferences } from '../entities';

describe('The Notifications use cases', () => {
  let mockRepository: MockProxy<NotificationRepositoryRequirements>;

  beforeEach(() => {
    mockRepository = mock<NotificationRepositoryRequirements>();
  });

  describe('The GetNotificationPreferencesUseCase class', () => {
    const fakePreferences: NotificationPreferences = {
      critical_alerts_enabled: false,
      critical_only: false,
      muted_until: null,
      push_enabled: true,
      telegram_enabled: true,
    };

    it('should delegate to repository.getNotificationPreferences', async () => {
      mockRepository.getNotificationPreferences.mockResolvedValue(fakePreferences);
      const useCase = new GetNotificationPreferencesUseCase(mockRepository);

      const result = await useCase.execute('token-1');

      expect(mockRepository.getNotificationPreferences).toHaveBeenCalledWith('token-1');
      expect(result).toStrictEqual(fakePreferences);
    });
  });

  describe('The UpdateNotificationPreferencesUseCase class', () => {
    const fakePreferences: NotificationPreferences = {
      critical_alerts_enabled: true,
      critical_only: false,
      muted_until: null,
      push_enabled: true,
      telegram_enabled: false,
    };

    it('should delegate to repository.updateNotificationPreferences', async () => {
      mockRepository.updateNotificationPreferences.mockResolvedValue(fakePreferences);
      const useCase = new UpdateNotificationPreferencesUseCase(mockRepository);

      const result = await useCase.execute({ telegram_enabled: false }, 'token-1');

      expect(mockRepository.updateNotificationPreferences).toHaveBeenCalledWith({ telegram_enabled: false }, 'token-1');
      expect(result).toStrictEqual(fakePreferences);
    });
  });

  describe('The RegisterPushTokenUseCase class', () => {
    it('should delegate to repository.registerPushToken', async () => {
      mockRepository.registerPushToken.mockResolvedValue({ success: true });
      const useCase = new RegisterPushTokenUseCase(mockRepository);

      const result = await useCase.execute('token-1', 'ios');

      expect(mockRepository.registerPushToken).toHaveBeenCalledWith('token-1', 'ios');
      expect(result).toStrictEqual({ success: true });
    });
  });

  describe('The DeletePushTokenUseCase class', () => {
    it('should delegate to repository.deletePushToken', async () => {
      mockRepository.deletePushToken.mockResolvedValue({ success: true });
      const useCase = new DeletePushTokenUseCase(mockRepository);

      const result = await useCase.execute('token-1');

      expect(mockRepository.deletePushToken).toHaveBeenCalledWith('token-1');
      expect(result).toStrictEqual({ success: true });
    });
  });

  describe('The MuteNotificationsUseCase class', () => {
    it('should delegate to repository.muteNotifications with minutes', async () => {
      mockRepository.muteNotifications.mockResolvedValue({ muted_until: '2026-09-09T22:00:00.000Z' });
      const useCase = new MuteNotificationsUseCase(mockRepository);

      const result = await useCase.execute(60);

      expect(mockRepository.muteNotifications).toHaveBeenCalledWith(60);
      expect(result).toStrictEqual({ muted_until: '2026-09-09T22:00:00.000Z' });
    });
  });

  describe('The UnmuteNotificationsUseCase class', () => {
    it('should delegate to repository.unmuteNotifications', async () => {
      mockRepository.unmuteNotifications.mockResolvedValue({ muted_until: null });
      const useCase = new UnmuteNotificationsUseCase(mockRepository);

      const result = await useCase.execute();

      expect(mockRepository.unmuteNotifications).toHaveBeenCalled();
      expect(result).toStrictEqual({ muted_until: null });
    });
  });
});
