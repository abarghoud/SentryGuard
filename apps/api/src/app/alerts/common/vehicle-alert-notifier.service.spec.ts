import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { VehicleAlertNotifierService, AlertDispatchConfig } from './vehicle-alert-notifier.service';
import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { AlertsService } from '../alerts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { AlertNotifierRegistry } from './alert-notifier.registry';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

describe('The VehicleAlertNotifierService class', () => {
  let service: VehicleAlertNotifierService;

  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let mockAlertsService: MockProxy<AlertsService>;
  let mockNotificationsService: MockProxy<NotificationsService>;
  let mockNotificationQueueService: MockProxy<NotificationQueueService>;
  let mockAlertNotifierRegistry: MockProxy<AlertNotifierRegistry>;
  let enqueuedTasks: Array<() => Promise<void>>;

  beforeEach(async () => {
    mockUserLanguageService = mock<UserLanguageService>();
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();
    mockAlertsService = mock<AlertsService>();
    mockNotificationsService = mock<NotificationsService>();
    mockNotificationQueueService = mock<NotificationQueueService>();
    mockAlertNotifierRegistry = mock<AlertNotifierRegistry>();
    enqueuedTasks = [];

    mockNotificationsService.shouldSendTelegram.mockResolvedValue(true);
    mockNotificationsService.sendPushAlert.mockResolvedValue(true);
    mockAlertsService.record.mockImplementation(async (userId: string) => `alert-${userId}`);
    mockAlertsService.markNotificationSent.mockResolvedValue(undefined);
    mockAlertsService.markNotificationAttemptFailed.mockResolvedValue(false);
    mockKafkaLogContextService.runWithContext.mockImplementation(
      async (_context: { vin: string; correlationId: string }, callback: () => Promise<void>) => {
        await callback();
      }
    );
    mockNotificationQueueService.enqueue.mockImplementation((task: () => Promise<void>) => {
      enqueuedTasks.push(task);
      return true;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAlertNotifierService,
        { provide: UserLanguageService, useValue: mockUserLanguageService },
        { provide: KafkaLogContextService, useValue: mockKafkaLogContextService },
        { provide: AlertsService, useValue: mockAlertsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationQueueService, useValue: mockNotificationQueueService },
        { provide: AlertNotifierRegistry, useValue: mockAlertNotifierRegistry },
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

    it('should mark the notification as sent after a successful send', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');

      await service.dispatch(config);
      await executeEnqueuedTasks();

      expect(mockAlertsService.markNotificationSent).toHaveBeenCalledWith('alert-user-1');
      expect(mockAlertsService.markNotificationAttemptFailed).not.toHaveBeenCalled();
    });

    it('should mark the notification as sent when Telegram fails but push succeeds', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockAlertNotifierRegistry.notify.mockRejectedValue(new Error('Telegram Error'));

      await service.dispatch(config);
      await executeEnqueuedTasks();

      expect(mockAlertsService.markNotificationSent).toHaveBeenCalledWith('alert-user-1');
      expect(mockAlertsService.markNotificationAttemptFailed).not.toHaveBeenCalled();
    });

    it('should mark the notification as sent when push fails but Telegram succeeds', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));

      await service.dispatch(config);
      await executeEnqueuedTasks();

      expect(mockAlertsService.markNotificationSent).toHaveBeenCalledWith('alert-user-1');
      expect(mockAlertsService.markNotificationAttemptFailed).not.toHaveBeenCalled();
    });

    it('should mark the attempt as failed when all attempted notification channels fail', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);
      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      mockNotificationsService.sendPushAlert.mockRejectedValue(new Error('Push Error'));
      mockAlertNotifierRegistry.notify.mockRejectedValue(new Error('Telegram Error'));

      await service.dispatch(config);
      await expect(executeEnqueuedTasks()).rejects.toThrow('Push Error');

      expect(mockAlertsService.markNotificationAttemptFailed).toHaveBeenCalledWith('alert-user-1', 3);
      expect(mockAlertsService.markNotificationSent).not.toHaveBeenCalled();
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
          'My Tesla'
        );
        expect(mockAlertsService.record).toHaveBeenCalledWith(
          'user-2',
          'TEST_VIN_123',
          AlertEventType.BreakIn,
          AlertEventSeverity.Critical,
          'My Tesla'
        );
      });

      it('should trigger push notifications for each user', async () => {
        await service.dispatch(config);
        await executeEnqueuedTasks();

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(2);
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-1',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'en',
          'corr-123'
        );
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-2',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'fr',
          'corr-123'
        );
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
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-1',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'en',
          'corr-123'
        );
      });
    });
  });

  describe('The enqueueNotification() method', () => {
    it('should enqueue a job carrying the alert event id', () => {
      service.enqueueNotification({
        alertEventId: 'alert-1',
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
        })
      );
    });
  });
});
