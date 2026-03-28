import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { VehicleAlertNotifierService, AlertDispatchConfig } from './vehicle-alert-notifier.service';
import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

describe('The VehicleAlertNotifierService class', () => {
  let service: VehicleAlertNotifierService;
  
  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;

  beforeEach(async () => {
    mockUserLanguageService = mock<UserLanguageService>();
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAlertNotifierService,
        { provide: UserLanguageService, useValue: mockUserLanguageService },
        { provide: KafkaLogContextService, useValue: mockKafkaLogContextService },
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
        telegramNotifier: mockTelegramNotifier,
      };
    });

    it('should query vehicles by VIN', async () => {
      mockVehicleRepository.find.mockResolvedValue([]);

      await service.dispatch(config);

      expect(mockVehicleRepository.find).toHaveBeenCalledWith({
        where: { vin: 'TEST_VIN_123' },
        select: ['userId', 'display_name'],
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
  });
});
