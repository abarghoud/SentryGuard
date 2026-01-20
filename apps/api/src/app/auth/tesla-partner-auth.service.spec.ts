import { Test, TestingModule } from '@nestjs/testing';
import { TeslaPartnerAuthService } from './tesla-partner-auth.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('The TeslaPartnerAuthService class', () => {
  let service: TeslaPartnerAuthService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    jest.useFakeTimers();
    originalEnv = { ...process.env };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeslaPartnerAuthService],
    }).compile();

    service = module.get<TeslaPartnerAuthService>(TeslaPartnerAuthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe('The getPartnerToken() method', () => {
    const mockClientId = 'test-client-id';
    const mockClientSecret = 'test-client-secret';
    const mockAudience = 'https://fleet-api.prd.na.vn.cloud.tesla.com';

    beforeEach(() => {
      process.env.TESLA_CLIENT_ID = mockClientId;
      process.env.TESLA_CLIENT_SECRET = mockClientSecret;
      process.env.TESLA_AUDIENCE = mockAudience;
    });

    describe('When credentials are configured and API call succeeds', () => {
      const mockTokenResponse = {
        access_token: 'test-partner-token',
        expires_in: 3600,
      };

      beforeEach(() => {
        mockedAxios.post = jest.fn().mockResolvedValue({
          data: mockTokenResponse,
        });
      });

      it('should return partner token', async () => {
        const token = await service.getPartnerToken();

        expect(token).toBe(mockTokenResponse.access_token);
      });

      it('should call Tesla API with correct parameters', async () => {
        await service.getPartnerToken();

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
          expect.any(URLSearchParams),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        const callArgs = mockedAxios.post.mock.calls[0];
        const params = callArgs[1] as URLSearchParams;
        expect(params.get('grant_type')).toBe('client_credentials');
        expect(params.get('client_id')).toBe(mockClientId);
        expect(params.get('client_secret')).toBe(mockClientSecret);
        expect(params.get('audience')).toBe(mockAudience);
      });

      it('should cache the token', async () => {
        await service.getPartnerToken();
        await service.getPartnerToken();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      });
    });

    describe('When credentials are not configured', () => {
      beforeEach(() => {
        delete process.env.TESLA_CLIENT_ID;
        delete process.env.TESLA_CLIENT_SECRET;
      });

      it('should throw error when TESLA_CLIENT_ID is missing', async () => {
        await expect(service.getPartnerToken()).rejects.toThrow(
          'TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined',
        );
      });

      it('should throw error when TESLA_CLIENT_SECRET is missing', async () => {
        process.env.TESLA_CLIENT_ID = mockClientId;
        delete process.env.TESLA_CLIENT_SECRET;

        await expect(service.getPartnerToken()).rejects.toThrow(
          'TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined',
        );
      });
    });

    describe('When API call fails', () => {
      beforeEach(() => {
        mockedAxios.post = jest
          .fn()
          .mockRejectedValue(new Error('Network error'));
      });

      it('should throw error with descriptive message', async () => {
        await expect(service.getPartnerToken()).rejects.toThrow(
          'Failed to obtain partner token',
        );
      });
    });

    describe('When using default audience', () => {
      beforeEach(() => {
        delete process.env.TESLA_AUDIENCE;
        mockedAxios.post = jest.fn().mockResolvedValue({
          data: {
            access_token: 'test-token',
            expires_in: 3600,
          },
        });
      });

      it('should use default audience when TESLA_AUDIENCE is not set', async () => {
        await service.getPartnerToken();

        const callArgs = mockedAxios.post.mock.calls[0];
        const params = callArgs[1] as URLSearchParams;
        expect(params.get('audience')).toBe(
          'https://fleet-api.prd.na.vn.cloud.tesla.com',
        );
      });
    });

    describe('When cached token expires', () => {
      const tokenExpiresInSeconds = 3600;
      const bufferMs = 5 * 60 * 1000;

      beforeEach(() => {
        mockedAxios.post = jest.fn().mockResolvedValue({
          data: {
            access_token: 'test-token',
            expires_in: tokenExpiresInSeconds,
          },
        });
      });

      it('should fetch new token when cached token is expired', async () => {
        await service.getPartnerToken();

        const timeToExpire = tokenExpiresInSeconds * 1000 - bufferMs + 1000;
        jest.advanceTimersByTime(timeToExpire);

        await service.getPartnerToken();

        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      });

      it('should use cached token when it is still valid', async () => {
        await service.getPartnerToken();

        const timeWithinBuffer = tokenExpiresInSeconds * 1000 - bufferMs - 1000;
        jest.advanceTimersByTime(timeWithinBuffer);

        await service.getPartnerToken();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      });
    });
  });
});
