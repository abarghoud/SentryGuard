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
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

describe('The VehicleAlertNotifierService class', () => {
  let service: VehicleAlertNotifierService;
  
  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let mockAlertsService: MockProxy<AlertsService>;
  let mockNotificationsService: MockProxy<NotificationsService>;

  beforeEach(async () => {
    mockUserLanguageService = mock<UserLanguageService>();
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();
    mockAlertsService = mock<AlertsService>();
    mockNotificationsService = mock<NotificationsService>();
    mockNotificationsService.shouldSendTelegram.mockResolvedValue(true);
    mockNotificationsService.sendPushAlert.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAlertNotifierService,
        { provide: UserLanguageService, useValue: mockUserLanguageService },
        { provide: KafkaLogContextService, useValue: mockKafkaLogContextService },
        { provide: AlertsService, useValue: mockAlertsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
      ],
    }).compile();

    service = module.get<VehicleAlertNotifierService>(VehicleAlertNotifierService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The dispatch() method', () => {
    let telemetryMessage: TelemetryMessage;
    let mockTelegramNotifier: jest.Mock;
    let config: AlertDispatchConfig;

    beforeEach(() => {
      telemetryMessage = new TelemetryMessage();
      telemetryMessage.vin = 'TEST_VIN_123';
      telemetryMessage.correlationId = 'corr-123';

      jest.spyOn(telemetryMessage, 'calculateEndToEndLatency').mockReturnValue(50);
      jest.spyOn(telemetryMessage, 'isProcessingDelayed').mockReturnValue(false);

      mockTelegramNotifier = jest.fn().mockResolvedValue(undefined);

      config = {
        telemetryMessage,
        alertName: 'TEST_ALERT',
        latencyLabel: 'TEST_LATENCY',
        severity: AlertEventSeverity.Critical,
        telegramNotifier: mockTelegramNotifier,
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

      expect(mockTelegramNotifier).not.toHaveBeenCalled();
      expect(mockKafkaLogContextService.assignUserId).not.toHaveBeenCalled();
    });

    it('should extract unique users, assign log context, and trigger notifications', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        { userId: 'user-2', display_name: 'My Tesla' } as Vehicle,
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
      ]);

      mockUserLanguageService.getUserLanguage.mockImplementation(async (userId) => {
        return userId === 'user-1' ? 'en' : 'fr';
      });

      await service.dispatch(config);

      expect(mockKafkaLogContextService.assignUserId).toHaveBeenCalledWith('user-1,user-2');

      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledTimes(2);
      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('user-1');
      expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('user-2');

      expect(mockTelegramNotifier).toHaveBeenCalledTimes(2);
      expect(mockTelegramNotifier).toHaveBeenCalledWith(
        'user-1',
        { vin: 'TEST_VIN_123', display_name: 'My Tesla' },
        'en'
      );
      expect(mockTelegramNotifier).toHaveBeenCalledWith(
        'user-2',
        { vin: 'TEST_VIN_123', display_name: 'My Tesla' },
        'fr'
      );
    });

    it('should continue executing gracefully if one user notification fails', async () => {
      mockVehicleRepository.find.mockResolvedValue([
        { userId: 'user-1', display_name: 'My Tesla' } as Vehicle,
        { userId: 'user-2', display_name: 'My Tesla' } as Vehicle,
      ]);

      mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
      
      mockTelegramNotifier
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(undefined);

      await service.dispatch(config);

      expect(mockTelegramNotifier).toHaveBeenCalledTimes(2);
    });

    it('should surface database errors downstream', async () => {
      mockVehicleRepository.find.mockRejectedValue(new Error('DB Error'));

      await expect(service.dispatch(config)).rejects.toThrow('DB Error');
      expect(mockTelegramNotifier).not.toHaveBeenCalled();
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
        mockUserLanguageService.getUserLanguage.mockImplementation(async (userId) => {
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

        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledTimes(2);
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-1',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'en'
        );
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-2',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'fr'
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

        expect(mockTelegramNotifier).not.toHaveBeenCalled();
        expect(mockNotificationsService.sendPushAlert).toHaveBeenCalledWith(
          'user-1',
          AlertEventSeverity.Critical,
          AlertEventType.BreakIn,
          'en'
        );
      });
    });
  });
});
