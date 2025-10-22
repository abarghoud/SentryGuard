import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock l'instance axios créée par axios.create pour l'API Tesla Fleet
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any);

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    
    // Reset environment variables
    process.env.TESLA_CLIENT_ID = 'test-client-id';
    process.env.TESLA_CLIENT_SECRET = 'test-client-secret';
    process.env.TESLA_REDIRECT_URI = 'https://test.com/callback';
    process.env.TESLA_AUDIENCE = 'https://test-audience.com';

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up interval to prevent Jest from hanging
    service.onModuleDestroy();
    jest.clearAllTimers();
  });

  describe('generateLoginUrl', () => {
    it('should generate a login URL with a state', () => {
      const result = service.generateLoginUrl();

      expect(result.url).toContain('https://auth.tesla.com/oauth2/v3/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=https%3A%2F%2Ftest.com%2Fcallback');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=openid');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.state).toHaveLength(64); // 32 bytes in hex = 64 characters
    });

    it('should throw an error if TESLA_CLIENT_ID is not defined', () => {
      delete process.env.TESLA_CLIENT_ID;

      expect(() => service.generateLoginUrl()).toThrow('TESLA_CLIENT_ID not defined');
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
      delete process.env.TESLA_CLIENT_SECRET;

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow('TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined');
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

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      const token = service.getAccessToken(userId);

      expect(token).toBe('test-access-token');
    });

    it('should return null for an unknown user', () => {
      const token = service.getAccessToken('unknown-user-id');
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

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      
      // Wait a bit for the token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const token = service.getAccessToken(userId);
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

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      
      expect(service.hasValidToken(userId)).toBe(true);
    });

    it('should return false for a user without a token', () => {
      expect(service.hasValidToken('unknown-user-id')).toBe(false);
    });
  });

  describe('getTokenInfo', () => {
    it('should return token information', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      const info = service.getTokenInfo(userId);

      expect(info.exists).toBe(true);
      expect(info.expires_at).toBeInstanceOf(Date);
      expect(info.created_at).toBeInstanceOf(Date);
    });

    it('should return exists: false for an unknown user', () => {
      const info = service.getTokenInfo('unknown-user-id');
      
      expect(info.exists).toBe(false);
      expect(info.expires_at).toBeUndefined();
      expect(info.created_at).toBeUndefined();
    });
  });

  describe('getUserProfile', () => {
    it('should return the stored user profile', async () => {
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
            email: 'test@tesla.com',
            full_name: 'Test User',
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      const profile = service.getUserProfile(userId);

      expect(profile).toEqual(mockProfileResponse.data.response);
      expect(profile?.email).toBe('test@tesla.com');
    });

    it('should return null for an unknown user', () => {
      const profile = service.getUserProfile('unknown-user-id');
      expect(profile).toBeNull();
    });

    it('should continue even if profile retrieval fails', async () => {
      const { state } = service.generateLoginUrl();
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Profile API Error'));

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      
      expect(userId).toBeDefined();
      const profile = service.getUserProfile(userId);
      expect(profile).toBeNull(); // No profile if API failed
    });
  });

  describe('getTokenInfo', () => {
    it('should return has_profile: true when profile exists', async () => {
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
            email: 'test@tesla.com',
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);

      const { userId } = await service.exchangeCodeForTokens('test-code', state);
      const tokenInfo = service.getTokenInfo(userId);

      expect(tokenInfo.has_profile).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', async () => {
      const { state } = service.generateLoginUrl();
      
      let stats = service.getStats();
      expect(stats.activeUsers).toBe(0);
      expect(stats.pendingStates).toBe(1);

      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
        },
      };

      const mockProfileResponse = {
        data: {
          response: { email: 'test@tesla.com' },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
      mockAxiosInstance.get.mockResolvedValueOnce(mockProfileResponse);

      await service.exchangeCodeForTokens('test-code', state);
      
      stats = service.getStats();
      expect(stats.activeUsers).toBe(1);
      expect(stats.pendingStates).toBe(0); // State deleted after validation
    });
  });
});

