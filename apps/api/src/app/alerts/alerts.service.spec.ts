import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  AlertEvent,
  AlertEventNotificationStatus,
  AlertEventSeverity,
  AlertEventType,
} from '../../entities/alert-event.entity';
import { AlertsService } from './alerts.service';

describe('The AlertsService class', () => {
  const fakeUserId = 'user-123';
  const fakeAlertId = '4c1f1a52-7a44-4d2b-9b3f-9a9f0b7f6e21';

  let service: AlertsService;
  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const mockAlertEventRepository = {
    create: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    delete: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(AlertEvent), useValue: mockAlertEventRepository },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  describe('The clearForUser() method', () => {
    describe('When clearing the alerts of a user', () => {
      beforeEach(async () => {
        await service.clearForUser(fakeUserId);
      });

      it('should delete every alert of this user only', () => {
        expect(mockAlertEventRepository.delete).toHaveBeenCalledWith({ userId: fakeUserId });
      });
    });
  });

  describe('The deleteForUser() method', () => {
    describe('When deleting a single alert', () => {
      beforeEach(async () => {
        await service.deleteForUser(fakeUserId, fakeAlertId);
      });

      it('should scope the deletion to the alert id and the user', () => {
        expect(mockAlertEventRepository.delete).toHaveBeenCalledWith({ id: fakeAlertId, userId: fakeUserId });
      });
    });
  });

  describe('The record() method', () => {
    describe('When recording an alert', () => {
      let result: string;

      beforeEach(async () => {
        mockAlertEventRepository.save.mockResolvedValue({ id: fakeAlertId });
        mockAlertEventRepository.find.mockResolvedValue([]);
        result = await service.record(fakeUserId, 'VIN-1', AlertEventType.Sentry, AlertEventSeverity.Warning, 'My Tesla');
      });

      it('should return the created alert id', () => {
        expect(result).toBe(fakeAlertId);
      });
    });
  });

  describe('The markNotificationSent() method', () => {
    describe('When marking a notification as sent', () => {
      beforeEach(async () => {
        mockAlertEventRepository.update.mockResolvedValue({ affected: 1 });
        await service.markNotificationSent(fakeAlertId);
      });

      it('should only update pending events', () => {
        expect(mockAlertEventRepository.update).toHaveBeenCalledWith(
          { id: fakeAlertId, notification_status: AlertEventNotificationStatus.Pending },
          { notification_status: AlertEventNotificationStatus.Sent }
        );
      });
    });
  });

  describe('The markNotificationAttemptFailed() method', () => {
    beforeEach(async () => {
      mockAlertEventRepository.update.mockResolvedValue({ affected: 1 });
      await service.markNotificationAttemptFailed(fakeAlertId, 3);
    });

    it('should increment the attempts counter atomically', () => {
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ notification_attempts: expect.any(Function) });
    });

    it('should mark as failed when attempts reach the threshold', () => {
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ notification_status: AlertEventNotificationStatus.Failed });
    });

    it('should scope both updates to pending events', () => {
      const whereCalls = mockQueryBuilder.where.mock.calls.map((call) => call[0]);
      expect(whereCalls[0]).toContain('notification_status = :pendingStatus');
      expect(whereCalls[1]).toContain('notification_attempts >= :maxAttempts');
    });
  });

  describe('The findPendingNotificationsBefore() method', () => {
    describe('When searching for stale pending notifications', () => {
      let result: AlertEvent[];

      beforeEach(async () => {
        mockAlertEventRepository.find.mockResolvedValue([]);
        const cutoff = new Date('2026-08-14T10:00:00Z');
        result = await service.findPendingNotificationsBefore(cutoff, 500);
      });

      it('should filter on pending status and created_at', () => {
        expect(mockAlertEventRepository.find).toHaveBeenCalledWith({
          order: { created_at: 'ASC' },
          take: 500,
          where: {
            notification_status: AlertEventNotificationStatus.Pending,
            created_at: expect.any(Object),
          },
        });
      });

      it('should return the found events', () => {
        expect(result).toStrictEqual([]);
      });
    });
  });
});
