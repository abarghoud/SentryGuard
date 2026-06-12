import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AlertEvent } from '../../entities/alert-event.entity';
import { AlertsService } from './alerts.service';

describe('The AlertsService class', () => {
  const fakeUserId = 'user-123';
  const fakeAlertId = '4c1f1a52-7a44-4d2b-9b3f-9a9f0b7f6e21';

  let service: AlertsService;
  const mockAlertEventRepository = {
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
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
});
