import { Logger } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { CounterMeasureNotifierService } from './counter-measure-notifier.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { AlertEventSeverity } from '../../../entities/alert-event.entity';
import { Vehicle } from '../../../entities/vehicle.entity';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TelegramService } from '../../telegram/telegram.service';
import { UserLanguageService } from '../../user/user-language.service';
import { CounterMeasure } from '../enums/counter-measure.enum';

describe('The CounterMeasureNotifierService class', () => {
  const fakeVin = 'XP7YGCER1TB919128';
  const counterMeasures = [CounterMeasure.Honk, CounterMeasure.AutoSentry];
  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockNotificationsService: MockProxy<NotificationsService>;
  let mockTelegramService: MockProxy<TelegramService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let mockNotificationQueueService: MockProxy<NotificationQueueService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let queuedNotices: Array<() => Promise<void>>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let service: CounterMeasureNotifierService;

  const notifyAndDeliver = async (userIds: string[]): Promise<void> => {
    service.notify(fakeVin, userIds, counterMeasures, 'correlation-1');
    await Promise.all(queuedNotices.map(notice => notice()));
  };

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    queuedNotices = [];
    mockNotificationQueueService = mock<NotificationQueueService>();
    mockNotificationQueueService.enqueue.mockImplementation((task: () => Promise<void>) => {
      queuedNotices.push(task);
      return true;
    });
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockKafkaLogContextService.runWithContext.mockImplementation(
      async (_context: unknown, callback: () => Promise<unknown>) => await callback()
    );
    mockUserLanguageService = mock<UserLanguageService>();
    mockUserLanguageService.getUserLanguage.mockResolvedValue('fr');
    mockNotificationsService = mock<NotificationsService>();
    mockNotificationsService.sendCounterMeasurePush.mockResolvedValue({ isDelivered: true });
    mockNotificationsService.shouldSendTelegram.mockResolvedValue(true);
    mockTelegramService = mock<TelegramService>();
    mockTelegramService.sendCounterMeasureNotice.mockResolvedValue({ isDelivered: true });
    mockVehicleRepository = mock<Repository<Vehicle>>();
    mockVehicleRepository.findOne.mockResolvedValue({ display_name: 'Ma Tesla' } as Vehicle);

    service = new CounterMeasureNotifierService(
      mockUserLanguageService,
      mockNotificationsService,
      mockTelegramService,
      mockNotificationQueueService,
      mockKafkaLogContextService,
      mockVehicleRepository
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('The notify() method', () => {
    describe('When the user accepts push and Telegram notifications', () => {
      beforeEach(async () => {
        await notifyAndDeliver(['user-1']);
      });

      it('should queue the notice behind the notification rate limit', () => {
        expect(mockNotificationQueueService.enqueue).toHaveBeenCalledWith(expect.any(Function), {
          correlationId: 'correlation-1',
          label: 'counter_measure_notice:user-1',
          vin: fakeVin,
        });
      });

      it('should send the notice in the log context of the break-in', () => {
        expect(mockKafkaLogContextService.runWithContext).toHaveBeenCalledWith(
          { correlationId: 'correlation-1', vin: fakeVin },
          expect.any(Function)
        );
      });

      it('should send a push in the user language with the vehicle name', () => {
        expect(mockNotificationsService.sendCounterMeasurePush).toHaveBeenCalledWith({
          counterMeasures,
          userId: 'user-1',
          userLanguage: 'fr',
          vehicleName: 'Ma Tesla',
          vin: fakeVin,
        });
      });

      it('should send a Telegram notice', () => {
        expect(mockTelegramService.sendCounterMeasureNotice).toHaveBeenCalledWith(
          'user-1',
          { display_name: 'Ma Tesla', vin: fakeVin },
          'fr',
          counterMeasures
        );
      });

      it('should check the Telegram preference with a regular priority', () => {
        expect(mockNotificationsService.shouldSendTelegram).toHaveBeenCalledWith('user-1', AlertEventSeverity.Warning);
      });

      it('should log the channels the notice went through', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(
          `[COUNTER_MEASURE_NOTICE] Notified user user-1 for VIN ${fakeVin} over push, telegram: honk, auto_sentry`
        );
      });
    });

    describe('When the user disabled Telegram notifications', () => {
      beforeEach(async () => {
        mockNotificationsService.shouldSendTelegram.mockResolvedValue(false);

        await notifyAndDeliver(['user-1']);
      });

      it('should not send a Telegram notice', () => {
        expect(mockTelegramService.sendCounterMeasureNotice).not.toHaveBeenCalled();
      });

      it('should still send the push', () => {
        expect(mockNotificationsService.sendCounterMeasurePush).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the vehicle has no display name', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue({ display_name: undefined } as Vehicle);

        await notifyAndDeliver(['user-1']);
      });

      it('should name the vehicle after its VIN in the push', () => {
        expect(mockNotificationsService.sendCounterMeasurePush).toHaveBeenCalledWith(
          expect.objectContaining({ vehicleName: expect.stringContaining('XP7') })
        );
      });
    });

    describe('When the user has no push device and no Telegram chat', () => {
      beforeEach(async () => {
        mockNotificationsService.sendCounterMeasurePush.mockResolvedValue({ isDelivered: false });
        mockNotificationsService.shouldSendTelegram.mockResolvedValue(false);

        await notifyAndDeliver(['user-1']);
      });

      it('should not claim the user was notified', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(
          `[COUNTER_MEASURE_NOTICE] No channel delivered the notice to user user-1 for VIN ${fakeVin}`
        );
      });
    });

    describe('When the push fails for one user', () => {
      let act: () => Promise<void>;

      beforeEach(() => {
        mockNotificationsService.sendCounterMeasurePush.mockRejectedValueOnce(new Error('Expo push rejected'));
        act = async () => await notifyAndDeliver(['user-1', 'user-2']);
      });

      it('should not fail the queued notice', async () => {
        await expect(act()).resolves.toBeUndefined();
      });

      it('should log the failed channel', async () => {
        await act();

        expect(loggerWarnSpy).toHaveBeenCalledWith(`[COUNTER_MEASURE_NOTICE] Failed to notify user user-1 for VIN ${fakeVin} over push`);
      });

      it('should still notify the other users', async () => {
        await act();

        expect(mockTelegramService.sendCounterMeasureNotice).toHaveBeenCalledWith('user-2', expect.anything(), 'fr', counterMeasures);
      });
    });
  });
});
