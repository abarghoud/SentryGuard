import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenService } from './services/access-token.service';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { User } from '../../entities/user.entity';

describe('The AuthController class', () => {
  let controller: AuthController;

  const mockAuthService = {
    getRefreshableJwtUser: jest.fn(),
    refreshJwtSession: jest.fn(),
    validateJwtToken: jest.fn(),
    revokeJwtToken: jest.fn(),
  };

  const mockAccessTokenService = {
    getAccessTokenForUserId: jest.fn(),
    hasVehicleCommandsScope: jest.fn(),
  };

  const mockOAuthProvider = {
    generateLoginUrl: jest.fn(),
    generateScopeChangeUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AccessTokenService,
          useValue: mockAccessTokenService,
        },
        {
          provide: oauthProviderRequirementsSymbol,
          useValue: mockOAuthProvider,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  describe('The loginWithTesla() method', () => {
    it('should return a login URL', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?state=test-state';
      const mockState = 'test-state';

      mockOAuthProvider.generateLoginUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.loginWithTesla();

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to authenticate with Tesla');
      expect(mockOAuthProvider.generateLoginUrl).toHaveBeenCalledWith('en', undefined);
    });
  });

  describe('The scopeChangeWithTesla() method', () => {
    it('should return a scope change URL without parameters', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?prompt_missing_scopes=true&state=test-state';
      const mockState = 'test-state';

      mockOAuthProvider.generateScopeChangeUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.scopeChangeWithTesla(undefined, undefined);

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to grant additional permissions to SentryGuard');
      expect(mockOAuthProvider.generateScopeChangeUrl).toHaveBeenCalledWith('en', undefined, undefined);
    });

    it('should return a scope change URL with missing scopes', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?prompt_missing_scopes=true&state=test-state';
      const mockState = 'test-state';
      const missingScopes = 'vehicle_device_data,offline_access';

      mockOAuthProvider.generateScopeChangeUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.scopeChangeWithTesla(undefined, missingScopes);

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Use this URL to grant additional permissions to SentryGuard');
      expect(mockOAuthProvider.generateScopeChangeUrl).toHaveBeenCalledWith('en', ['vehicle_device_data', 'offline_access'], undefined);
    });

    it('should return a scope change URL with mobile redirect URI', () => {
      const mockUrl =
        'https://auth.tesla.com/oauth2/v3/authorize?prompt_missing_scopes=true&state=test-state';
      const mockState = 'test-state';
      const redirectUri = 'sentryguard://callback';

      mockOAuthProvider.generateScopeChangeUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.scopeChangeWithTesla(undefined, 'vehicle_cmds', redirectUri);

      expect(result.url).toBe(mockUrl);
      expect(mockOAuthProvider.generateScopeChangeUrl).toHaveBeenCalledWith('en', ['vehicle_cmds'], redirectUri);
    });
  });

  describe('The getAuthStatus() method', () => {
    it('should return the status for an authenticated user', async () => {
      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: new Date('2025-12-31'),
        expires_at: new Date('2025-12-31'),
        created_at: new Date('2025-01-01'),
        email: 'test@example.com',
      } as User;

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15'));

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(true);
      expect(result.expires_at).toEqual(mockUser.expires_at);
      expect(result.has_profile).toBe(true);
      expect(result.message).toBe('Valid JWT token');

      jest.useRealTimers();
    });

    it('should return unauthenticated for a user without a token', async () => {
      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: null,
      } as User;

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('JWT token expired, please re-authenticate');
    });

    it('should detect an expired token', async () => {
      const mockUser = {
        userId: 'test-user-id',
        jwt_expires_at: new Date('2025-01-01'),
      } as User;

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01'));

      const result = await controller.getAuthStatus(mockUser);

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('JWT token expired, please re-authenticate');

      jest.useRealTimers();
    });
  });

  describe('The getProfile() method', () => {
    it('should return the user profile', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
      } as User;

      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('test-user-id');
      expect(result.profile.email).toBe('test@example.com');
    });

    it('should handle profile with missing email', async () => {
      const mockUser = {
        userId: 'test-user-id',
      } as User;

      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('test-user-id');
      expect(result.profile.email).toBeUndefined();
    });
  });

  describe('The getVehicleCommandsAuthorization() method', () => {
    it('should return true when the user has authorization', async () => {
      const mockUser = {
        userId: 'test-user-id',
      } as User;

      mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(true);

      const result = await controller.getVehicleCommandsAuthorization(mockUser);

      expect(result.authorized).toBe(true);
      expect(mockAccessTokenService.hasVehicleCommandsScope).toHaveBeenCalledWith('test-user-id');
    });

    it('should return false when the user does not have authorization', async () => {
      const mockUser = {
        userId: 'test-user-id',
      } as User;

      mockAccessTokenService.hasVehicleCommandsScope.mockResolvedValue(false);

      const result = await controller.getVehicleCommandsAuthorization(mockUser);

      expect(result.authorized).toBe(false);
      expect(mockAccessTokenService.hasVehicleCommandsScope).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('The refreshSession() method', () => {
    it('should return a refreshed session', async () => {
      const mockUser = {
        userId: 'test-user-id',
      } as User;
      const jwtExpiresAt = new Date('2026-01-01');

      mockAuthService.getRefreshableJwtUser.mockResolvedValue(mockUser);
      mockAccessTokenService.getAccessTokenForUserId.mockResolvedValue('tesla-token');
      mockAuthService.refreshJwtSession.mockResolvedValue({
        jwt: 'new-jwt',
        jwt_expires_at: jwtExpiresAt,
      });

      const result = await controller.refreshSession('Bearer old-jwt');

      expect(result).toStrictEqual({
        success: true,
        userId: 'test-user-id',
        jwt: 'new-jwt',
        jwt_expires_at: jwtExpiresAt,
      });
    });

    it('should reject missing bearer tokens', async () => {
      await expect(controller.refreshSession()).rejects.toThrow('No Bearer token provided');
    });
  });
});
