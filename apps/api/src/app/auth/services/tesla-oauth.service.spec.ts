import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TeslaOAuthService } from './tesla-oauth.service';
import { OAuthAuthenticationResult } from '../interfaces/oauth-provider.requirements';
import axios from 'axios';
import { decode } from 'jsonwebtoken';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('crypto');
import * as crypto from 'crypto';
const mockedRandomBytes = crypto.randomBytes as jest.MockedFunction<
  typeof crypto.randomBytes
>;

jest.mock('jsonwebtoken');
const mockedDecode = decode as jest.MockedFunction<typeof decode>;

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any);

describe('The TeslaOAuthService class', () => {
  let service: TeslaOAuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const fakeStateJwt = 'fake-state-jwt-token';

  beforeEach(async () => {
    process.env.TESLA_CLIENT_ID = 'test-client-id';
    process.env.TESLA_CLIENT_SECRET = 'test-client-secret';
    process.env.TESLA_REDIRECT_URI = 'https://test.com/callback';
    process.env.JWT_OAUTH_STATE_SECRET = 'test-oauth-state-secret';
    delete process.env.TESLA_API_BASE_URL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeslaOAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    await module.init();

    service = module.get<TeslaOAuthService>(TeslaOAuthService);

    jest.clearAllMocks();
    mockedDecode.mockClear();

    mockedRandomBytes.mockImplementation((size: number) => {
      return Buffer.alloc(size, 'a');
    });

    mockJwtService.sign.mockReturnValue(fakeStateJwt);

    mockJwtService.verify.mockReturnValue({
      type: 'oauth_state',
      userLocale: 'en',
      nonce: 'test-nonce',
      iat: 1609459200,
    });
  });

  describe('The onModuleInit() method', () => {
    describe('When JWT_OAUTH_STATE_SECRET is not defined', () => {
      it('should throw an error', async () => {
        delete process.env.JWT_OAUTH_STATE_SECRET;

        const module = await Test.createTestingModule({
          providers: [
            TeslaOAuthService,
            { provide: JwtService, useValue: mockJwtService },
          ],
        }).compile();

        await expect(module.init()).rejects.toThrow(
          'JWT_OAUTH_STATE_SECRET environment variable is required'
        );
      });
    });
  });

  describe('The generateLoginUrl() method', () => {
    describe('When TESLA_CLIENT_ID is defined', () => {
      let result: { url: string; state: string };

      beforeEach(() => {
        result = service.generateLoginUrl();
      });

      it('should return a URL pointing to Tesla OAuth', () => {
        expect(result.url).toContain(
          'https://auth.tesla.com/oauth2/v3/authorize'
        );
      });

      it('should include the client_id', () => {
        expect(result.url).toContain('client_id=test-client-id');
      });

      it('should include the redirect_uri', () => {
        expect(result.url).toContain(
          'redirect_uri=https%3A%2F%2Ftest.com%2Fcallback'
        );
      });

      it('should include the signed state', () => {
        expect(result.state).toBe(fakeStateJwt);
      });
    });

    describe('When TESLA_CLIENT_ID is not defined', () => {
      beforeEach(() => {
        delete process.env.TESLA_CLIENT_ID;
      });

      it('should throw an error', () => {
        expect(() => service.generateLoginUrl()).toThrow(
          'TESLA_CLIENT_ID not defined'
        );
      });
    });
  });

  describe('The generateScopeChangeUrl() method', () => {
    describe('When called without missing scopes', () => {
      let result: { url: string; state: string };

      beforeEach(() => {
        result = service.generateScopeChangeUrl();
      });

      it('should include prompt_missing_scopes=true', () => {
        expect(result.url).toContain('prompt_missing_scopes=true');
      });

      it('should include the signed state', () => {
        expect(result.state).toBe(fakeStateJwt);
      });
    });

    describe('When TESLA_CLIENT_ID is not defined', () => {
      beforeEach(() => {
        delete process.env.TESLA_CLIENT_ID;
      });

      it('should throw an error', () => {
        expect(() => service.generateScopeChangeUrl()).toThrow(
          'TESLA_CLIENT_ID not defined'
        );
      });
    });
  });

  describe('The authenticateWithCode() method', () => {
    const validState = 'valid-state';

    describe('When the exchange succeeds with valid scopes and profile', () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      const mockProfile = {
        email: 'test@tesla.com',
        full_name: 'Test User',
      };

      let result: OAuthAuthenticationResult;

      beforeEach(async () => {
        mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
        mockedDecode.mockReturnValueOnce({
          scp: [
            'openid',
            'vehicle_device_data',
            'offline_access',
            'user_data',
          ],
        } as any);
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: { response: mockProfile },
        });

        result = await service.authenticateWithCode('test-code', validState);
      });

      it('should return the tokens', () => {
        expect(result.tokens.access_token).toBe('test-access-token');
        expect(result.tokens.refresh_token).toBe('test-refresh-token');
      });

      it('should return the user profile', () => {
        expect(result.profile).toEqual(mockProfile);
      });

      it('should return the userLocale', () => {
        expect(result.userLocale).toBe('en');
      });

      it('should call the Tesla token endpoint', () => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
          expect.any(URLSearchParams),
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );
      });
    });

    describe('When the profile fetch fails', () => {
      let result: OAuthAuthenticationResult;

      beforeEach(async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
          },
        });
        mockedDecode.mockReturnValueOnce({
          scp: [
            'openid',
            'vehicle_device_data',
            'offline_access',
            'user_data',
          ],
        } as any);
        mockAxiosInstance.get.mockRejectedValueOnce(
          new Error('Profile API Error')
        );

        result = await service.authenticateWithCode('test-code', validState);
      });

      it('should return undefined profile', () => {
        expect(result.profile).toBeUndefined();
      });

      it('should still return tokens', () => {
        expect(result.tokens.access_token).toBe('test-access-token');
      });
    });

    describe('When credentials are not defined', () => {
      beforeEach(() => {
        delete process.env.TESLA_CLIENT_SECRET;
      });

      it('should throw an error', async () => {
        await expect(
          service.authenticateWithCode('test-code', validState)
        ).rejects.toThrow(
          'TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined'
        );
      });
    });

    describe('When JWT scopes are missing', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
          },
        });
        mockedDecode.mockReturnValueOnce({
          scp: ['openid'],
        } as any);
      });

      it('should throw MissingPermissionsException', async () => {
        await expect(
          service.authenticateWithCode('test-code', validState)
        ).rejects.toThrow(
          'Missing required permissions: vehicle_device_data, offline_access, user_data'
        );
      });
    });

    describe('When the decoded token is null', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            access_token: 'invalid-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
          },
        });
        mockedDecode.mockReturnValueOnce(null);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(
          service.authenticateWithCode('test-code', validState)
        ).rejects.toThrow('Invalid JWT token: missing scopes');
      });
    });

    describe('When the state type is invalid', () => {
      beforeEach(() => {
        mockJwtService.verify.mockReturnValueOnce({
          type: 'invalid_type',
          userLocale: 'en',
        });
      });

      it('should throw UnauthorizedException', async () => {
        await expect(
          service.authenticateWithCode('test-code', 'invalid-state')
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('When the state JWT verification throws', () => {
      beforeEach(() => {
        mockJwtService.verify.mockImplementationOnce(() => {
          throw new Error('Invalid JWT');
        });
      });

      it('should throw UnauthorizedException', async () => {
        await expect(
          service.authenticateWithCode('test-code', 'expired-state')
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });
});