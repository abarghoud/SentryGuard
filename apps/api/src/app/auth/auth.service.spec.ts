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

describe('The AuthService class', () => {
  let service: AuthService;
  let mockOAuthProvider: MockProxy<OAuthProviderRequirements>;
  let mockUserRegistrationService: MockProxy<UserRegistrationService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockUserSessionRepository = {
    create: jest.fn((session) => session),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const mockQueryBuilder = {
    andWhere: jest.fn(),
    execute: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn(),
    whereInIds: jest.fn(),
  };
  const fakeUser = {
    userId: 'user-123',
    email: 'test@example.com',
    refresh_token: 'refresh-token',
    refresh_token_expires_at: new Date(Date.now() + 3600000),
    token_revoked_at: null,
  } as User;

  beforeEach(async () => {
    mockOAuthProvider = mock<OAuthProviderRequirements>();
    mockUserRegistrationService = mock<UserRegistrationService>();
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.whereInIds.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.execute.mockResolvedValue(undefined);
    mockUserSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockUserSessionRepository,
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(fakeUser);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
    mockUserSessionRepository.find.mockResolvedValue([]);
    mockUserSessionRepository.findOne.mockResolvedValue(null);
    mockUserSessionRepository.save.mockImplementation((session) => Promise.resolve(session));
    mockJwtService.signAsync.mockResolvedValue('signed-jwt');
    mockJwtService.verifyAsync.mockResolvedValue({ sub: fakeUser.userId });
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
        expect(mockUserSessionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_hash: expect.not.stringContaining('signed-jwt'),
            userId: fakeUser.userId,
          })
        );
      });

      it('should enforce the active session limit', () => {
        expect(mockUserSessionRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            order: { created_at: 'DESC' },
          })
        );
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
        mockUserSessionRepository.findOne.mockResolvedValue({
          expires_at: new Date(Date.now() + 3600000),
          revoked_at: null,
          user: fakeUser,
        });
        result = await service.validateJwtToken('valid-jwt');
      });

      it('should return the session user', () => {
        expect(result).toBe(fakeUser);
      });
    });

    describe('When the session is missing', () => {
      let result: User | null;

      beforeEach(async () => {
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
        mockUserSessionRepository.findOne.mockResolvedValue({
          revoked_at: null,
          user: fakeUser,
        });
        result = await service.getRefreshableJwtUser('expired-jwt');
      });

      it('should return the user', () => {
        expect(result).toBe(fakeUser);
      });
    });

    describe('When the refresh token is expired', () => {
      let result: User | null;

      beforeEach(async () => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          revoked_at: null,
          user: {
            ...fakeUser,
            refresh_token_expires_at: new Date(Date.now() - 3600000),
          },
        });
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
        mockUserSessionRepository.findOne.mockResolvedValue(fakeSession);
        result = await service.refreshJwtSession(fakeUser.userId, 'old-jwt');
      });

      it('should return a refreshed JWT', () => {
        expect(result?.jwt).toBe('signed-jwt');
      });

      it('should update the session hash', () => {
        expect(mockUserSessionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_hash: expect.not.stringContaining('signed-jwt'),
          })
        );
      });
    });
  });

  describe('The revokeJwtToken() method', () => {
    describe('When a current session token is provided', () => {
      const fakeSession = {
        userId: fakeUser.userId,
        revoked_at: null,
      } as UserSession;

      beforeEach(async () => {
        mockUserSessionRepository.findOne.mockResolvedValue(fakeSession);
        await service.revokeJwtToken(fakeUser.userId, 'current-jwt');
      });

      it('should revoke only the current session', () => {
        expect(mockUserSessionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            revoked_at: expect.any(Date),
          })
        );
      });
    });

    describe('When no session token is provided', () => {
      beforeEach(async () => {
        await service.revokeJwtToken(fakeUser.userId);
      });

      it('should revoke every active session for the user', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('"revoked_at" IS NULL');
      });
    });
  });

  describe('The invalidateUserTokens() method', () => {
    describe('When the user exists', () => {
      beforeEach(async () => {
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
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('"revoked_at" IS NULL');
      });
    });
  });
});
