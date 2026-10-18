import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsAutoSentryService } from './alerts-auto-sentry.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { SentryModeStateTrackerService } from './sentry-mode-state-tracker.service';
import { DEFAULT_ALERT_SOUND } from '../alerts/enums/alert-sound.enum';
import { DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS, DEFAULT_BREAK_IN_SENSITIVITY } from '@sentryguard/vehicles-domain';

describe('The AlertsAutoSentryService class', () => {
  let service: AlertsAutoSentryService;

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;
  let mockLatencyGuardService: MockProxy<LatencyGuardService>;
  let mockSentryModeStateTracker: MockProxy<SentryModeStateTrackerService>;

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    vin: '5YJ3E1EA123456789',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: true,
    break_in_offensive_response: OffensiveResponse.DISABLED,
    break_in_auto_sentry_mode_enabled: false,
    sentry_alert_sound: DEFAULT_ALERT_SOUND,
    break_in_alert_sound: DEFAULT_ALERT_SOUND,
    break_in_sensitivity: DEFAULT_BREAK_IN_SENSITIVITY,
    break_in_reaction_delay_seconds: DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
    display_name: 'Model 3',
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();
    mockLatencyGuardService = mock<LatencyGuardService>();
    mockLatencyGuardService.checkLatency.mockReturnValue(false);
    mockSentryModeStateTracker = mock<SentryModeStateTrackerService>();
    mockSentryModeStateTracker.isSentryModeActive.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsAutoSentryService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TeslaVehicleCommandService, useValue: mockTeslaVehicleCommandService },
        { provide: LatencyGuardService, useValue: mockLatencyGuardService },
        { provide: SentryModeStateTrackerService, useValue: mockSentryModeStateTracker },
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

      it('should report that Sentry Mode was activated', async () => {
        expect(await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt)).toStrictEqual({ isSentryModeActivated: true });
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

    describe('When Sentry Mode is already active on the vehicle', () => {
      beforeEach(async () => {
        mockSentryModeStateTracker.isSentryModeActive.mockReturnValue(true);
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_auto_sentry_mode_enabled: true,
        });

        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt);
      });

      it('should not send a redundant set_sentry_mode command', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });

      it('should report that Sentry Mode was not activated by this alert', async () => {
        expect(await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt)).toStrictEqual({ isSentryModeActivated: false });
      });
    });

    describe('When the alert was intentionally delayed by the reaction delay', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(null);

        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt, 20_000);
      });

      it('should exclude the reaction delay from the latency check', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith(
          expect.objectContaining({ intentionalDelayMs: 20_000 })
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

    describe('When latency guard blocks the request', () => {
      beforeEach(async () => {
        mockLatencyGuardService.checkLatency.mockReturnValue(true);
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_auto_sentry_mode_enabled: true,
        });
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });
        
        await service.handleBreakInAutoSentry('5YJ3E1EA123456789', ['user-1'], createdAt);
      });

      it('should not trigger set_sentry_mode', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });

      it('should have called checkLatency with correct options', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith({
          vin: '5YJ3E1EA123456789',
          createdAt,
          logContext: 'AUTO_SENTRY',
          envVarThresholdName: 'AUTO_SENTRY_LATENCY_THRESHOLD_MS',
          defaultThresholdMs: 60000,
          alertPrefix: 'AUTO_SENTRY_LATENCY_ALERT',
          actionName: 'Auto sentry',
          intentionalDelayMs: 0,
        });
      });
    });
  });
});
