import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    generateLoginUrl: jest.fn(),
    getTokenInfo: jest.fn(),
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
    it('devrait retourner une URL de connexion', () => {
      const mockUrl = 'https://auth.tesla.com/oauth2/v3/authorize?state=test-state';
      const mockState = 'test-state';

      mockAuthService.generateLoginUrl.mockReturnValue({
        url: mockUrl,
        state: mockState,
      });

      const result = controller.loginWithTesla();

      expect(result.url).toBe(mockUrl);
      expect(result.state).toBe(mockState);
      expect(result.message).toBe('Utilisez cette URL pour vous authentifier avec Tesla');
      expect(authService.generateLoginUrl).toHaveBeenCalled();
    });
  });

  describe('getUserStatus', () => {
    it('devrait retourner le statut pour un utilisateur authentifié', () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2025-12-31'),
        created_at: new Date('2025-01-01'),
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(true);
      expect(result.expires_at).toEqual(mockTokenInfo.expires_at);
      expect(result.message).toBe('Token valide');
      expect(authService.getTokenInfo).toHaveBeenCalledWith('test-user-id');
    });

    it('devrait retourner non authentifié pour un utilisateur sans token', () => {
      mockAuthService.getTokenInfo.mockReturnValue({
        exists: false,
      });

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('Aucun token trouvé pour cet utilisateur');
    });

    it('devrait détecter un token expiré', () => {
      const mockTokenInfo = {
        exists: true,
        expires_at: new Date('2020-01-01'), // Date passée
        created_at: new Date('2020-01-01'),
      };

      mockAuthService.getTokenInfo.mockReturnValue(mockTokenInfo);

      const result = controller.getUserStatus('test-user-id');

      expect(result.authenticated).toBe(false);
      expect(result.message).toBe('Token expiré, veuillez vous réauthentifier');
    });
  });

  describe('getStats', () => {
    it('devrait retourner les statistiques du service', () => {
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

