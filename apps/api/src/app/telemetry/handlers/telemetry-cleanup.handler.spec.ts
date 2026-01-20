import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryCleanupHandler } from './telemetry-cleanup.handler';
import { TelemetryConfigService } from '../telemetry-config.service';
import type { ConsentRevokedEvent } from '../../consent/interfaces/consent-revoked-handler.interface';

const mockTelemetryConfigService = {
  deleteTelemetryConfigWithPartnerToken: jest.fn(),
};

describe('The TelemetryCleanupHandler class', () => {
  let handler: TelemetryCleanupHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryCleanupHandler,
        {
          provide: TelemetryConfigService,
          useValue: mockTelemetryConfigService,
        },
      ],
    }).compile();

    handler = module.get<TelemetryCleanupHandler>(TelemetryCleanupHandler);

    jest.clearAllMocks();
  });

  describe('The handleConsentRevoked() method', () => {
    describe('When event has multiple vehicles', () => {
      const event: ConsentRevokedEvent = {
        userId: 'test-user-id',
        vehicleVins: ['VIN123456789', 'VIN987654321'],
      };

      beforeEach(async () => {
        mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken.mockResolvedValue(
          {
            success: true,
            message: 'Telemetry configuration deleted successfully',
          },
        );

        await handler.handleConsentRevoked(event);
      });

      it('should delete telemetry config for each vehicle', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).toHaveBeenCalledTimes(2);
      });

      it('should delete telemetry config for first vehicle', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).toHaveBeenCalledWith('VIN123456789');
      });

      it('should delete telemetry config for second vehicle', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).toHaveBeenCalledWith('VIN987654321');
      });
    });

    describe('When event has no vehicles', () => {
      const event: ConsentRevokedEvent = {
        userId: 'test-user-id',
        vehicleVins: [],
      };

      beforeEach(async () => {
        await handler.handleConsentRevoked(event);
      });

      it('should not call deleteTelemetryConfigWithPartnerToken', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).not.toHaveBeenCalled();
      });
    });

    describe('When telemetry deletion fails for some vehicles', () => {
      const event: ConsentRevokedEvent = {
        userId: 'test-user-id',
        vehicleVins: ['VIN123456789', 'VIN987654321'],
      };

      beforeEach(async () => {
        mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken
          .mockResolvedValueOnce({
            success: true,
            message: 'Telemetry configuration deleted successfully',
          })
          .mockResolvedValueOnce({
            success: false,
            message: 'Failed to delete telemetry config',
          });

        await handler.handleConsentRevoked(event);
      });

      it('should still attempt to delete all vehicles', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).toHaveBeenCalledTimes(2);
      });
    });

    describe('When telemetry deletion throws error', () => {
      const event: ConsentRevokedEvent = {
        userId: 'test-user-id',
        vehicleVins: ['VIN123456789'],
      };

      beforeEach(async () => {
        mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken.mockRejectedValue(
          new Error('Network error'),
        );

        await handler.handleConsentRevoked(event);
      });

      it('should not throw and complete gracefully', () => {
        expect(
          mockTelemetryConfigService.deleteTelemetryConfigWithPartnerToken,
        ).toHaveBeenCalledWith('VIN123456789');
      });
    });
  });
});
