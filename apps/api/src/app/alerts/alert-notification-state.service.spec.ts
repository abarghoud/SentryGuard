import { mock, MockProxy } from 'jest-mock-extended';

import { AlertEvent, AlertEventNotificationStatus } from '../../entities/alert-event.entity';
import { NotificationChannel } from './enums/notification-channel.enum';
import { AlertNotificationStateService } from './alert-notification-state.service';
import { NotificationAttemptOutcome } from './enums/notification-attempt-outcome.enum';
import { NotificationAttemptResult } from './common/notification-attempt.types';
import {
  AlertNotificationRepositoryRequirements,
  AlertNotificationState,
} from './interfaces/alert-notification-repository.requirements';

describe('The AlertNotificationStateService class', () => {
  const fakeAlertId = '4c1f1a52-7a44-4d2b-9b3f-9a9f0b7f6e21';

  let service: AlertNotificationStateService;
  let mockAlertNotificationRepository: MockProxy<AlertNotificationRepositoryRequirements>;

  beforeEach(() => {
    mockAlertNotificationRepository = mock<AlertNotificationRepositoryRequirements>();
    service = new AlertNotificationStateService(mockAlertNotificationRepository);
  });

  describe('The markNotificationSent() method', () => {
    describe('When the notification is still pending', () => {
      beforeEach(async () => {
        mockAlertNotificationRepository.findPendingState.mockResolvedValue(pendingState({ deliveredChannels: [NotificationChannel.Expo] }));
        mockAlertNotificationRepository.replacePendingState.mockResolvedValue(true);
        await service.markNotificationSent(fakeAlertId, [NotificationChannel.Telegram]);
      });

      it('should mark it sent with the merged channels, guarded by the attempt count it read', () => {
        expect(mockAlertNotificationRepository.replacePendingState).toHaveBeenCalledWith(fakeAlertId, 2, {
          attempts: 2,
          deliveredChannels: [NotificationChannel.Expo, NotificationChannel.Telegram],
          nextAttemptAt: null,
          status: AlertEventNotificationStatus.Sent,
        });
      });
    });

    describe('When the notification is no longer pending', () => {
      beforeEach(async () => {
        mockAlertNotificationRepository.findPendingState.mockResolvedValue(null);
        await service.markNotificationSent(fakeAlertId);
      });

      it('should not write anything', () => {
        expect(mockAlertNotificationRepository.replacePendingState).not.toHaveBeenCalled();
      });
    });

    describe('When another server changed the state in between', () => {
      beforeEach(async () => {
        mockAlertNotificationRepository.findPendingState
          .mockResolvedValueOnce(pendingState({ attempts: 2 }))
          .mockResolvedValueOnce(pendingState({ attempts: 3, deliveredChannels: [NotificationChannel.Expo] }));
        mockAlertNotificationRepository.replacePendingState.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        await service.markNotificationSent(fakeAlertId, [NotificationChannel.Telegram]);
      });

      it('should retry from the fresh state', () => {
        expect(mockAlertNotificationRepository.replacePendingState).toHaveBeenLastCalledWith(fakeAlertId, 3, {
          attempts: 3,
          deliveredChannels: [NotificationChannel.Expo, NotificationChannel.Telegram],
          nextAttemptAt: null,
          status: AlertEventNotificationStatus.Sent,
        });
      });
    });

    describe('When the state keeps changing concurrently', () => {
      beforeEach(() => {
        mockAlertNotificationRepository.findPendingState.mockResolvedValue(pendingState());
        mockAlertNotificationRepository.replacePendingState.mockResolvedValue(false);
      });

      it('should give up with an error', async () => {
        await expect(service.markNotificationSent(fakeAlertId)).rejects.toThrow(
          `Notification state of alert ${fakeAlertId} kept changing concurrently`
        );
      });
    });
  });

  describe('The markNotificationUndeliverable() method', () => {
    describe('When no channel can reach the user', () => {
      beforeEach(async () => {
        mockAlertNotificationRepository.findPendingState.mockResolvedValue(pendingState());
        mockAlertNotificationRepository.replacePendingState.mockResolvedValue(true);
        await service.markNotificationUndeliverable(fakeAlertId);
      });

      it('should mark the pending event as failed so the sweep stops picking it up', () => {
        expect(mockAlertNotificationRepository.replacePendingState).toHaveBeenCalledWith(fakeAlertId, 2, {
          attempts: 2,
          deliveredChannels: [],
          nextAttemptAt: null,
          status: AlertEventNotificationStatus.Failed,
        });
      });
    });
  });

  describe('The recordNotificationAttemptFailure() method', () => {
    const policy = { baseDelayMs: 60_000, maxAttempts: 6, maxDelayMs: 900_000 };
    const now = new Date('2026-11-18T22:10:00Z');
    let result: NotificationAttemptResult;

    const recordFrom = async (state: AlertNotificationState | null): Promise<NotificationAttemptResult> => {
      mockAlertNotificationRepository.findPendingState.mockResolvedValue(state);
      mockAlertNotificationRepository.replacePendingState.mockResolvedValue(true);
      return service.recordNotificationAttemptFailure(fakeAlertId, [NotificationChannel.Expo], policy);
    };

    beforeEach(() => {
      jest.useFakeTimers({ now });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('When the attempt can still be retried', () => {
      beforeEach(async () => {
        result = await recordFrom(pendingState({ attempts: 1 }));
      });

      it('should store the incremented attempt, merged channels and backoff, guarded by the attempt count it read', () => {
        expect(mockAlertNotificationRepository.replacePendingState).toHaveBeenCalledWith(fakeAlertId, 1, {
          attempts: 2,
          deliveredChannels: [NotificationChannel.Expo],
          nextAttemptAt: new Date('2026-11-18T22:12:00Z'),
          status: AlertEventNotificationStatus.Pending,
        });
      });

      it('should report the scheduled retry', () => {
        expect(result).toStrictEqual({
          attempts: 2,
          deliveredChannels: [NotificationChannel.Expo],
          nextAttemptAt: new Date('2026-11-18T22:12:00Z'),
          outcome: NotificationAttemptOutcome.RetryScheduled,
        });
      });
    });

    describe('When the last attempt failed and no channel ever delivered', () => {
      beforeEach(async () => {
        mockAlertNotificationRepository.findPendingState.mockResolvedValue(pendingState({ attempts: 5 }));
        mockAlertNotificationRepository.replacePendingState.mockResolvedValue(true);
        result = await service.recordNotificationAttemptFailure(fakeAlertId, [], policy);
      });

      it('should report a permanent failure', () => {
        expect(result.outcome).toBe(NotificationAttemptOutcome.PermanentlyFailed);
      });
    });

    describe('When the last attempt failed but another channel had delivered', () => {
      beforeEach(async () => {
        result = await recordFrom(pendingState({ attempts: 5 }));
      });

      it('should report that the remaining channels were given up', () => {
        expect(result.outcome).toBe(NotificationAttemptOutcome.GaveUpPartiallyDelivered);
      });
    });

    describe('When the event is no longer pending', () => {
      beforeEach(async () => {
        result = await recordFrom(null);
      });

      it('should report that nothing was recorded', () => {
        expect(result.outcome).toBe(NotificationAttemptOutcome.NotPending);
      });
    });
  });

  describe('The findNotificationsDueForSweep() method', () => {
    describe('When searching for pending notifications to send', () => {
      const cutoff = new Date('2026-08-14T10:00:00Z');
      const now = new Date('2026-08-14T10:02:00Z');
      const dueAlerts = [{ id: fakeAlertId } as AlertEvent];
      let result: AlertEvent[];

      beforeEach(async () => {
        mockAlertNotificationRepository.findDueForSweep.mockResolvedValue(dueAlerts);
        result = await service.findNotificationsDueForSweep(cutoff, 500, now);
      });

      it('should ask the repository for never-attempted alerts older than the cutoff and retries due now', () => {
        expect(mockAlertNotificationRepository.findDueForSweep).toHaveBeenCalledWith(cutoff, now, 500);
      });

      it('should return the found events', () => {
        expect(result).toStrictEqual(dueAlerts);
      });
    });
  });

  describe('The leaseNotification() method', () => {
    const now = new Date('2026-11-19T21:30:00.000Z');
    let result: { isLeased: boolean };

    beforeEach(async () => {
      jest.useFakeTimers({ now });
      mockAlertNotificationRepository.leaseDueNotification.mockResolvedValue(true);
      result = await service.leaseNotification(fakeAlertId, 3, 300_000);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reserve the alert until the lease ends, guarded by the attempt count', () => {
      expect(mockAlertNotificationRepository.leaseDueNotification).toHaveBeenCalledWith(
        fakeAlertId,
        3,
        now,
        new Date('2026-11-19T21:35:00.000Z')
      );
    });

    it('should report whether this server got the alert', () => {
      expect(result).toStrictEqual({ isLeased: true });
    });
  });

  const pendingState = (overrides: Partial<AlertNotificationState> = {}): AlertNotificationState => ({
    attempts: 2,
    deliveredChannels: [],
    nextAttemptAt: null,
    status: AlertEventNotificationStatus.Pending,
    ...overrides,
  });
});
