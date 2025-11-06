import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    generateLoginUrl: jest.fn(),
    generateScopeChangeUrl: jest.fn(),
    getTokenInfo: jest.fn(),
    getUserProfile: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('loginWithTesla', () => {
    it('should return a login URL', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?state=test-state';
      const mockState = 'test-state';

      mockAuthService.generateLoginUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.loginWithTesla();

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to authenticate with Tesla');
      expect(authService.generateLoginUrl).toHaveBeenCalled();
    });
  });

  describe('scopeChangeWithTesla', () => {
    it('should return a scope change URL without parameters', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?prompt_missing_scopes=true&state=test-state';
      const mockState = 'test-state';

      mockAuthService.generateScopeChangeUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.scopeChangeWithTesla(undefined, undefined);

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to grant additional permissions to SentryGuard');
      expect(authService.generateScopeChangeUrl).toHaveBeenCalledWith('en', undefined);
    });

    it('should return a scope change URL with missing scopes', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?prompt_missing_scopes=true&state=test-state';
      const mockState = 'test-state';
      const missingScopes = 'vehicle_device_data,offline_access';

      mockAuthService.generateScopeChangeUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.scopeChangeWithTesla(undefined, missingScopes);

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to grant additional permissions to SentryGuard');
      expect(authService.generateScopeChangeUrl).toHaveBeenCalledWith('en', ['vehicle_device_data', 'offline_access']);
    });


  });

  describe('getUserStatus', () => {
    it('should return the status for an authenticated user', async () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2025-12-31'),
        created_at: new Date('2025-01-01'),
        has_profile: true,
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: new Date('2025-12-31'),
        expires_at: new Date('2025-12-31'),
        created_at: new Date('2025-01-01'),
        email: 'test@example.com',
      };

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(true);
      expect(result.expires_at).toEqual(mockUser.expires_at);
      expect(result.has_profile).toBe(true);
      expect(result.message).toBe('Valid JWT token');
    });

    it('should return unauthenticated for a user without a token', async () => {
      mockAuthService.getTokenInfo.mockReturnValue({
        exists: false,
      });

      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: null,
      };

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('JWT token expired, please re-authenticate');
    });

    it('should detect an expired token', async () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2020-01-01'), // Past date
        created_at: new Date('2020-01-01'),
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: new Date('2025-01-01'), // Past date
      };

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('JWT token expired, please re-authenticate');
    });
  });

  describe('getUserProfile', () => {
    it('should return the user profile', async () => {
      const mockProfile = {
        email: 'test@tesla.com',
        full_name: 'Test User',
      };

      mockAuthService.getUserProfile.mockReturnValue(mockProfile);

      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
      };

      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('test-user-id');
      expect(result.profile.email).toBe('test@example.com');
    });

    it('should handle profile with missing email', async () => {
      const mockUser = {
        userId: 'test-user-id',
      };

      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('test-user-id');
      expect(result.profile.email).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return service statistics', async () => {
      const mockStats = {
        activeUsers: 5,
        pendingStates: 2,
      };

      mockAuthService.getStats.mockReturnValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(authService.getStats).toHaveBeenCalled();
    });
  });
});
