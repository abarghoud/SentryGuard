import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TeslaVehicleCommandService } from './tesla-vehicle-command.service';
import { AccessTokenService } from '../../auth/services/access-token.service';

interface CommandOutcome {
  loggedLine: string;
  result: { success: boolean; message?: string };
}

const teslaApiOf = (target: TeslaVehicleCommandService): { post: jest.Mock } =>
  (target as unknown as { teslaApi: { post: jest.Mock } }).teslaApi;

const loggerOf = (target: TeslaVehicleCommandService): Logger =>
  (target as unknown as { logger: Logger }).logger;

describe('The TeslaVehicleCommandService class', () => {
  const fakeVin = 'TESTVIN1234567890';
  const fakeUserId = 'user-1';

  let service: TeslaVehicleCommandService;
  let mockAccessTokenService: MockProxy<AccessTokenService>;

  const givenAuthorizedUser = () => {
    mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(true);
    mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('valid-token');
  };

  const runFailingHonk = async (rejection: unknown): Promise<CommandOutcome> => {
    givenAuthorizedUser();
    jest.spyOn(teslaApiOf(service), 'post').mockRejectedValue(rejection);

    let loggedLine = '';
    jest.spyOn(loggerOf(service), 'error').mockImplementation((message: unknown) => {
      loggedLine = String(message);
    });

    const result = await service.honkHorn(fakeVin, fakeUserId);

    return { loggedLine, result };
  };

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
        const result = await service.honkHorn(fakeVin, fakeUserId);

        expect(result.success).toBe(false);
      });
    });

    describe('When access token is available', () => {
      beforeEach(() => {
        givenAuthorizedUser();
        jest.spyOn(teslaApiOf(service), 'post').mockResolvedValue({ data: { response: true } });
      });

      it('should attempt to send honk command', async () => {
        const result = await service.honkHorn(fakeVin, fakeUserId);

        expect(mockAccessTokenService.getAccessTokenForUserId).toHaveBeenCalledWith(fakeUserId);
        expect(result.success).toBe(true);
      });
    });

    describe('When user lacks vehicle_cmds scope', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(false);
      });

      it('should return failure response', async () => {
        const result = await service.honkHorn(fakeVin, fakeUserId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Missing vehicle_cmds scope');
        expect(mockAccessTokenService.getAccessTokenForUserId).not.toHaveBeenCalled();
      });
    });

    describe('When the proxy answers with a JSON error payload', () => {
      let outcome: CommandOutcome;

      beforeEach(async () => {
        outcome = await runFailingHonk({
          isAxiosError: true,
          message: 'Request failed with status code 500',
          response: {
            status: 500,
            data: { error: 'context deadline exceeded', error_description: '' },
          },
        });
      });

      it('should log the proxy response body', () => {
        expect(outcome.loggedLine).toContain('"error":"context deadline exceeded"');
      });

      it('should log the HTTP status', () => {
        expect(outcome.loggedLine).toContain('status=500');
      });

      it('should keep the original Axios message', () => {
        expect(outcome.loggedLine).toContain('Request failed with status code 500');
      });

      it('should return the enriched message', () => {
        expect(outcome.result.message).toContain('context deadline exceeded');
      });
    });

    describe('When the proxy answers with a plain text body', () => {
      let outcome: CommandOutcome;

      beforeEach(async () => {
        outcome = await runFailingHonk({
          isAxiosError: true,
          message: 'Request failed with status code 408',
          response: { status: 408, data: 'vehicle is offline or asleep' },
        });
      });

      it('should log the plain text body', () => {
        expect(outcome.loggedLine).toContain('body=vehicle is offline or asleep');
      });
    });

    describe('When the request never reached the proxy', () => {
      let outcome: CommandOutcome;

      beforeEach(async () => {
        outcome = await runFailingHonk({
          isAxiosError: true,
          message: 'connect ECONNREFUSED',
          code: 'ECONNREFUSED',
        });
      });

      it('should log the connection error code', () => {
        expect(outcome.loggedLine).toContain('code=ECONNREFUSED');
      });
    });

    describe('When the proxy answers with an oversized body', () => {
      let outcome: CommandOutcome;

      beforeEach(async () => {
        outcome = await runFailingHonk({
          isAxiosError: true,
          message: 'Request failed with status code 502',
          response: { status: 502, data: 'x'.repeat(5000) },
        });
      });

      it('should truncate the body to keep the log readable', () => {
        expect(outcome.loggedLine.length).toBeLessThan(700);
      });
    });

    describe('When the failure is not an Axios error', () => {
      let outcome: CommandOutcome;

      beforeEach(async () => {
        outcome = await runFailingHonk(new Error('unexpected failure'));
      });

      it('should log the error message unchanged', () => {
        expect(outcome.loggedLine).toContain('unexpected failure');
      });

      it('should not append empty detail separators', () => {
        expect(outcome.loggedLine).not.toContain('|');
      });
    });
  });

  describe('The remoteBoombox() method', () => {
    describe('When access token is available', () => {
      beforeEach(() => {
        givenAuthorizedUser();
        jest.spyOn(teslaApiOf(service), 'post').mockResolvedValue({ data: { response: true } });
      });

      it('should attempt to send remote_boombox command with payload', async () => {
        const result = await service.remoteBoombox(fakeVin, fakeUserId, 1);

        expect(result.success).toBe(true);
        expect(teslaApiOf(service).post).toHaveBeenCalledWith(
          `/api/1/vehicles/${fakeVin}/command/remote_boombox`,
          { sound: 1 },
          expect.any(Object),
        );
      });
    });
  });

  describe('The setSentryMode() method', () => {
    describe('When access token is available', () => {
      beforeEach(() => {
        givenAuthorizedUser();
        jest.spyOn(teslaApiOf(service), 'post').mockResolvedValue({ data: { response: true } });
      });

      it('should attempt to send set_sentry_mode command with payload', async () => {
        const result = await service.setSentryMode(fakeVin, fakeUserId, true);

        expect(result.success).toBe(true);
        expect(teslaApiOf(service).post).toHaveBeenCalledWith(
          `/api/1/vehicles/${fakeVin}/command/set_sentry_mode`,
          { on: true },
          expect.any(Object),
        );
      });
    });

    describe('When user lacks vehicle_cmds scope', () => {
      beforeEach(() => {
        mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(false);
      });

      it('should return failure response', async () => {
        const result = await service.setSentryMode(fakeVin, fakeUserId, true);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Missing vehicle_cmds scope');
        expect(mockAccessTokenService.getAccessTokenForUserId).not.toHaveBeenCalled();
      });
    });
  });
});
