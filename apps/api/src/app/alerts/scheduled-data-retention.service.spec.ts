import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { ScheduledDataRetentionService } from './scheduled-data-retention.service';
import { AlertEvent } from '../../entities/alert-event.entity';

describe('The ScheduledDataRetentionService class', () => {
  let mockAlertEventRepository: MockProxy<Repository<AlertEvent>>;

  const buildService = (): ScheduledDataRetentionService => new ScheduledDataRetentionService(mockAlertEventRepository);

  const lastDeleteCutoffInDays = (): number => {
    const criteria = mockAlertEventRepository.delete.mock.calls[0][0] as unknown as { created_at: { value: Date } };
    return Math.round((Date.now() - criteria.created_at.value.getTime()) / (24 * 60 * 60 * 1000));
  };

  beforeEach(() => {
    mockAlertEventRepository = mock<Repository<AlertEvent>>();
    mockAlertEventRepository.delete.mockResolvedValue({ affected: 3, raw: [] });
    delete process.env.ALERT_RETENTION_DAYS;
  });

  afterEach(() => {
    delete process.env.ALERT_RETENTION_DAYS;
  });

  describe('The purgeExpiredAlertEvents() method', () => {
    describe('When using the default retention period', () => {
      beforeEach(async () => {
        await buildService().purgeExpiredAlertEvents();
      });

      it('should delete alert events once', () => {
        expect(mockAlertEventRepository.delete).toHaveBeenCalledTimes(1);
      });

      it('should target events older than 365 days', () => {
        expect(lastDeleteCutoffInDays()).toBe(365);
      });
    });

    describe('When a retention period is configured', () => {
      beforeEach(async () => {
        process.env.ALERT_RETENTION_DAYS = '30';
        await buildService().purgeExpiredAlertEvents();
      });

      it('should target events older than the configured period', () => {
        expect(lastDeleteCutoffInDays()).toBe(30);
      });
    });

    describe('When the configured retention period is invalid', () => {
      beforeEach(async () => {
        process.env.ALERT_RETENTION_DAYS = 'not-a-number';
        await buildService().purgeExpiredAlertEvents();
      });

      it('should fall back to the default retention period', () => {
        expect(lastDeleteCutoffInDays()).toBe(365);
      });
    });
  });
});
