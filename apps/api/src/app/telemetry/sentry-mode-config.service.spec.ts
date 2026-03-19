import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { SentryModeConfigService } from './sentry-mode-config.service';
import { TelemetryConfigService } from './telemetry-config.service';
import { TELEMETRY_CONFIG } from './telemetry-config.constants';

describe('The SentryModeConfigService class', () => {
  let service: SentryModeConfigService;

  let mockTelemetryConfigService: MockProxy<TelemetryConfigService>;

  beforeEach(async () => {
    mockTelemetryConfigService = mock<TelemetryConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryModeConfigService,
        { provide: TelemetryConfigService, useValue: mockTelemetryConfigService },
      ],
    }).compile();

    service = module.get<SentryModeConfigService>(SentryModeConfigService);
  });

  describe('The configureTelemetry() method', () => {
    const vin = 'VIN123';
    const userId = 'user1';

    describe('When patch is successful', () => {
      beforeEach(() => {
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: true });
      });

      it('should patch SentryMode config and update vehicle telemetry status', async () => {
        const result = await service.configureTelemetry(vin, userId);

        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          { SentryMode: { interval_seconds: TELEMETRY_CONFIG.DEFAULT_SENTRY_MODE_INTERVAL } }
        );
        expect(mockTelemetryConfigService.updateVehicleTelemetryStatus).toHaveBeenCalledWith(userId, vin, true);
        expect(result).toEqual({ success: true });
      });
    });

    describe('When patch fails', () => {
      beforeEach(() => {
        mockTelemetryConfigService.patchTelemetryConfig.mockResolvedValue({ success: false });
      });

      it('should not update vehicle telemetry status', async () => {
        const result = await service.configureTelemetry(vin, userId);

        expect(mockTelemetryConfigService.patchTelemetryConfig).toHaveBeenCalledWith(
          vin,
          userId,
          { SentryMode: { interval_seconds: TELEMETRY_CONFIG.DEFAULT_SENTRY_MODE_INTERVAL } }
        );
        expect(mockTelemetryConfigService.updateVehicleTelemetryStatus).not.toHaveBeenCalled();
        expect(result).toEqual({ success: false });
      });
    });
  });
});

