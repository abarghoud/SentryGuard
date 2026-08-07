import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsAutoSentryService } from './alerts-auto-sentry.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The AlertsAutoSentryService class', () => {
  let service: AlertsAutoSentryService;

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    vin: '5YJ3E1EA123456789',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: true,
    break_in_offensive_response: OffensiveResponse.DISABLED,
    break_in_auto_sentry_mode_enabled: false,
    display_name: 'Model 3',
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsAutoSentryService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TeslaVehicleCommandService, useValue: mockTeslaVehicleCommandService },
      ],
    }).compile();

    service = module.get<AlertsAutoSentryService>(AlertsAutoSentryService);
    jest.clearAllMocks();
  });

  describe('The handleBreakInAutoSentry() method', () => {
    let createdAt: string;

    beforeEach(() => {
      createdAt = new Date().toISOString();
    });

    describe('When no vehicle is found for any userId', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry('UNKNOWN_VIN', ['user-1'], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });
    });

    describe('When auto sentry is disabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_auto_sentry_mode_enabled: false,
        });
      });

      it('should not trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });
    });

    describe('When auto sentry is enabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_auto_sentry_mode_enabled: true,
        });
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });
      });

      it('should trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(
          '5YJ3E1EA123456789',
          'user-1',
          true,
        );
      });
    });

    describe('When first userId is disabled and second userId is enabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_auto_sentry_mode_enabled: false,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_auto_sentry_mode_enabled: true,
          });
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });
      });

      it('should trigger set_sentry_mode for the second userId', async () => {
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1', 'user-2'], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(
          '5YJ3E1EA123456789',
          'user-2',
          true,
        );
      });
    });

    describe('When first userId fails and second userId succeeds', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_auto_sentry_mode_enabled: true,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_auto_sentry_mode_enabled: true,
          });
        mockTeslaVehicleCommandService.setSentryMode
          .mockResolvedValueOnce({ success: false, message: 'vehicle_cmds scope missing' })
          .mockResolvedValueOnce({ success: true });
      });

      it('should try second userId when first fails', async () => {
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1', 'user-2'], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledTimes(2);
        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(
          '5YJ3E1EA123456789',
          'user-1',
          true,
        );
        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(
          '5YJ3E1EA123456789',
          'user-2',
          true,
        );
      });
    });

    describe('When empty userIds array', () => {
      it('should not trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', [], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });
    });

    describe('When latency exceeds the threshold', () => {
      let loggerSpy: jest.SpyInstance;

      beforeEach(async () => {
        const serviceWithLogger = service as unknown as { logger: { warn: () => void } };
        loggerSpy = jest.spyOn(serviceWithLogger.logger, 'warn');
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_auto_sentry_mode_enabled: true,
        });
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });
        const pastDate = new Date(Date.now() - 70000).toISOString();
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], pastDate);
      });

      it('should not trigger set_sentry_mode', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });

      it('should log a warning', () => {
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('[AUTO_SENTRY_LATENCY_ALERT]'),
        );
      });
    });
  });
});
