import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { VehicleAlertNotifierService } from './vehicle-alert-notifier.service';
import { UserAlertNotificationService } from './user-alert-notification.service';
import { AlertChannelDeliveryService } from './alert-channel-delivery.service';
import { AlertChannelDeliveryError } from './alert-channel-delivery.error';
import { AlertDispatchConfig } from './alert-delivery.types';
import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { AlertsService } from '../alerts.service';
import { AlertNotificationStateService } from '../alert-notification-state.service';
import { NotificationAttemptOutcome } from '../enums/notification-attempt-outcome.enum';
import { NotificationAttemptResult } from './notification-attempt.types';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationLane } from '../../notifications/notification-lane.enum';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { AlertNotifierRegistry } from './alert-notifier.registry';
import { VehicleAlertSoundResolverService } from './vehicle-alert-sound-resolver.service';
import { AlertSound, DEFAULT_ALERT_SOUND } from '../enums/alert-sound.enum';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';

describe('The VehicleAlertNotifierService class', () => {
  let service: VehicleAlertNotifierService;

  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let mockAlertsService: MockProxy<AlertsService>;
  let mockAlertNotificationStateService: MockProxy<AlertNotificationStateService>;
  let mockNotificationsService: MockProxy<NotificationsService>;
  let mockNotificationQueueService: MockProxy<NotificationQueueService>;
  let mockAlertNotifierRegistry: MockProxy<AlertNotifierRegistry>;
  let mockVehicleAlertSoundResolverService: MockProxy<VehicleAlertSoundResolverService>;
  let enqueuedTasks: Array<() => Promise<void>>;

  beforeEach(async () => {
    mockUserLanguageService = mock<UserLanguageService>();
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();
    mockAlertsService = mock<AlertsService>();
    mockAlertNotificationStateService = mock<AlertNotificationStateService>();
    mockNotificationsService = mock<NotificationsService>();
    mockNotificationQueueService = mock<NotificationQueueService>();
    mockAlertNotifierRegistry = mock<AlertNotifierRegistry>();
    mockAlertNotifierRegistry.notify.mockResolvedValue(true);
    mockVehicleAlertSoundResolverService = mock<VehicleAlertSoundResolverService>();
    mockVehicleAlertSoundResolverService.resolve.mockResolvedValue(AlertSound.SentrySiren);
    enqueuedTasks = [];

    mockNotificationsService.shouldSendTelegram.mockResolvedValue(true);
    mockNotificationsService.sendPushAlert.mockResolvedValue(true);
    mockAlertsService.record.mockImplementation(async (userId: string) => `alert-${userId}`);
    mockAlertNotificationStateService.markNotificationSent.mockResolvedValue(undefined);
    mockAlertNotificationStateService.recordNotificationAttemptFailure.mockResolvedValue({
      attempts: 1,
      deliveredChannels: [],
      nextAttemptAt: new Date('2026-11-18T22:12:00.000Z'),
      outcome: NotificationAttemptOutcome.RetryScheduled,
    });
    mockKafkaLogContextService.runWithContext.mockImplementation(
      (_context, callback) => callback()
    );
    mockNotificationQueueService.enqueue.mockImplementation((task: () => Promise<void>) => {
      enqueuedTasks.push(task);
      return true;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAlertNotifierService,
        UserAlertNotificationService,
        AlertChannelDeliveryService,
        { provide: AlertNotificationStateService, useValue: mockAlertNotificationStateService },
        { provide: UserLanguageService, useValue: mockUserLanguageService },
        { provide: KafkaLogContextService, useValue: mockKafkaLogContextService },
        { provide: AlertsService, useValue: mockAlertsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationQueueService, useValue: mockNotificationQueueService },
        { provide: AlertNotifierRegistry, useValue: mockAlertNotifierRegistry },
        { provide: VehicleAlertSoundResolverService, useValue: mockVehicleAlertSoundResolverService },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
      ],
    }).compile();

    service = module.get<VehicleAlertNotifierService>(VehicleAlertNotifierService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const executeEnqueuedTasks = async (): Promise<void> => {
    await Promise.all(enqueuedTasks.map((task) => task()));
  };

  describe('The dispatch() method', () => {
    let telemetryMessage: TelemetryMessage;
    let config: AlertDispatchConfig;

    beforeEach(() => {
      telemetryMessage = new TelemetryMessage();
      telemetryMessage.vin = 'TEST_VIN_123';
      telemetryMessage.correlationId = 'corr-123';

      jest.spyOn(telemetryMessage, 'calculateEndToEndLatency').mockReturnValue(50);
      jest.spyOn(telemetryMessage, 'isProcessingDelayed').mockReturnValue(false);

      config = {
        telemetryMessage,
        alertName: 'TEST_ALERT',
        latencyLabel: 'TEST_LATENCY',
        severity: AlertEventSeverity.Critical,
        type: AlertEventType.BreakIn,
      };
    });

    it('should query vehicles by VIN', async () => {
      mockVehicleRepository.find.mockResolvedValue([]);

      await service.dispatch(config);

      expect(mockVehicleRepository.find).toHaveBeenCalledWith({
        where: { vin: 'TEST_VIN_123' },
        select: { userId: true, display_name: true },
      });
    });

    it('should not notify users when no vehicles are found', async () => {
      mockVehicleRepository.find.mockResolvedValue([]);

      await service.dispatch(config);

      expect(mockNotificationQueueService.enqueue).not.toHaveBeenCalled();
      expect(mockKafkaLogContextService.assignUserId).not.toHaveBeenCalled();
    });

    it('should extract unique users, assign log context, and enqueue notifications', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        { userId: 'user-2', display_name: 'My Tesla' } as Vehicle,
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);

      mockUserLanguageService.getUserLanguage.mockImplementation(async (userId: string) => {
        return userId === 'user-1' ? 'en' : 'fr';
      });

      await service.dispatch(config);
      await executeEnqueuedTasks();

      expect(mockKafkaLogContextService.assignUserId).toHaveBeenCalledWith('user-1,user-2');

      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledTimes(2);
      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('user-1');
      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('user-2');

      expect(mockAlertNotifierRegistry.notify).toHaveBeenCalledTimes(2);
      expect(mockAlertNotifierRegistry.notify).toHaveBeenCalledWith(
        expect.objectContaining({ alertEventId: 'alert-user-1', userId: 'user-1', vin: 'TEST_VIN_123' }),
        'en'
      );
      expect(mockAlertNotifierRegistry.notify).toHaveBeenCalledWith(
        expect.objectContaining({ alertEventId: 'alert-user-2', userId: 'user-2' }),
        'fr'
      );
    });

    it('should mark the notification as sent with the channels that delivered after a successful send', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');

      await service.dispatch(config);
      await executeEnqueuedTasks();

      expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalledWith('alert-user-1', [
        NotificationChannel.Expo,
        NotificationChannel.Telegram,
      ]);
      expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).not.toHaveBeenCalled();
    });

    describe('When push succeeds but Telegram fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(async () => {
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockAlertNotifierRegistry.notify.mockRejectedValue(Object.assign(new Error('request failed'), { code: 'ETIMEDOUT' }));

        await service.dispatch(config);
        await expect(executeEnqueuedTasks()).rejects.toThrow(AlertChannelDeliveryError);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should not mark the alert as sent, so the Telegram copy is retried', () => {
        expect(mockAlertNotificationStateService.markNotificationSent).not.toHaveBeenCalled();
      });

      it('should count a failed attempt that remembers Expo as delivered', () => {
        expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith(
          'alert-user-1',
          [NotificationChannel.Expo],
          { baseDelayMs: 60_000, maxAttempts: 12, maxDelayMs: 1_800_000 }
        );
      });

      it('should log which channel failed and which one delivered', () => {
        expect(errorSpy).toHaveBeenCalledWith(
          '[ALERT_CHANNEL_FAILED][corr-123] user=user-1 alert=alert-user-1 failed=telegram ' +
          'channels={expo:ok, telegram:ETIMEDOUT}'
        );
      });
    });

    describe('When both channels deliver but the database fails to record it', () => {
      beforeEach(async () => {
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockAlertNotificationStateService.markNotificationSent.mockRejectedValueOnce(new Error('connection terminated'));

        await service.dispatch(config);
        await expect(executeEnqueuedTasks()).rejects.toThrow(AlertChannelDeliveryError);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should remember both channels as delivered so the retry sends nothing again', () => {
        expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith(
          'alert-user-1',
          [NotificationChannel.Expo, NotificationChannel.Telegram],
          expect.any(Object)
        );
      });
    });

    describe('When push fails but Telegram succeeds', () => {
      beforeEach(async () => {
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));

        await service.dispatch(config);
        await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should count a failed attempt that remembers Telegram as delivered', () => {
        expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith(
          'alert-user-1',
          [NotificationChannel.Telegram],
          expect.any(Object)
        );
        expect(mockAlertNotificationStateService.markNotificationSent).not.toHaveBeenCalled();
      });
    });

    describe('When the sweep retries an alert whose push was already delivered', () => {
      let logSpy: jest.SpyInstance;

      beforeEach(async () => {
        logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');

        service.enqueueNotification({
          alertEventId: 'alert-1',
          correlationId: 'sweep-alert-1',
          deliveredChannels: [NotificationChannel.Expo],
          detectedAt: new Date(Date.now() - 180_000),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: 'user-1',
          vin: 'TEST_VIN_123',
        }, NotificationLane.Retry);
        await executeEnqueuedTasks();
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should not push the alert again', () => {
        expect(mockNotificationsService.sendPushAlert).not.toHaveBeenCalled();
      });

      it('should resend only the Telegram copy', () => {
        expect(mockAlertNotifierRegistry.notify).toHaveBeenCalledTimes(1);
      });

      it('should mark the alert as sent once Telegram delivers', () => {
        expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalledWith('alert-1', [NotificationChannel.Telegram]);
      });

      it('should log the earlier delivery explicitly', () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('channels={expo:ok(earlier), telegram:ok}'));
      });
    });

    describe('When the sweep retries an alert whose Telegram copy was already delivered and push fails again', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should not resend Telegram and only count the push failure', async () => {
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));

        service.enqueueNotification({
          alertEventId: 'alert-1',
          deliveredChannels: [NotificationChannel.Telegram],
          detectedAt: new Date(Date.now() - 180_000),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: 'user-1',
          vin: 'TEST_VIN_123',
        }, NotificationLane.Retry);
        await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo');

        expect(mockAlertNotifierRegistry.notify).not.toHaveBeenCalled();
        expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith('alert-1', [], expect.any(Object));
      });
    });

    describe('When recording the failed attempt', () => {
      let errorSpy: jest.SpyInstance;
      let warnSpy: jest.SpyInstance;

      const runFailingNotification = async (result: NotificationAttemptResult): Promise<void> => {
        mockAlertNotificationStateService.recordNotificationAttemptFailure.mockResolvedValue(result);
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockAlertNotifierRegistry.notify.mockRejectedValue(new Error('Telegram Error'));

        await service.dispatch(config);
        await expect(executeEnqueuedTasks()).rejects.toThrow(AlertChannelDeliveryError);
      };

      beforeEach(() => {
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should log the scheduled retry with its time and the delivered channels', async () => {
        await runFailingNotification({
          attempts: 2,
          deliveredChannels: [NotificationChannel.Expo],
          nextAttemptAt: new Date('2026-11-18T22:12:00.000Z'),
          outcome: NotificationAttemptOutcome.RetryScheduled,
        });

        expect(warnSpy).toHaveBeenCalledWith(
          '[NOTIFICATION_RETRY_SCHEDULED] Alert alert-user-1 attempt 2/12 failed, next attempt at 2026-11-18T22:12:00.000Z ' +
          '(delivered=expo)'
        );
      });

      it('should log NOTIFICATION_FAILED when the remaining channel is given up', async () => {
        await runFailingNotification({
          attempts: 6,
          deliveredChannels: [NotificationChannel.Expo],
          nextAttemptAt: null,
          outcome: NotificationAttemptOutcome.GaveUpPartiallyDelivered,
        });

        expect(errorSpy).toHaveBeenCalledWith(
          '[NOTIFICATION_FAILED] Alert alert-user-1 gave up on the remaining channel(s) after 6 attempts (delivered=expo)'
        );
      });

      it('should log NOTIFICATION_FAILED when no channel ever delivered', async () => {
        await runFailingNotification({
          attempts: 6,
          deliveredChannels: [],
          nextAttemptAt: null,
          outcome: NotificationAttemptOutcome.PermanentlyFailed,
        });

        expect(errorSpy).toHaveBeenCalledWith(
          '[NOTIFICATION_FAILED] Alert alert-user-1 permanently failed after 6 attempts (delivered=none)'
        );
      });
    });

    it('should count a failed attempt with no delivered channel when all attempted notification channels fail', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));
      mockAlertNotifierRegistry.notify.mockRejectedValue(new Error('Telegram Error'));

      await service.dispatch(config);
      await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo,telegram');

      expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith('alert-user-1', [], expect.any(Object));
      expect(mockAlertNotificationStateService.markNotificationSent).not.toHaveBeenCalled();
    });

    it('should not count Telegram as sent when the notifier reports a failed delivery', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));
      mockAlertNotifierRegistry.notify.mockResolvedValue(false);

      await service.dispatch(config);
      await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo');

      expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith('alert-user-1', [], expect.any(Object));
      expect(mockAlertNotificationStateService.markNotificationSent).not.toHaveBeenCalled();
    });

    describe('When no channel delivers the alert', () => {
      let errorSpy: jest.SpyInstance;
      let warnSpy: jest.SpyInstance;
      let logSpy: jest.SpyInstance;
      const expoUnavailableError = (): Error => Object.assign(new Error('Service Unavailable'), { status: 503 });

      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockNotificationsService.isMuted.mockResolvedValue(false);
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      const expectNotNotified = (): void => {
        expect(mockAlertNotificationStateService.markNotificationSent).not.toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Notified user'));
      };

      describe('When Expo answers 503 and the user has no linked Telegram chat', () => {
        beforeEach(async () => {
          mockNotificationsService.sendPushAlert.mockRejectedValue(expoUnavailableError());
          mockAlertNotifierRegistry.notify.mockResolvedValue(false);

          await service.dispatch(config);
          await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo');
        });

        it('should log ALERT_DELIVERY_FAILED with the reason of each channel', () => {
          expect(errorSpy).toHaveBeenCalledWith(
            '[ALERT_DELIVERY_FAILED][corr-123] user=user-1 alert=alert-user-1 failed=expo channels={expo:503, telegram:none}'
          );
        });

        it('should not mark the alert as sent nor log it as notified', () => {
          expectNotNotified();
        });

        it('should count a failed attempt so the sweep retries it, bounded by the max attempts', () => {
          expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).toHaveBeenCalledWith('alert-user-1', [], {
            baseDelayMs: 60_000,
            maxAttempts: 12,
            maxDelayMs: 1_800_000,
          });
        });
      });

      describe('When both channels fail', () => {
        it('should log the reason of both channels', async () => {
          mockNotificationsService.sendPushAlert.mockRejectedValue(expoUnavailableError());
          mockAlertNotifierRegistry.notify.mockRejectedValue(Object.assign(new Error('request failed, reason: '), { code: 'ETIMEDOUT' }));

          await service.dispatch(config);
          await expect(executeEnqueuedTasks()).rejects.toThrow('Alert delivery failed on expo,telegram');

          expect(errorSpy).toHaveBeenCalledWith(
            '[ALERT_DELIVERY_FAILED][corr-123] user=user-1 alert=alert-user-1 failed=expo,telegram channels={expo:503, telegram:ETIMEDOUT}'
          );
          expectNotNotified();
        });
      });

      describe('When the user has no reachable channel at all', () => {
        beforeEach(async () => {
          mockNotificationsService.sendPushAlert.mockResolvedValue(false);
          mockAlertNotifierRegistry.notify.mockResolvedValue(false);

          await service.dispatch(config);
          await executeEnqueuedTasks();
        });

        it('should log ALERT_NO_CHANNEL as a warning', () => {
          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[ALERT_NO_CHANNEL][corr-123] user=user-1 type=break_in VIN TEST_VIN_123 channels={expo:none, telegram:none}')
          );
        });

        it('should take the alert out of the sweep instead of retrying it forever', () => {
          expect(mockAlertNotificationStateService.markNotificationUndeliverable).toHaveBeenCalledWith('alert-user-1');
          expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).not.toHaveBeenCalled();
        });

        it('should not log ALERT_DELIVERY_FAILED', () => {
          expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[ALERT_DELIVERY_FAILED]'));
        });

        it('should not mark the alert as sent nor log it as notified', () => {
          expectNotNotified();
        });
      });

      describe('When Telegram is disabled and the user has no push device', () => {
        it('should treat the alert as undeliverable', async () => {
          mockNotificationsService.shouldSendTelegram.mockResolvedValue(false);
          mockNotificationsService.sendPushAlert.mockResolvedValue(false);

          await service.dispatch(config);
          await executeEnqueuedTasks();

          expect(mockAlertNotifierRegistry.notify).not.toHaveBeenCalled();
          expect(mockAlertNotificationStateService.markNotificationUndeliverable).toHaveBeenCalledWith('alert-user-1');
          expectNotNotified();
        });
      });

      describe('When nothing was sent because the user muted alerts after the alert was recorded', () => {
        beforeEach(async () => {
          mockNotificationsService.isMuted.mockResolvedValue(true);
          mockNotificationsService.sendPushAlert.mockResolvedValue(false);
          mockAlertNotifierRegistry.notify.mockResolvedValue(false);

          await service.dispatch(config);
          await executeEnqueuedTasks();
        });

        it('should handle it as a muted alert', () => {
          expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalledWith('alert-user-1');
          expect(mockAlertNotificationStateService.markNotificationUndeliverable).not.toHaveBeenCalled();
        });

        it('should not log ALERT_NO_CHANNEL', () => {
          expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('[ALERT_NO_CHANNEL]'));
        });
      });
    });

    it('should record alerts with muted true when a Sentry alert is dispatched for a muted user', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockNotificationsService.isMuted.mockResolvedValue(true);
      const sentryConfig: AlertDispatchConfig = {
        ...config,
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
      };

      await service.dispatch(sentryConfig);

      expect(mockAlertsService.record).toHaveBeenCalledWith(
        'user-1',
        'TEST_VIN_123',
        AlertEventType.Sentry,
        AlertEventSeverity.Warning,
        'My Tesla',
        true
      );
    });

    it('should record alerts with muted false when a BreakIn alert is dispatched for a muted user', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockNotificationsService.isMuted.mockResolvedValue(true);

      await service.dispatch(config);

      expect(mockAlertsService.record).toHaveBeenCalledWith(
        'user-1',
        'TEST_VIN_123',
        AlertEventType.BreakIn,
        AlertEventSeverity.Critical,
        'My Tesla',
        false
      );
    });

    it('should record alerts with muted false when a Sentry alert is dispatched for an unmuted user', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockNotificationsService.isMuted.mockResolvedValue(false);
      const sentryConfig: AlertDispatchConfig = {
        ...config,
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
      };

      await service.dispatch(sentryConfig);

      expect(mockAlertsService.record).toHaveBeenCalledWith(
        'user-1',
        'TEST_VIN_123',
        AlertEventType.Sentry,
        AlertEventSeverity.Warning,
        'My Tesla',
        false
      );
    });

    it('should bypass notification delivery and mark as sent when the alert is muted', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockNotificationsService.isMuted.mockResolvedValue(true);
      const sentryConfig: AlertDispatchConfig = {
        ...config,
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
      };

      await service.dispatch(sentryConfig);
      await executeEnqueuedTasks();

      expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalledWith('alert-user-1');
      expect(mockNotificationsService.sendPushAlert).not.toHaveBeenCalled();
      expect(mockAlertNotifierRegistry.notify).not.toHaveBeenCalled();
      expect(mockUserLanguageService.getUserLanguage).not.toHaveBeenCalled();
    });

    it('should surface database errors downstream', async () => {
      mockVehicleRepository.find.mockRejectedValue(new Error('DB Error'));

      await expect(service.dispatch(config)).rejects.toThrow('DB Error');
      expect(mockNotificationQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should correctly evaluate end-to-end latency', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');

      await service.dispatch(config);

      expect(telemetryMessage.calculateEndToEndLatency).toHaveBeenCalled();
      expect(telemetryMessage.isProcessingDelayed).toHaveBeenCalled();
    });

    describe('When executing with multiple users', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
          { userId: 'user-2', display_name: 'My Tesla' } as Vehicle,
        ]);
        mockUserLanguageService.getUserLanguage.mockImplementation(async (userId: string) => {
          return userId === 'user-1' ? 'en' : 'fr';
        });
      });

      it('should record the alert for each user in the alerts service', async () => {
        await service.dispatch(config);

        expect(mockAlertsService.record).toHaveBeenCalledTimes(2);
        expect(mockAlertsService.record).toHaveBeenCalledWith(
          'user-1',
          'TEST_VIN_123',
          AlertEventType.BreakIn,
          AlertEventSeverity.Critical,
          'My Tesla',
          false
        );
        expect(mockAlertsService.record).toHaveBeenCalledWith(
          'user-2',
          'TEST_VIN_123',
          AlertEventType.BreakIn,
          AlertEventSeverity.Critical,
          'My Tesla',
          false
        );
      });

      it('should trigger push notifications for each user', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(2);
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith({
          alertSound: AlertSound.SentrySiren,
          correlationId: 'corr-123',
          detectedAt: expect.any(Date),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: 'user-1',
          userLanguage: 'en',
          vehicleName: 'My Tesla',
          vin: 'TEST_VIN_123',
        });
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith({
          alertSound: AlertSound.SentrySiren,
          correlationId: 'corr-123',
          detectedAt: expect.any(Date),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: 'user-2',
          userLanguage: 'fr',
          vehicleName: 'My Tesla',
          vin: 'TEST_VIN_123',
        });
      });
    });

    describe('When the alert is recorded', () => {
      let dispatchStartedAt: number;
      let dispatchEndedAt: number;

      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        dispatchStartedAt = Date.now();
        await service.dispatch(config);
        dispatchEndedAt = Date.now();
        await executeEnqueuedTasks();
      });

      it('should date the push alert with the time the alert was recorded', () => {
        const [{ detectedAt }] = mockNotificationsService.sendPushAlert.mock.calls[0];
        const detectedAtMs = (detectedAt as Date).getTime();

        expect(detectedAtMs >= dispatchStartedAt && detectedAtMs <= dispatchEndedAt).toBe(true);
      });
    });

    describe('When the alert was intentionally delayed by the reaction delay', () => {
      let loggerLogSpy: jest.SpyInstance;

      beforeEach(async () => {
        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(telemetryMessage, 'calculateEndToEndLatency').mockReturnValue(21_500);
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: 'My Tesla' } as Vehicle]);

        await service.dispatch({ ...config, reactionDelayMs: 20_000 });
      });

      afterEach(() => {
        loggerLogSpy.mockRestore();
      });

      it('should log the latency without the reaction delay', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST_LATENCY] CorrelationId: corr-123 - Total: 1500ms'));
      });
    });

    describe('When telegram notifications are disabled in preferences', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockNotificationsService.shouldSendTelegram.mockResolvedValue(false);
      });

      it('should not notify via Telegram but still send push alert', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockAlertNotifierRegistry.notify).not.toHaveBeenCalled();
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith({
          alertSound: AlertSound.SentrySiren,
          correlationId: 'corr-123',
          detectedAt: expect.any(Date),
          severity: AlertEventSeverity.Critical,
          type: AlertEventType.BreakIn,
          userId: 'user-1',
          userLanguage: 'en',
          vehicleName: 'My Tesla',
          vin: 'TEST_VIN_123',
        });
      });
    });

    describe('When resolving the alert sound fails', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockVehicleAlertSoundResolverService.resolve.mockRejectedValue(new Error('DB connection lost'));
      });

      it('should still send the push alert', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalled();
      });

      it('should fall back to the default alert sound', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          expect.objectContaining({ alertSound: DEFAULT_ALERT_SOUND })
        );
      });

      it('should still notify via Telegram', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockAlertNotifierRegistry.notify).toHaveBeenCalled();
      });

      it('should mark the notification as sent', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalled();
      });
    });

    describe('When the vehicle uses a dedicated sound for the alert type', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockVehicleAlertSoundResolverService.resolve.mockResolvedValue(AlertSound.KlaxonAlarm);
      });

      it('should resolve the sound for the alerted vehicle and type', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockVehicleAlertSoundResolverService.resolve).toHaveBeenCalledWith(
          'user-1',
          config.telemetryMessage.vin,
          AlertEventType.BreakIn
        );
      });

      it('should send the resolved sound to the push alert', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          expect.objectContaining({ alertSound: AlertSound.KlaxonAlarm })
        );
      });
    });

    describe('When the vehicle has no display name', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: undefined } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      });

      it('should fall back to the VIN when sending the push alert', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          expect.objectContaining({ vehicleName: 'TEST_VIN_123' })
        );
      });
    });

    describe('When the vehicle has an empty display name', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([{ userId: 'user-1', display_name: '' } as Vehicle]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      });

      it('should fall back to the VIN when sending the push alert', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          expect.objectContaining({ vehicleName: 'TEST_VIN_123' })
        );
      });
    });
  });

  describe('The enqueueNotification() method', () => {
    it('should enqueue a job carrying the alert event id', () => {
      service.enqueueNotification({
        alertEventId: 'alert-1',
        detectedAt: new Date(),
        userId: 'user-1',
        vin: 'VIN-1',
        vehicleDisplayName: 'My Tesla',
        type: AlertEventType.Sentry,
        severity: AlertEventSeverity.Warning,
        correlationId: 'corr-1',
      });

      expect(mockNotificationQueueService.enqueue).toHaveBeenCalledTimes(1);
      expect(mockNotificationQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          label: 'sentry:user-1',
          vin: 'VIN-1',
          correlationId: 'corr-1',
          alertEventId: 'alert-1',
          lane: NotificationLane.Immediate,
        })
      );
    });

    describe('When the push is delivered while Telegram is still pending', () => {
      const freshPayload = (): Parameters<VehicleAlertNotifierService['enqueueNotification']>[0] => ({
        alertEventId: 'alert-1',
        detectedAt: new Date(),
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
        userId: 'user-1',
        vin: 'VIN-1',
      });

      it('should record the push delivery at once, so a restart does not send it again', async () => {
        mockAlertNotifierRegistry.notify.mockReturnValue(new Promise<boolean>(() => undefined));
        service.enqueueNotification(freshPayload());

        void executeEnqueuedTasks();
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockAlertNotificationStateService.recordChannelDelivered).toHaveBeenCalledWith('alert-1', NotificationChannel.Expo);
      });

      it('should not record a channel that failed', async () => {
        mockAlertNotifierRegistry.notify.mockRejectedValue(new Error('Telegram Error'));
        service.enqueueNotification(freshPayload());

        await executeEnqueuedTasks().catch(() => undefined);

        expect(mockAlertNotificationStateService.recordChannelDelivered).not.toHaveBeenCalledWith('alert-1', NotificationChannel.Telegram);
      });

      it('should still close the alert when the early record fails', async () => {
        mockAlertNotificationStateService.recordChannelDelivered.mockRejectedValue(new Error('connection terminated'));
        service.enqueueNotification(freshPayload());

        await executeEnqueuedTasks();

        expect(mockAlertNotificationStateService.markNotificationSent).toHaveBeenCalledWith('alert-1', [NotificationChannel.Expo, NotificationChannel.Telegram]);
      });
    });

    describe('When a fresh alert waited over a minute for its first attempt', () => {
      const stalePayload = (): Parameters<VehicleAlertNotifierService['enqueueNotification']>[0] => ({
        alertEventId: 'alert-1',
        detectedAt: new Date(Date.now() - 61_000),
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
        userId: 'user-1',
        vin: 'VIN-1',
      });

      describe('When this server gets the lease', () => {
        beforeEach(async () => {
          mockAlertNotificationStateService.leaseNotification.mockResolvedValue({ isLeased: true });
          service.enqueueNotification(stalePayload());
          await executeEnqueuedTasks();
        });

        it('should lease the alert as a first attempt before sending it', () => {
          expect(mockAlertNotificationStateService.leaseNotification).toHaveBeenCalledWith('alert-1', 0, 300_000);
        });

        it('should send the alert', () => {
          expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(1);
        });
      });

      describe('When a retry on another server already took the alert', () => {
        beforeEach(async () => {
          mockAlertNotificationStateService.leaseNotification.mockResolvedValue({ isLeased: false });
          service.enqueueNotification(stalePayload());
          await executeEnqueuedTasks();
        });

        it('should not send the alert a second time', () => {
          expect(mockNotificationsService.sendPushAlert).not.toHaveBeenCalled();
          expect(mockAlertNotifierRegistry.notify).not.toHaveBeenCalled();
        });

        it('should not count a failed attempt', () => {
          expect(mockAlertNotificationStateService.recordNotificationAttemptFailure).not.toHaveBeenCalled();
        });
      });

      describe('When the alert comes from the sweeper, which leased it already', () => {
        it('should send it without leasing it again', async () => {
          service.enqueueNotification(stalePayload(), NotificationLane.Retry);
          await executeEnqueuedTasks();

          expect(mockAlertNotificationStateService.leaseNotification).not.toHaveBeenCalled();
          expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('When a fresh alert gets its first attempt right away', () => {
      it('should send it without leasing it', async () => {
        service.enqueueNotification({
          alertEventId: 'alert-1',
          detectedAt: new Date(),
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: 'user-1',
          vin: 'VIN-1',
        });
        await executeEnqueuedTasks();

        expect(mockAlertNotificationStateService.leaseNotification).not.toHaveBeenCalled();
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(1);
      });
    });

    it('should use the lane it is given', () => {
      service.enqueueNotification(
        {
          alertEventId: 'alert-1',
          detectedAt: new Date(),
          severity: AlertEventSeverity.Warning,
          type: AlertEventType.Sentry,
          userId: 'user-1',
          vin: 'VIN-1',
        },
        NotificationLane.Retry
      );

      expect(mockNotificationQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ lane: NotificationLane.Retry })
      );
    });
  });
});
