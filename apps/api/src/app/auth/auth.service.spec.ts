import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { WaitlistService } from '../waitlist/services/waitlist.service';
import { mock, MockProxy } from 'jest-mock-extended';
import axios from 'axios';
import { decode, sign } from 'jsonwebtoken';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock crypto
jest.mock('crypto');
import * as crypto from 'crypto';
const mockedRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;

// Mock crypto utils
jest.mock('../../common/utils/crypto.util');
import { encrypt, decrypt } from '../../common/utils/crypto.util';
const mockedEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;
const mockedDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

// Mock jsonwebtoken decode
jest.mock('jsonwebtoken');
const mockedDecode = decode as jest.MockedFunction<typeof decode>;

// Mock l'instance axios créée par axios.create pour l'API Tesla Fleet
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any);

// Mock UserRepository
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
};

const mockUserRepository = {
  findOne: jest.fn().mockResolvedValue(null), // Default to null
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn(),
  signAsync: jest.fn(),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let mockWaitlistService: MockProxy<WaitlistService>;

  const mockStateJwt = sign(
    { type: 'oauth_state', userLocale: 'en', nonce: 'test-nonce' },
    Math.random().toString(36).repeat(8).slice(0, 32)
  );

  beforeEach(async () => {
    mockWaitlistService = mock<WaitlistService>();
    mockWaitlistService.isApproved.mockResolvedValue(true);
    mockWaitlistService.addToWaitlist.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: WaitlistService,
          useValue: mockWaitlistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockedDecrypt.mockClear();
    mockedEncrypt.mockClear();
    mockedDecode.mockClear();

    // Reset repository mocks
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

    // Reset WaitlistService mock
    mockWaitlistService.isApproved.mockResolvedValue(true);
    mockWaitlistService.addToWaitlist.mockResolvedValue(undefined);

    // Set up environment variables for tests
    process.env.TESLA_CLIENT_ID = 'test-client-id';
    process.env.TESLA_CLIENT_SECRET = 'test-client-secret';
    process.env.TESLA_REDIRECT_URI = 'https://test.com/callback';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';

    // Mock crypto.randomBytes to return predictable values
    mockedRandomBytes.mockImplementation((size: number) => {
      if (size === 32) {
        return Buffer.alloc(32, 'a'); // For state generation
      } else {
        return Buffer.from('test-user-id'); // For user ID generation
      }
    });

    // Mock decode to return valid JWT with required scopes
    mockedDecode.mockReturnValue({
      scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
    } as any);

    mockJwtService.sign.mockReturnValue(mockStateJwt);

    mockJwtService.verify.mockReturnValue({
      type: 'oauth_state',
      userLocale: 'en',
      nonce: 'test-nonce',
      iat: 1609459200,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('generateLoginUrl', () => {
    it('should generate a login URL with a state', () => {
      const result = service.generateLoginUrl();

      expect(result.url).toContain(
        'https://auth.tesla.com/oauth2/v3/authorize'
      );
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain(
        'redirect_uri=https%3A%2F%2Ftest.com%2Fcallback'
      );
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=openid');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.state).toBe(mockStateJwt);
    });

    it('should throw an error if TESLA_CLIENT_ID is not defined', () => {
      delete process.env.TESLA_CLIENT_ID;

      expect(() => service.generateLoginUrl()).toThrow(
        'TESLA_CLIENT_ID not defined'
      );
    });
  });

  describe('generateScopeChangeUrl', () => {
    it('should generate a scope change URL with prompt_missing_scopes=true', () => {
      const result = service.generateScopeChangeUrl();

      expect(result.url).toContain(
        'https://auth.tesla.com/oauth2/v3/authorize'
      );
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain(
        'redirect_uri=https%3A%2F%2Ftest.com%2Fcallback'
      );
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('prompt_missing_scopes=true');
      expect(result.url).toContain('scope=openid');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.state).toBe(mockStateJwt);
    });

    it('should include missing scopes in the URL when provided', () => {
      const missingScopes = ['vehicle_device_data', 'offline_access'];
      const result = service.generateScopeChangeUrl('en', missingScopes);

      expect(result.url).toContain('prompt_missing_scopes=true');
      expect(result.url).toContain('scope=openid');
      expect(result.url).toContain('vehicle_device_data');
      expect(result.url).toContain('offline_access');
      expect(result.url).toContain('user_data');
    });



    it('should throw an error if TESLA_CLIENT_ID is not defined', () => {
      delete process.env.TESLA_CLIENT_ID;

      expect(() => service.generateScopeChangeUrl()).toThrow(
        'TESLA_CLIENT_ID not defined'
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange a valid code for tokens', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);

      const result = await service.exchangeCodeForTokens('test-code', state);

      expect(result.userId).toBeDefined();
      expect(result.access_token).toBe('test-access-token');
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

    it('should reject with an invalid state', async () => {
      await expect(
        service.exchangeCodeForTokens('test-code', 'invalid-state')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if Tesla API fails', async () => {
      const { state } = service.generateLoginUrl();

      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw an error if credentials are not defined', async () => {
      const { state } = service.generateLoginUrl();
      process.env.TESLA_CLIENT_SECRET = undefined;

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow('Tesla authentication failed');
    });

    it('should throw error for invalid JWT scopes', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid'], // Missing required scopes
      } as any);

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow('Missing required permissions: vehicle_device_data, offline_access, user_data');
    });

    it('should throw UnauthorizedException when JWT decode returns null', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce(null);

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update existing user when user already exists', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      const mockProfileResponse = {
        data: {
          response: {
            email: 'existing@tesla.com',
            full_name: 'Existing User',
          },
        },
      };

      const existingUser = {
        userId: 'existing-user-id',
        email: 'existing@tesla.com',
        full_name: 'Old Name',
      } as User;

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);
      mockUserRepository.findOne.mockResolvedValueOnce(existingUser);
      mockUserRepository.save.mockResolvedValueOnce({
        ...existingUser,
        full_name: 'Existing User',
      } as User);
      mockJwtService.signAsync.mockResolvedValueOnce('new-jwt-token');

      const result = await service.exchangeCodeForTokens('test-code', state);

      expect(result.userId).toBe('existing-user-id');
      expect(mockUserRepository.save).toHaveBeenCalled();
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.full_name).toBe('Existing User');
    });

    it('should not search for existing user when profile is undefined', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Profile API Error'));
      mockUserRepository.create.mockReturnValueOnce({} as User);
      mockUserRepository.save.mockResolvedValueOnce({
        userId: '746573742d757365722d6964',
      } as User);
      mockJwtService.signAsync.mockResolvedValueOnce('new-jwt-token');

      const result = await service.exchangeCodeForTokens('test-code', state);

      expect(result.userId).toBeDefined();
      expect(mockUserRepository.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: expect.anything() }) })
      );
      expect(mockWaitlistService.isApproved).not.toHaveBeenCalled();
    });

    it('should use userLocale from jwt state when creating new user', async () => {
      const { state } = service.generateLoginUrl('fr');

      mockJwtService.verify.mockReturnValueOnce({
        type: 'oauth_state',
        userLocale: 'fr',
        nonce: 'test-nonce',
        iat: 1609459200,
      });

      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      const mockProfileResponse = {
        data: {
          response: {
            email: 'newuser@tesla.com',
            full_name: 'New User',
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockImplementation((userData) => userData as User);
      mockUserRepository.save.mockResolvedValueOnce({
        userId: '746573742d757365722d6964',
        preferred_language: 'fr',
      } as User);
      mockJwtService.signAsync.mockResolvedValueOnce('new-jwt-token');

      const result = await service.exchangeCodeForTokens('test-code', state);

      expect(result.userId).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_language: 'fr',
        })
      );
    });

    it('should pass userLocale to waitlist service when user is not approved', async () => {
      const { state } = service.generateLoginUrl('fr');

      mockJwtService.verify.mockReturnValueOnce({
        type: 'oauth_state',
        userLocale: 'fr',
        nonce: 'test-nonce',
        iat: 1609459200,
      });

      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      const mockProfileResponse = {
        data: {
          response: {
            email: 'waitlisted@tesla.com',
            full_name: 'Waitlisted User',
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockWaitlistService.isApproved.mockResolvedValueOnce(false);

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow('Your account is pending approval');

      expect(mockWaitlistService.addToWaitlist).toHaveBeenCalledWith(
        'waitlisted@tesla.com',
        'Waitlisted User',
        'fr'
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return the access token for a valid user', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      // Mock decrypt for this test
      mockedDecrypt.mockReturnValue('test-access-token');

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);

      // Mock user repository
      mockUserRepository.findOne.mockImplementation((options: any) => {
        if (options.where?.email) {
          // For finding by email in exchangeCodeForTokens
          return Promise.resolve(null); // No existing user
        }
        if (options.where?.userId) {
          // For finding by userId in getAccessTokenByUserId
          return Promise.resolve({
            userId: options.where.userId,
            access_token: 'encrypted-test-access-token',
            expires_at: new Date(Date.now() + 3600000), // 1 hour from now
          });
        }
        return Promise.resolve(null);
      });

      const { userId } = await service.exchangeCodeForTokens(
        'test-code',
        state
      );
      const token = await service.getAccessTokenForUserId(userId);

      expect(token).toBe('test-access-token');
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

    it('should return null for an unknown user', async () => {
      const token = await service.getAccessTokenForUserId('unknown-user-id');
      expect(token).toBeNull();
    });

    it('should return null and delete the expired token', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: -1, // Token déjà expiré
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);

      const { userId } = await service.exchangeCodeForTokens(
        'test-code',
        state
      );

      // Wait a bit for the token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const token = await service.getAccessTokenForUserId(userId);
      expect(token).toBeNull();
    });
  });

  describe('hasValidToken', () => {
    it('should return true for a user with a valid token', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      // Mock decrypt for this test
      mockedDecrypt.mockReturnValue('test-access-token');

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockedDecode.mockReturnValueOnce({
        scp: ['openid', 'vehicle_device_data', 'offline_access', 'user_data'],
      } as any);

      // Mock user repository
      mockUserRepository.findOne.mockImplementation((options: any) => {
        if (options.where?.email) {
          // For finding by email in exchangeCodeForTokens
          return Promise.resolve(null); // No existing user
        }
        if (options.where?.userId) {
          // For finding by userId in hasValidToken
          return Promise.resolve({
            userId: options.where.userId,
            access_token: 'encrypted-test-access-token',
            expires_at: new Date(Date.now() + 3600000), // 1 hour from now
          });
        }
        return Promise.resolve(null);
      });

      const { userId } = await service.exchangeCodeForTokens(
        'test-code',
        state
      );

      const userWithToken = { userId } as unknown as User;
      expect(await service.hasValidToken(userWithToken)).toBe(true);
    });

    it('should return false for a user without a token', async () => {
      const userWithoutToken = { userId: 'unknown-user-id' } as unknown as User;
      expect(await service.hasValidToken(userWithoutToken)).toBe(false);
    });
  });

  describe('invalidateUserTokens', () => {
    it('should invalidate JWT token and mark token as revoked', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        userId,
        email: 'test@example.com',
        jwt_token: 'valid-jwt-token',
        jwt_expires_at: new Date(Date.now() + 3600000),
        token_revoked_at: null,
      } as unknown as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        jwt_token: undefined,
        jwt_expires_at: undefined,
        token_revoked_at: expect.any(Date),
      });

      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      await service.invalidateUserTokens(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          jwt_token: null,
          jwt_expires_at: null,
          token_revoked_at: expect.any(Date),
        })
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('All tokens invalidated for user')
      );

      loggerSpy.mockRestore();
    });

    it('should log warning when user is not found', async () => {
      const userId = 'non-existent-user';
      mockUserRepository.findOne.mockResolvedValue(null);

      const loggerSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      await service.invalidateUserTokens(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(mockUserRepository.save).not.toHaveBeenCalled();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot invalidate tokens: user not found')
      );

      loggerSpy.mockRestore();
    });

    it('should set token_revoked_at to current timestamp', async () => {
      const userId = 'test-user-id';
      const mockUser = {
        userId,
        email: 'test@example.com',
        jwt_token: 'valid-jwt-token',
        jwt_expires_at: new Date(Date.now() + 3600000),
        token_status: 'active',
        token_revoked_at: null,
      } as unknown as User;

      const beforeTime = new Date();
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      let savedUser: User | undefined;
      mockUserRepository.save.mockImplementation((user: User) => {
        savedUser = user;
        return Promise.resolve(user);
      });

      await service.invalidateUserTokens(userId);

      const afterTime = new Date();

      expect(savedUser).toBeDefined();
      expect(savedUser?.token_revoked_at).toBeDefined();
      expect(savedUser?.token_revoked_at?.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(savedUser?.token_revoked_at?.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });
  });
});
