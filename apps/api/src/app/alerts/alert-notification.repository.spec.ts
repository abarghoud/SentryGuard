import { IsNull, LessThan, LessThanOrEqual, Or, Repository } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';

import { AlertEvent, AlertEventNotificationStatus } from '../../entities/alert-event.entity';
import { NotificationChannel } from './enums/notification-channel.enum';
import { AlertNotificationRepository } from './alert-notification.repository';
import { AlertNotificationState } from './interfaces/alert-notification-repository.requirements';

describe('The AlertNotificationRepository class', () => {
  const fakeAlertId = '4c1f1a52-7a44-4d2b-9b3f-9a9f0b7f6e21';
  let alertEventRepository: MockProxy<Repository<AlertEvent>>;
  let repository: AlertNotificationRepository;

  beforeEach(() => {
    alertEventRepository = mock<Repository<AlertEvent>>();
    repository = new AlertNotificationRepository(alertEventRepository);
  });

  describe('The findDueForSweep() method', () => {
    describe('When searching for alerts the sweep must send', () => {
      const cutoff = new Date('2026-08-14T10:00:00Z');
      const retryDueAt = new Date('2026-08-14T10:02:00Z');

      beforeEach(async () => {
        alertEventRepository.find.mockResolvedValue([]);
        await repository.findDueForSweep(cutoff, retryDueAt, 500);
      });

      it('should pick never-attempted alerts older than the cutoff and failed ones whose backoff elapsed', () => {
        expect(alertEventRepository.find).toHaveBeenCalledWith({
          order: { created_at: 'ASC' },
          take: 500,
          where: [
            { created_at: LessThan(cutoff), notification_next_attempt_at: IsNull(), notification_status: AlertEventNotificationStatus.Pending },
            { notification_next_attempt_at: LessThanOrEqual(retryDueAt), notification_status: AlertEventNotificationStatus.Pending },
          ],
        });
      });
    });
  });

  describe('The leaseDueNotification() method', () => {
    const now = new Date('2026-11-20T00:24:00Z');
    const leaseUntil = new Date('2026-11-20T00:29:00Z');

    describe('When no other server leased the alert first', () => {
      let isLeased: boolean;

      beforeEach(async () => {
        alertEventRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
        isLeased = await repository.leaseDueNotification(fakeAlertId, 2, now, leaseUntil);
      });

      it('should only lease a pending, still-due alert with the attempt count that was read', () => {
        expect(alertEventRepository.update).toHaveBeenCalledWith(
          {
            id: fakeAlertId,
            notification_attempts: 2,
            notification_next_attempt_at: Or(IsNull(), LessThanOrEqual(now)),
            notification_status: AlertEventNotificationStatus.Pending,
          },
          { notification_next_attempt_at: leaseUntil }
        );
      });

      it('should report the alert as leased', () => {
        expect(isLeased).toBe(true);
      });
    });

    describe('When another server leased the alert first', () => {
      it('should report the alert as not leased', async () => {
        alertEventRepository.update.mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });

        expect(await repository.leaseDueNotification(fakeAlertId, 2, now, leaseUntil)).toBe(false);
      });
    });
  });

  describe('The findPendingState() method', () => {
    describe('When the alert is pending', () => {
      const nextAttemptAt = new Date('2026-11-18T22:12:00Z');
      let result: AlertNotificationState | null;

      beforeEach(async () => {
        alertEventRepository.findOne.mockResolvedValue({
          id: fakeAlertId,
          notification_attempts: 1,
          notification_delivered_channels: [NotificationChannel.Expo],
          notification_next_attempt_at: nextAttemptAt,
          notification_status: AlertEventNotificationStatus.Pending,
        } as AlertEvent);
        result = await repository.findPendingState(fakeAlertId);
      });

      it('should only read a pending alert', () => {
        expect(alertEventRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: fakeAlertId, notification_status: AlertEventNotificationStatus.Pending } })
        );
      });

      it('should return its notification state', () => {
        expect(result).toStrictEqual({
          attempts: 1,
          deliveredChannels: [NotificationChannel.Expo],
          nextAttemptAt,
          status: AlertEventNotificationStatus.Pending,
        });
      });
    });

    describe('When the alert is no longer pending', () => {
      it('should return null', async () => {
        alertEventRepository.findOne.mockResolvedValue(null);

        await expect(repository.findPendingState(fakeAlertId)).resolves.toBeNull();
      });
    });
  });

  describe('The replacePendingState() method', () => {
    const nextState: AlertNotificationState = {
      attempts: 2,
      deliveredChannels: [NotificationChannel.Expo],
      nextAttemptAt: new Date('2026-11-18T22:12:00Z'),
      status: AlertEventNotificationStatus.Pending,
    };

    describe('When the alert still has the expected attempt count', () => {
      let result: boolean;

      beforeEach(async () => {
        alertEventRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
        result = await repository.replacePendingState(fakeAlertId, 1, nextState);
      });

      it('should only update the pending alert with the attempt count that was read', () => {
        expect(alertEventRepository.update).toHaveBeenCalledWith(
          { id: fakeAlertId, notification_attempts: 1, notification_status: AlertEventNotificationStatus.Pending },
          {
            notification_attempts: 2,
            notification_delivered_channels: [NotificationChannel.Expo],
            notification_next_attempt_at: nextState.nextAttemptAt,
            notification_status: AlertEventNotificationStatus.Pending,
          }
        );
      });

      it('should report the replacement', () => {
        expect(result).toBe(true);
      });
    });

    describe('When another server changed the alert in between', () => {
      it('should report that nothing was replaced', async () => {
        alertEventRepository.update.mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });

        await expect(repository.replacePendingState(fakeAlertId, 1, nextState)).resolves.toBe(false);
      });
    });
  });
});
