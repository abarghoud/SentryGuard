import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';
import { NotificationPreferencesRepository } from './notification-preferences.repository';

describe('The NotificationPreferencesRepository class', () => {
  const fakeUserId = 'user-123';
  const fakePreferences = { telegram_enabled: true, userId: fakeUserId } as NotificationPreferences;
  const queryBuilder = { execute: jest.fn(), insert: jest.fn(), orIgnore: jest.fn(), values: jest.fn() };
  let preferencesRepository: MockProxy<Repository<NotificationPreferences>>;
  let repository: NotificationPreferencesRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(queryBuilder).forEach((step) => step.mockReturnValue(queryBuilder));
    preferencesRepository = mock<Repository<NotificationPreferences>>();
    preferencesRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);
    repository = new NotificationPreferencesRepository(preferencesRepository);
  });

  describe('The findOrCreate() method', () => {
    describe('When the user already has preferences', () => {
      let result: NotificationPreferences;

      beforeEach(async () => {
        preferencesRepository.findOne.mockResolvedValue(fakePreferences);
        result = await repository.findOrCreate(fakeUserId);
      });

      it('should return them', () => {
        expect(result).toBe(fakePreferences);
      });

      it('should not insert anything', () => {
        expect(preferencesRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('When the user has no preferences yet', () => {
      let result: NotificationPreferences;

      beforeEach(async () => {
        preferencesRepository.findOne.mockResolvedValue(null);
        preferencesRepository.findOneOrFail.mockResolvedValue(fakePreferences);
        result = await repository.findOrCreate(fakeUserId);
      });

      it('should insert them, ignoring a row another notification created at the same time', () => {
        expect(queryBuilder.values).toHaveBeenCalledWith({ userId: fakeUserId });
        expect(queryBuilder.orIgnore).toHaveBeenCalledTimes(1);
      });

      it('should return the stored preferences', () => {
        expect(result).toBe(fakePreferences);
      });
    });
  });
});
