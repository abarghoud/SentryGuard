import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    
    // Reset des variables d'environnement
    process.env.TESLA_CLIENT_ID = 'test-client-id';
    process.env.TESLA_CLIENT_SECRET = 'test-client-secret';
    process.env.TESLA_REDIRECT_URI = 'https://test.com/callback';
    process.env.TESLA_AUDIENCE = 'https://test-audience.com';

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Nettoyer l'intervalle pour éviter que Jest ne reste bloqué
    service.onModuleDestroy();
    jest.clearAllTimers();
  });

  describe('generateLoginUrl', () => {
    it('devrait générer une URL de connexion avec un state', () => {
      const result = service.generateLoginUrl();

      expect(result.url).toContain('https://auth.tesla.com/oauth2/v3/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=https%3A%2F%2Ftest.com%2Fcallback');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=openid');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.state).toHaveLength(64); // 32 bytes en hex = 64 caractères
    });

    it('devrait lever une erreur si TESLA_CLIENT_ID n\'est pas défini', () => {
      delete process.env.TESLA_CLIENT_ID;

      expect(() => service.generateLoginUrl()).toThrow('TESLA_CLIENT_ID non défini');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('devrait échanger un code valide contre des tokens', async () => {
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

    it('devrait rejeter avec un state invalide', async () => {
      await expect(
        service.exchangeCodeForTokens('test-code', 'invalid-state')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait rejeter si l\'API Tesla échoue', async () => {
      const { state } = service.generateLoginUrl();
      
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever une erreur si les credentials ne sont pas définis', async () => {
      const { state } = service.generateLoginUrl();
      delete process.env.TESLA_CLIENT_SECRET;

      await expect(
        service.exchangeCodeForTokens('test-code', state)
      ).rejects.toThrow('TESLA_CLIENT_ID ou TESLA_CLIENT_SECRET non définis');
    });
  });

  describe('getAccessToken', () => {
    it('devrait retourner le token d\'accès pour un utilisateur valide', async () => {
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

    it('devrait retourner null pour un utilisateur inconnu', () => {
      const token = service.getAccessToken('unknown-user-id');
      expect(token).toBeNull();
    });

    it('devrait retourner null et supprimer le token expiré', async () => {
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
      
      // Attendre un peu pour que le token expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const token = service.getAccessToken(userId);
      expect(token).toBeNull();
    });
  });

  describe('hasValidToken', () => {
    it('devrait retourner true pour un utilisateur avec un token valide', async () => {
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

    it('devrait retourner false pour un utilisateur sans token', () => {
      expect(service.hasValidToken('unknown-user-id')).toBe(false);
    });
  });

  describe('getTokenInfo', () => {
    it('devrait retourner les informations du token', async () => {
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

    it('devrait retourner exists: false pour un utilisateur inconnu', () => {
      const info = service.getTokenInfo('unknown-user-id');
      
      expect(info.exists).toBe(false);
      expect(info.expires_at).toBeUndefined();
      expect(info.created_at).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('devrait retourner les statistiques du service', async () => {
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

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      await service.exchangeCodeForTokens('test-code', state);
      
      stats = service.getStats();
      expect(stats.activeUsers).toBe(1);
      expect(stats.pendingStates).toBe(0); // State supprimé après validation
    });
  });
});

