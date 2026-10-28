import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsOffensiveResponseService, OffensiveResponseVehicle } from './alerts-offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The AlertsOffensiveResponseService class', () => {
  const fakeVin = '5YJ3E1EA123456789';
  let service: AlertsOffensiveResponseService;
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;
  let mockLatencyGuardService: MockProxy<LatencyGuardService>;

  const buildVehicle = (userId: string, offensiveResponse: OffensiveResponse): OffensiveResponseVehicle => ({
    break_in_offensive_response: offensiveResponse,
    userId,
    vin: fakeVin,
  });

  beforeEach(() => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();
    mockLatencyGuardService = mock<LatencyGuardService>();
    mockLatencyGuardService.checkLatency.mockReturnValue(false);

    service = new AlertsOffensiveResponseService(mockTeslaVehicleCommandService, mockLatencyGuardService);
  });

  describe('The handleBreakInOffensiveResponse() method', () => {
    let createdAt: string;

    beforeEach(() => {
      createdAt = new Date().toISOString();
    });

    describe('When no vehicle is provided', () => {
      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse(fakeVin, [], createdAt);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in offensive response is DISABLED', () => {
      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse(fakeVin, [buildVehicle('user-1', OffensiveResponse.DISABLED)], createdAt);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in offensive response is HONK', () => {
      beforeEach(() => {
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn only', async () => {
        await service.handleBreakInOffensiveResponse(fakeVin, [buildVehicle('user-1', OffensiveResponse.HONK)], createdAt);

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith(fakeVin, 'user-1');
      });
    });

    describe('When break-in offensive response is FART', () => {
      beforeEach(() => {
        mockTeslaVehicleCommandService.remoteBoombox.mockResolvedValue({ success: true });
      });

      it('should trigger remote boombox only', async () => {
        await service.handleBreakInOffensiveResponse(fakeVin, [buildVehicle('user-1', OffensiveResponse.FART)], createdAt);

        expect(mockTeslaVehicleCommandService.remoteBoombox).toHaveBeenCalledWith(fakeVin, 'user-1', 1);
      });
    });

    describe('When the first vehicle is disabled and the second one is HONK', () => {
      beforeEach(() => {
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn for the second user', async () => {
        await service.handleBreakInOffensiveResponse(
          fakeVin,
          [buildVehicle('user-1', OffensiveResponse.DISABLED), buildVehicle('user-2', OffensiveResponse.HONK)],
          createdAt
        );

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith(fakeVin, 'user-2');
      });
    });

    describe('When every vehicle has the response disabled', () => {
      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse(
          fakeVin,
          [buildVehicle('user-1', OffensiveResponse.DISABLED), buildVehicle('user-2', OffensiveResponse.DISABLED)],
          createdAt
        );

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When the first eligible honk fails and the second user is eligible', () => {
      beforeEach(async () => {
        mockTeslaVehicleCommandService.honkHorn
          .mockResolvedValueOnce({ success: false, message: 'vehicle_cmds scope missing' })
          .mockResolvedValueOnce({ success: true });

        await service.handleBreakInOffensiveResponse(
          fakeVin,
          [buildVehicle('user-1', OffensiveResponse.HONK), buildVehicle('user-2', OffensiveResponse.HONK)],
          createdAt
        );
      });

      it('should try the second user when the first fails', () => {
        expect(mockTeslaVehicleCommandService.honkHorn.mock.calls).toStrictEqual([
          [fakeVin, 'user-1'],
          [fakeVin, 'user-2'],
        ]);
      });
    });

    describe('When the first eligible honk throws and the second user is eligible', () => {
      beforeEach(async () => {
        mockTeslaVehicleCommandService.honkHorn
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ success: true });

        await service.handleBreakInOffensiveResponse(
          fakeVin,
          [buildVehicle('user-1', OffensiveResponse.HONK), buildVehicle('user-2', OffensiveResponse.HONK)],
          createdAt
        );
      });

      it('should try the second user when the first throws', () => {
        expect(mockTeslaVehicleCommandService.honkHorn.mock.calls).toStrictEqual([
          [fakeVin, 'user-1'],
          [fakeVin, 'user-2'],
        ]);
      });
    });

    describe('When every eligible honk fails', () => {
      beforeEach(() => {
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: false, message: 'error' });
      });

      it('should try every eligible user', async () => {
        await service.handleBreakInOffensiveResponse(
          fakeVin,
          [buildVehicle('user-1', OffensiveResponse.HONK), buildVehicle('user-2', OffensiveResponse.HONK)],
          createdAt
        );

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledTimes(2);
      });
    });

    describe('When latency is within the threshold', () => {
      let result: OffensiveResponse | null;

      beforeEach(async () => {
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });

        result = await service.handleBreakInOffensiveResponse(fakeVin, [buildVehicle('user-1', OffensiveResponse.HONK)], createdAt);
      });

      it('should trigger honk horn', () => {
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith(fakeVin, 'user-1');
      });

      it('should report the offensive response that went off', () => {
        expect(result).toBe(OffensiveResponse.HONK);
      });
    });

    describe('When the alert was intentionally delayed by the reaction delay', () => {
      beforeEach(async () => {
        await service.handleBreakInOffensiveResponse(fakeVin, [], createdAt, 20_000);
      });

      it('should exclude the reaction delay from the latency check', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith(
          expect.objectContaining({ intentionalDelayMs: 20_000 })
        );
      });
    });

    describe('When latency guard blocks the request', () => {
      let result: OffensiveResponse | null;

      beforeEach(async () => {
        mockLatencyGuardService.checkLatency.mockReturnValue(true);
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });

        result = await service.handleBreakInOffensiveResponse(fakeVin, [buildVehicle('user-1', OffensiveResponse.HONK)], createdAt);
      });

      it('should not trigger honk horn', () => {
        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });

      it('should report that no offensive response went off', () => {
        expect(result).toBeNull();
      });

      it('should have called checkLatency with correct options', () => {
        expect(mockLatencyGuardService.checkLatency).toHaveBeenCalledWith({
          vin: fakeVin,
          createdAt,
          logContext: 'OFFENSIVE',
          envVarThresholdName: 'OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS',
          defaultThresholdMs: 60000,
          alertPrefix: 'OFFENSIVE_LATENCY_ALERT',
          actionName: 'Offensive response',
          intentionalDelayMs: 0,
        });
      });
    });
  });
});
