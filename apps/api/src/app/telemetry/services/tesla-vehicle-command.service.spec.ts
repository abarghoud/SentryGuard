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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('The honkHorn() method', () => {
    describe('When no access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(true);
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue(null);
      });

      it('should return failure response', async () => {
        const result = await service.honkHorn('TESTVIN1234567890', 'user-1');

        expect(result.success).toBe(false);
      });
    });

    describe('When access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(true);
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('valid-token');
        jest.spyOn((service as any).teslaApi, 'post').mockResolvedValue({ data: { response: true } });
      });

      it('should attempt to send honk command', async () => {
        const result = await service.honkHorn('TESTVIN1234567890', 'user-1');

        expect(mockAccessTokenService.getAccessTokenForUserId).toHaveBeenCalledWith('user-1');
        expect(result.success).toBe(true);
      });
    });

    describe('When user lacks vehicle_cmds scope', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(false);
      });

      it('should return failure response', async () => {
        const result = await service.honkHorn('TESTVIN1234567890', 'user-1');

        expect(result.success).toBe(false);
        expect(result.message).toBe('Missing vehicle_cmds scope');
        expect(mockAccessTokenService.getAccessTokenForUserId).not.toHaveBeenCalled();
      });
    });
  });

  describe('The remoteBoombox() method', () => {
    describe('When access token is available', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(true);
        mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('valid-token');
        jest.spyOn((service as any).teslaApi, 'post').mockResolvedValue({ data: { response: true } });
      });

      it('should attempt to send remote_boombox command with payload', async () => {
        const result = await service.remoteBoombox('TESTVIN1234567890', 'user-1', 0);

        expect(mockAccessTokenService.getAccessTokenForUserId).toHaveBeenCalledWith('user-1');
        expect(result.success).toBe(true);
        expect((service as any).teslaApi.post).toHaveBeenCalledWith(
          '/api/1/vehicles/TESTVIN1234567890/command/remote_boombox',
          { action: 0 },
          expect.any(Object),
        );
      });
    });
  });
});