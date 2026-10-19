import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsAutoSentryService, AutoSentryResult, AutoSentryVehicle } from './alerts-auto-sentry.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';
import { SentryModeStateTrackerService } from './sentry-mode-state-tracker.service';

describe('The AlertsAutoSentryService class', () => {
  const fakeVin = '5YJ3E1EA123456789';
  let service: AlertsAutoSentryService;
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;
  let mockLatencyGuardService: MockProxy<LatencyGuardService>;
  let mockSentryModeStateTracker: MockProxy<SentryModeStateTrackerService>;

  const buildVehicle = (userId: string, isAutoSentryEnabled: boolean): AutoSentryVehicle => ({
    break_in_auto_sentry_mode_enabled: isAutoSentryEnabled,
    userId,
    vin: fakeVin,
  });

  beforeEach(() => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();
    mockLatencyGuardService = mock<LatencyGuardService>();
    mockLatencyGuardService.checkLatency.mockReturnValue(false);
    mockSentryModeStateTracker = mock<SentryModeStateTrackerService>();
    mockSentryModeStateTracker.isSentryModeActive.mockReturnValue(false);

    service = new AlertsAutoSentryService(mockTeslaVehicleCommandService, mockLatencyGuardService, mockSentryModeStateTracker);
  });

  describe('The handleBreakInAutoSentry() method', () => {
    let createdAt: string;

    beforeEach(() => {
      createdAt = new Date().toISOString();
    });

    describe('When no vehicle is provided', () => {
      it('should not trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry(fakeVin, [], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });
    });

    describe('When auto sentry is disabled', () => {
      it('should not trigger set_sentry_mode', async () => {
        await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', false)], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });
    });

    describe('When auto sentry is enabled', () => {
      let result: AutoSentryResult;

      beforeEach(async () => {
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });

        result = await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', true)], createdAt);
      });

      it('should report that Sentry Mode was activated', () => {
        expect(result).toStrictEqual({ isSentryModeActivated: true });
      });

      it('should trigger set_sentry_mode', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(fakeVin, 'user-1', true);
      });
    });

    describe('When Sentry Mode is already active on the vehicle', () => {
      let result: AutoSentryResult;

      beforeEach(async () => {
        mockSentryModeStateTracker.isSentryModeActive.mockReturnValue(true);

        result = await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', true)], createdAt);
      });

      it('should not send a redundant set_sentry_mode command', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });

      it('should report that Sentry Mode was not activated by this alert', () => {
        expect(result).toStrictEqual({ isSentryModeActivated: false });
      });
    });

    describe('When the alert was intentionally delayed by the reaction delay', () => {
      beforeEach(async () => {
        await service.handleBreakInAutoSentry(fakeVin, [], createdAt, 20_000);
      });

      it('should exclude the reaction delay from the latency check', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith(
          expect.objectContaining({ intentionalDelayMs: 20_000 })
        );
      });
    });

    describe('When the first vehicle is disabled and the second one is enabled', () => {
      beforeEach(() => {
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });
      });

      it('should trigger set_sentry_mode for the second user', async () => {
        await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', false), buildVehicle('user-2', true)], createdAt);

        expect(mockTeslaVehicleCommandService.setSentryMode).toHaveBeenCalledWith(fakeVin, 'user-2', true);
      });
    });

    describe('When the first user fails and the second user succeeds', () => {
      beforeEach(async () => {
        mockTeslaVehicleCommandService.setSentryMode
          .mockResolvedValueOnce({ success: false, message: 'vehicle_cmds scope missing' })
          .mockResolvedValueOnce({ success: true });

        await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', true), buildVehicle('user-2', true)], createdAt);
      });

      it('should try the second user when the first fails', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode.mock.calls).toStrictEqual([
          [fakeVin, 'user-1', true],
          [fakeVin, 'user-2', true],
        ]);
      });
    });

    describe('When latency guard blocks the request', () => {
      beforeEach(async () => {
        mockLatencyGuardService.checkLatency.mockReturnValue(true);
        mockTeslaVehicleCommandService.setSentryMode.mockResolvedValue({ success: true });

        await service.handleBreakInAutoSentry(fakeVin, [buildVehicle('user-1', true)], createdAt);
      });

      it('should not trigger set_sentry_mode', () => {
        expect(mockTeslaVehicleCommandService.setSentryMode).not.toHaveBeenCalled();
      });

      it('should have called checkLatency with correct options', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith({
          vin: fakeVin,
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
