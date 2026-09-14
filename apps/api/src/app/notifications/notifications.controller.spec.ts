import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationsController } from './notifications.controller';
import { NotificationsService, NotificationPreferencesDto } from './notifications.service';
import { User } from '../../entities/user.entity';

describe('The NotificationsController class', () => {
  const fakeUser: User = { userId: 'user-123' } as User;
  let mockNotificationsService: MockProxy<NotificationsService>;
  let controller: NotificationsController;

  beforeEach(() => {
    mockNotificationsService = mock<NotificationsService>();
    controller = new NotificationsController(mockNotificationsService);
  });

  describe('The getPreferences() method', () => {
    describe('When fetching user preferences', () => {
      const fakePreferences: NotificationPreferencesDto = {
        critical_alerts_enabled: true,
        critical_only: false,
        muted_until: null,
        push_enabled: true,
        telegram_enabled: true,
      };

      beforeEach(() => {
        mockNotificationsService.getPreferences.mockResolvedValue(fakePreferences);
      });

      it('should delegate to notificationsService and return preferences', async () => {
        const result = await controller.getPreferences(fakeUser, 'token-123');
        expect(mockNotificationsService.getPreferences).toHaveBeenCalledWith('user-123', 'token-123');
        expect(result).toStrictEqual(fakePreferences);
      });
    });
  });

  describe('The updatePreferences() method', () => {
    describe('When updating user preferences', () => {
      const fakePreferences: NotificationPreferencesDto = {
        critical_alerts_enabled: true,
        critical_only: false,
        muted_until: null,
        push_enabled: true,
        telegram_enabled: false,
      };

      beforeEach(() => {
        mockNotificationsService.updatePreferences.mockResolvedValue(fakePreferences);
      });

      it('should delegate to notificationsService and return updated preferences', async () => {
        const result = await controller.updatePreferences(fakeUser, { telegram_enabled: false, token: 'token-123' });
        expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith('user-123', { telegram_enabled: false }, 'token-123');
        expect(result).toStrictEqual(fakePreferences);
      });
    });
  });

  describe('The mute() method', () => {
    describe('When requesting to mute for 60 minutes', () => {
      const mutedUntil = new Date('2026-09-09T22:00:00.000Z');

      beforeEach(() => {
        mockNotificationsService.mute.mockResolvedValue(mutedUntil);
      });

      it('should call notificationsService.mute and return formatted ISO date', async () => {
        const result = await controller.mute(fakeUser, { minutes: 60 });
        expect(mockNotificationsService.mute).toHaveBeenCalledWith('user-123', 60);
        expect(result).toStrictEqual({ muted_until: '2026-09-09T22:00:00.000Z' });
      });
    });
  });

  describe('The unmute() method', () => {
    describe('When requesting to unmute', () => {
      beforeEach(() => {
        mockNotificationsService.unmute.mockResolvedValue(undefined);
      });

      it('should call notificationsService.unmute and return muted_until as null', async () => {
        const result = await controller.unmute(fakeUser);
        expect(mockNotificationsService.unmute).toHaveBeenCalledWith('user-123');
        expect(result).toStrictEqual({ muted_until: null });
      });
    });
  });
});
