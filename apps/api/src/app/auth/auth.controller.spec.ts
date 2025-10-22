import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    generateLoginUrl: jest.fn(),
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
      const mockUrl = 'https://auth.tesla.com/oauth2/v3/authorize?state=test-state';
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

  describe('getUserStatus', () => {
    it('should return the status for an authenticated user', () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2025-12-31'),
        created_at: new Date('2025-01-01'),
        has_profile: true,
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(true);
      expect(result.expires_at).toEqual(mockTokenInfo.expires_at);
      expect(result.has_profile).toBe(true);
      expect(result.message).toBe('Valid token');
      expect(authService.getTokenInfo).toHaveBeenCalledWith('test-user-id');
    });

    it('should return unauthenticated for a user without a token', () => {
      mockAuthService.getTokenInfo.mockReturnValue({
        exists: false,
      });

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('No token found for this user');
    });

    it('should detect an expired token', () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2020-01-01'), // Past date
        created_at: new Date('2020-01-01'),
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('Token expired, please re-authenticate');
    });
  });

  describe('getUserProfile', () => {
    it('should return the user profile', () => {
      const mockProfile = {
        email: 'test@tesla.com',
        full_name: 'Test User',
      };

      mockAuthService.getUserProfile.mockReturnValue(mockProfile);

      const result = controller.getUserProfile('test-user-id');

      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
      expect(authService.getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle profile not found', () => {
      mockAuthService.getUserProfile.mockReturnValue(null);

      const result = controller.getUserProfile('test-user-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile not found or token expired');
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const mockStats = {
        activeUsers: 5,
        pendingStates: 2,
      };

      mockAuthService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result).toEqual(mockStats);
      expect(authService.getStats).toHaveBeenCalled();
    });
  });
});

