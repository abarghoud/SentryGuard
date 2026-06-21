import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';
import { AuthService } from './auth.service';
import { OAuthProviderRequirements, oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';
import { UserSessionService } from './services/user-session.service';
import { MailingService } from '../mailing/services/mailing.service';

describe('The AuthService class', () => {
  let service: AuthService;
  let mockOAuthProvider: MockProxy<OAuthProviderRequirements>;
  let mockUserRegistrationService: MockProxy<UserRegistrationService>;
  let mockUserSessionService: MockProxy<UserSessionService>;
  let mockMailingService: MockProxy<MailingService>;
  const originalEnv = process.env;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const fakeUser = {
    userId: 'user-123',
    email: 'test@example.com',
    refresh_token: 'refresh-token',
    refresh_token_expires_at: new Date(Date.now() + 3600000),
    token_revoked_at: null,
    preferred_language: 'en',
  } as User;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      ZEPTOMAIL_TEMPLATE_TOKEN_REVOKED_EN: 'token-revoked-en-template',
      WEBAPP_URL: 'https://sentryguard.test',
    };

    mockOAuthProvider = mock<OAuthProviderRequirements>();
    mockUserRegistrationService = mock<UserRegistrationService>();
    mockUserSessionService = mock<UserSessionService>();
    mockMailingService = mock<MailingService>();
    mockMailingService.sendTeslaDisconnectedEmail.mockResolvedValue(undefined);

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
          provide: oauthProviderRequirementsSymbol,
          useValue: mockOAuthProvider,
        },
        {
          provide: UserRegistrationService,
          useValue: mockUserRegistrationService,
        },
        {
          provide: UserSessionService,
          useValue: mockUserSessionService,
        },
        {
          provide: MailingService,
          useValue: mockMailingService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(fakeUser);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
    mockJwtService.signAsync.mockResolvedValue('signed-jwt');
    mockJwtService.verifyAsync.mockResolvedValue({ sub: fakeUser.userId });
    mockUserSessionService.createSession.mockResolvedValue({} as any);
    mockUserSessionService.findSession.mockResolvedValue(null);
    mockUserSessionService.validateSession.mockResolvedValue(null);
    mockUserSessionService.touchSession.mockResolvedValue(undefined);
    mockUserSessionService.revokeSession.mockResolvedValue(undefined);
    mockUserSessionService.revokeAllSessions.mockResolvedValue(undefined);
    mockUserSessionService.enforceSessionLimits.mockResolvedValue(undefined);
    mockUserSessionService.hashJwt.mockImplementation((jwt) => `hashed-${jwt}`);
    mockUserSessionService.updateSession.mockImplementation((session) => Promise.resolve(session));
  });

  describe('The exchangeCodeForTokens() method', () => {
    describe('When the full flow succeeds', () => {
      const fakeTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expiresAt: new Date(Date.now() + 3600000),
      };
      const fakeProfile = {
        email: 'test@tesla.com',
        full_name: 'Test User',
      };
      let result: { jwt: string; userId: string };

      beforeEach(async () => {
        mockOAuthProvider.authenticateWithCode.mockResolvedValue({
          tokens: fakeTokens,
          profile: fakeProfile,
          userLocale: 'en',
        });
        mockUserRegistrationService.createOrUpdateUser.mockResolvedValue(fakeUser.userId);
        result = await service.exchangeCodeForTokens('test-code', 'valid-state');
      });

      it('should return the generated JWT token', () => {
        expect(result.jwt).toBe('signed-jwt');
      });

      it('should store the hashed JWT in a session', () => {
        expect(mockUserSessionService.createSession).toHaveBeenCalledWith(
          fakeUser.userId,
          'signed-jwt',
          expect.any(Date)
        );
      });

      it('should enforce the active session limit', () => {
        expect(mockUserSessionService.enforceSessionLimits).toHaveBeenCalledWith(fakeUser.userId);
      });
    });

    describe('When the state is invalid', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockRejectedValue(
          new UnauthorizedException('Invalid or expired state')
        );
      });

      it('should throw UnauthorizedException', async () => {
        await expect(service.exchangeCodeForTokens('test-code', 'invalid-state')).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('When OAuthProvider throws MissingPermissionsException', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockRejectedValue(
          new MissingPermissionsException(['vehicle_device_data'])
        );
      });

      it('should rethrow MissingPermissionsException', async () => {
        await expect(service.exchangeCodeForTokens('test-code', 'valid-state')).rejects.toThrow(MissingPermissionsException);
      });
    });

    describe('When UserRegistrationService throws UserNotApprovedException', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockResolvedValue({
          tokens: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            expiresAt: new Date(),
          },
          profile: { email: 'test@tesla.com' },
          userLocale: 'en',
        });
        mockUserRegistrationService.createOrUpdateUser.mockRejectedValue(
          new UserNotApprovedException('test@tesla.com')
        );
      });

      it('should rethrow UserNotApprovedException', async () => {
        await expect(service.exchangeCodeForTokens('test-code', 'valid-state')).rejects.toThrow(UserNotApprovedException);
      });
    });
  });

  describe('The validateJwtToken() method', () => {
    describe('When the session is active', () => {
      let result: User | null;

      beforeEach(async () => {
        mockUserSessionService.validateSession.mockResolvedValue({
          expires_at: new Date(Date.now() + 3600000),
          revoked_at: null,
          user: fakeUser,
        } as any);
        result = await service.validateJwtToken('valid-jwt');
      });

      it('should return the session user', () => {
        expect(result).toBe(fakeUser);
      });
    });

    describe('When the session is missing', () => {
      let result: User | null;

      beforeEach(async () => {
        mockUserSessionService.validateSession.mockResolvedValue(null);
        result = await service.validateJwtToken('valid-jwt');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('The getRefreshableJwtUser() method', () => {
    describe('When the session is refreshable', () => {
      let result: User | null;

      beforeEach(async () => {
        mockUserSessionService.findSession.mockResolvedValue({
          revoked_at: null,
          user: fakeUser,
        } as any);
        result = await service.getRefreshableJwtUser('expired-jwt');
      });

      it('should return the user', () => {
        expect(result).toBe(fakeUser);
      });
    });

    describe('When the refresh token is expired', () => {
      let result: User | null;

      beforeEach(async () => {
        mockUserSessionService.findSession.mockResolvedValue({
          revoked_at: null,
          user: {
            ...fakeUser,
            refresh_token_expires_at: new Date(Date.now() - 3600000),
          },
        } as any);
        result = await service.getRefreshableJwtUser('expired-jwt');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('The refreshJwtSession() method', () => {
    describe('When the user has a refreshable session', () => {
      const fakeSession = {
        userId: fakeUser.userId,
        revoked_at: null,
        user: fakeUser,
      } as UserSession;
      let result: { jwt: string; jwt_expires_at: Date } | null;

      beforeEach(async () => {
        mockUserSessionService.findSession.mockResolvedValue(fakeSession);
        result = await service.refreshJwtSession(fakeUser.userId, 'old-jwt');
      });

      it('should return a refreshed JWT', () => {
        expect(result?.jwt).toBe('signed-jwt');
      });

      it('should update the session hash', () => {
        expect(mockUserSessionService.updateSession).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_hash: 'hashed-signed-jwt',
          })
        );
      });
    });
  });

  describe('The revokeJwtToken() method', () => {
    describe('When a current session token is provided', () => {
      beforeEach(async () => {
        await service.revokeJwtToken(fakeUser.userId, 'current-jwt');
      });

      it('should revoke only the current session', () => {
        expect(mockUserSessionService.revokeSession).toHaveBeenCalledWith(fakeUser.userId, 'current-jwt');
      });
    });

    describe('When no session token is provided', () => {
      beforeEach(async () => {
        await service.revokeJwtToken(fakeUser.userId);
      });

      it('should revoke every active session for the user', () => {
        expect(mockUserSessionService.revokeAllSessions).toHaveBeenCalledWith(fakeUser.userId);
      });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('The invalidateUserTokens() method', () => {
    describe('When the user exists', () => {
      beforeEach(async () => {
        mockMailingService.sendTeslaDisconnectedEmail.mockResolvedValue(undefined);
        await service.invalidateUserTokens(fakeUser.userId);
      });

      it('should set token_revoked_at to a Date', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            token_revoked_at: expect.any(Date),
          })
        );
      });

      it('should revoke every active session for the user', () => {
        expect(mockUserSessionService.revokeAllSessions).toHaveBeenCalledWith(fakeUser.userId);
      });

      it('should send connection lost email template', () => {
        expect(mockMailingService.sendTeslaDisconnectedEmail).toHaveBeenCalledWith(
          fakeUser.email,
          'en',
          {
            name: fakeUser.full_name || '',
          }
        );
      });
    });
  });
});
