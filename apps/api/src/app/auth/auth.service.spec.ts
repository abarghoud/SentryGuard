import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { OAuthProviderRequirements, oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';
import { mock, MockProxy } from 'jest-mock-extended';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';

describe('The AuthService class', () => {
  let service: AuthService;
  let mockOAuthProvider: MockProxy<OAuthProviderRequirements>;
  let mockUserRegistrationService: MockProxy<UserRegistrationService>;

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    mockOAuthProvider = mock<OAuthProviderRequirements>();
    mockUserRegistrationService = mock<UserRegistrationService>();

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
  });

  describe('The exchangeCodeForTokens() method', () => {
    describe('When the state is invalid', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockRejectedValue(
          new UnauthorizedException('Invalid or expired state')
        );
      });

      it('should throw UnauthorizedException', async () => {
        await expect(
          service.exchangeCodeForTokens('test-code', 'invalid-state')
        ).rejects.toThrow(UnauthorizedException);
      });
    });

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

      const fakeUserId = 'user-123';

      let result: { jwt: string; userId: string };

      beforeEach(async () => {
        mockOAuthProvider.authenticateWithCode.mockResolvedValue({
          tokens: fakeTokens,
          profile: fakeProfile,
          userLocale: 'en',
        });
        mockUserRegistrationService.createOrUpdateUser.mockResolvedValue(
          fakeUserId
        );
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          jwt_token: 'the-jwt',
        } as User);

        result = await service.exchangeCodeForTokens(
          'test-code',
          'valid-state'
        );
      });

      it('should return the JWT token', () => {
        expect(result.jwt).toBe('the-jwt');
      });

      it('should return the user ID', () => {
        expect(result.userId).toBe(fakeUserId);
      });

      it('should call OAuthProvider to authenticate with code and state', () => {
        expect(
          mockOAuthProvider.authenticateWithCode
        ).toHaveBeenCalledWith('test-code', 'valid-state');
      });

      it('should call UserRegistrationService to create/update user', () => {
        expect(
          mockUserRegistrationService.createOrUpdateUser
        ).toHaveBeenCalledWith(fakeTokens, fakeProfile, 'en');
      });
    });

    describe('When OAuthProvider throws MissingPermissionsException', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockRejectedValue(
          new MissingPermissionsException(['vehicle_device_data'])
        );
      });

      it('should rethrow MissingPermissionsException', async () => {
        await expect(
          service.exchangeCodeForTokens('test-code', 'valid-state')
        ).rejects.toThrow(MissingPermissionsException);
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
        await expect(
          service.exchangeCodeForTokens('test-code', 'valid-state')
        ).rejects.toThrow(UserNotApprovedException);
      });
    });

    describe('When an unexpected error occurs', () => {
      beforeEach(() => {
        mockOAuthProvider.authenticateWithCode.mockRejectedValue(
          new Error('Network error')
        );
      });

      it('should throw UnauthorizedException', async () => {
        await expect(
          service.exchangeCodeForTokens('test-code', 'valid-state')
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('The validateJwtToken() method', () => {
    describe('When the JWT is valid and matches the user', () => {
      const fakeUser = {
        userId: 'user-123',
        jwt_token: 'valid-jwt',
        jwt_expires_at: new Date(Date.now() + 3600000),
      } as User;

      let result: User | null;

      beforeEach(async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
        mockUserRepository.findOne.mockResolvedValue(fakeUser);

        result = await service.validateJwtToken('valid-jwt');
      });

      it('should return the user', () => {
        expect(result).toBe(fakeUser);
      });
    });

    describe('When the JWT does not match the stored token', () => {
      let result: User | null;

      beforeEach(async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
        mockUserRepository.findOne.mockResolvedValue({
          userId: 'user-123',
          jwt_token: 'different-jwt',
          jwt_expires_at: new Date(Date.now() + 3600000),
        } as User);

        result = await service.validateJwtToken('wrong-jwt');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });

    describe('When the JWT is expired in the database', () => {
      let result: User | null;

      beforeEach(async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
        mockUserRepository.findOne.mockResolvedValue({
          userId: 'user-123',
          jwt_token: 'valid-jwt',
          jwt_expires_at: new Date(Date.now() - 3600000),
        } as User);

        result = await service.validateJwtToken('valid-jwt');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });

    describe('When verification throws', () => {
      let result: User | null;

      beforeEach(async () => {
        mockJwtService.verifyAsync.mockRejectedValue(new Error('bad jwt'));

        result = await service.validateJwtToken('bad-jwt');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('The invalidateUserTokens() method', () => {
    describe('When the user exists', () => {
      const fakeUserId = 'test-user-id';
      const mockUser = {
        userId: fakeUserId,
        email: 'test@example.com',
        jwt_token: 'valid-jwt-token',
        jwt_expires_at: new Date(Date.now() + 3600000),
        token_revoked_at: null,
      } as unknown as User;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);

        await service.invalidateUserTokens(fakeUserId);
      });

      it('should set jwt_token to null', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_token: null,
          })
        );
      });

      it('should set jwt_expires_at to null', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_expires_at: null,
          })
        );
      });

      it('should set token_revoked_at to a Date', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            token_revoked_at: expect.any(Date),
          })
        );
      });
    });

    describe('When the user does not exist', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await service.invalidateUserTokens('non-existent-user');
      });

      it('should not call save', () => {
        expect(mockUserRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('The revokeJwtToken() method', () => {
    describe('When the user exists', () => {
      const fakeUserId = 'test-user-id';
      const mockUser = {
        userId: fakeUserId,
        jwt_token: 'valid-jwt',
        jwt_expires_at: new Date(),
      } as User;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);

        await service.revokeJwtToken(fakeUserId);
      });

      it('should clear the jwt_token', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            jwt_token: undefined,
            jwt_expires_at: undefined,
          })
        );
      });
    });

    describe('When the user does not exist', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await service.revokeJwtToken('non-existent-user');
      });

      it('should not call save', () => {
        expect(mockUserRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
