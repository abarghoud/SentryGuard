import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TeslaVehicleCommandService } from './tesla-vehicle-command.service';
import { AccessTokenService } from '../../auth/services/access-token.service';

describe('The TeslaVehicleCommandService class', () => {
  let service: TeslaVehicleCommandService;
  let mockAccessTokenService: MockProxy<AccessTokenService>;

  beforeEach(async () => {
    mockAccessTokenService = mock<AccessTokenService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeslaVehicleCommandService,
        { provide: AccessTokenService, useValue: mockAccessTokenService },
      ],
    }).compile();

    service = module.get<TeslaVehicleCommandService>(TeslaVehicleCommandService);
  });

  describe('The flashLights() method', () => {
    describe('When no access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue(null);
      });

      it('should return failure response', async () => {
        const result = await service.flashLights('TESTVIN1234567890', 'user-1');

        expect(result.success).toBe(false);
      });
    });

    describe('When access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('valid-token');
      });

      it('should attempt to send flash_lights command', async () => {
        const result = await service.flashLights('TESTVIN1234567890', 'user-1');

        expect(mockAccessTokenService.getAccessTokenForUserId).toHaveBeenCalledWith('user-1');
      });
    });
  });

  describe('The honkHorn() method', () => {
    describe('When no access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue(null);
      });

      it('should return failure response', async () => {
        const result = await service.honkHorn('TESTVIN1234567890', 'user-1');

        expect(result.success).toBe(false);
      });
    });

    describe('When access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('valid-token');
      });

      it('should attempt to send honk command', async () => {
        const result = await service.honkHorn('TESTVIN1234567890', 'user-1');

        expect(mockAccessTokenService.getAccessTokenForUserId).toHaveBeenCalledWith('user-1');
      });
    });
  });
});