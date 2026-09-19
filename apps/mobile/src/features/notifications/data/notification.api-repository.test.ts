import { mock, MockProxy } from 'jest-mock-extended';
import { ApiClientRequirements } from '../../../core/api/api-client';
import { NotificationApiRepository } from './notification.api-repository';
import { NotificationPreferences } from '../domain/entities';

describe('The NotificationApiRepository class', () => {
  let mockClient: MockProxy<ApiClientRequirements>;
  let repository: NotificationApiRepository;

  beforeEach(() => {
    mockClient = mock<ApiClientRequirements>();
    repository = new NotificationApiRepository(mockClient);
  });

  describe('The getNotificationPreferences() method', () => {
    const fakePreferences: NotificationPreferences = {
      critical_alerts_enabled: true,
      critical_only: false,
      muted_until: null,
      push_enabled: true,
      telegram_enabled: true,
    };

    it('should call GET /notifications/preferences with token query if provided', async () => {
      mockClient.request.mockResolvedValue(fakePreferences);

      const result = await repository.getNotificationPreferences('token-123');

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/preferences?token=token-123');
      expect(result).toStrictEqual(fakePreferences);
    });

    it('should call GET /notifications/preferences without query if token is omitted', async () => {
      mockClient.request.mockResolvedValue(fakePreferences);

      const result = await repository.getNotificationPreferences();

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/preferences');
      expect(result).toStrictEqual(fakePreferences);
    });
  });

  describe('The updateNotificationPreferences() method', () => {
    const fakePreferences: NotificationPreferences = {
      critical_alerts_enabled: true,
      critical_only: false,
      muted_until: null,
      push_enabled: false,
      telegram_enabled: true,
    };

    it('should call POST /notifications/preferences with payload', async () => {
      mockClient.request.mockResolvedValue(fakePreferences);

      const result = await repository.updateNotificationPreferences({ push_enabled: false }, 'token-123');

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/preferences', {
        body: JSON.stringify({ push_enabled: false, token: 'token-123' }),
        method: 'POST',
      });
      expect(result).toStrictEqual(fakePreferences);
    });
  });

  describe('The registerPushToken() method', () => {
    it('should call POST /notifications/push-token with platform and token', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await repository.registerPushToken('token-123', 'ios');

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/push-token', {
        body: JSON.stringify({ platform: 'ios', token: 'token-123' }),
        method: 'POST',
      });
      expect(result).toStrictEqual({ success: true });
    });
  });

  describe('The deletePushToken() method', () => {
    it('should call DELETE /notifications/push-token with token', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const result = await repository.deletePushToken('token-123');

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/push-token', {
        body: JSON.stringify({ token: 'token-123' }),
        method: 'DELETE',
      });
      expect(result).toStrictEqual({ success: true });
    });
  });

  describe('The muteNotifications() method', () => {
    it('should call POST /notifications/mute with minutes', async () => {
      mockClient.request.mockResolvedValue({ muted_until: '2026-09-09T22:00:00.000Z' });

      const result = await repository.muteNotifications(60);

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/mute', {
        body: JSON.stringify({ minutes: 60 }),
        method: 'POST',
      });
      expect(result).toStrictEqual({ muted_until: '2026-09-09T22:00:00.000Z' });
    });
  });

  describe('The unmuteNotifications() method', () => {
    it('should call POST /notifications/unmute', async () => {
      mockClient.request.mockResolvedValue({ muted_until: null });

      const result = await repository.unmuteNotifications();

      expect(mockClient.request).toHaveBeenCalledWith('/notifications/unmute', {
        method: 'POST',
      });
      expect(result).toStrictEqual({ muted_until: null });
    });
  });
});
