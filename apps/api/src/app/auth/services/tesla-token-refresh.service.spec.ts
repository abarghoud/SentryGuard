import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, And, Or, MoreThan, LessThanOrEqual } from 'typeorm';
import {
  TeslaTokenRefreshService,
  RefreshResult,
} from './tesla-token-refresh.service';
import { User } from '../../../entities/user.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../common/utils/crypto.util');
import { encrypt, decrypt } from '../../../common/utils/crypto.util';
const mockedEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;
const mockedDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

const mockQueryBuilder = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn(),
};

const mockUserRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('The TeslaTokenRefreshService class', () => {
  let service: TeslaTokenRefreshService;

  const fakeUserId = 'user-123';
  const fakeDecryptedRefreshToken = 'decrypted-refresh-token';
  const fakeEncryptedAccessToken = 'encrypted-access-token';

  const fakeTeslaResponse = {
    data: {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeslaTokenRefreshService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<TeslaTokenRefreshService>(TeslaTokenRefreshService);

    jest.clearAllMocks();

    process.env.TESLA_CLIENT_ID = 'test-client-id';

    mockedDecrypt.mockReturnValue(fakeDecryptedRefreshToken);
    mockedEncrypt.mockReturnValue(fakeEncryptedAccessToken);
  });

  describe('The findUsersWithExpiringRefreshTokens() method', () => {
    describe('When there are users with expiring refresh tokens', () => {
      const fakeUsers = [{ userId: 'user-1' } as User];

      beforeEach(() => {
        mockUserRepository.find.mockResolvedValue(fakeUsers);
      });

      it('should return the matching users', async () => {
        const result = await service.findUsersWithExpiringRefreshTokens();

        expect(result).toStrictEqual(fakeUsers);
      });

      it('should select only userId', async () => {
        await service.findUsersWithExpiringRefreshTokens();

        expect(mockUserRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            select: ['userId'],
          })
        );
      });

      it('should filter out revoked users', async () => {
        await service.findUsersWithExpiringRefreshTokens();

        expect(mockUserRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              token_revoked_at: IsNull(),
            }),
          })
        );
      });
    });

    describe('When there are users with a null refresh_token_expires_at', () => {
      const fakeUsers = [{ userId: 'user-1' } as User];

      beforeEach(() => {
        mockUserRepository.find.mockResolvedValue(fakeUsers);
      });

      it('should include them to handle legacy users', async () => {
        await service.findUsersWithExpiringRefreshTokens();

        const callArgs = mockUserRepository.find.mock.calls[0][0];
        const refreshTokenCondition = callArgs.where.refresh_token_expires_at;

        expect(refreshTokenCondition).toEqual(
          Or(And(MoreThan(expect.any(Date)), LessThanOrEqual(expect.any(Date))), IsNull())
        );
      });
    });

    describe('When there are no users with expiring refresh tokens', () => {
      beforeEach(() => {
        mockUserRepository.find.mockResolvedValue([]);
      });

      it('should return an empty array', async () => {
        const result = await service.findUsersWithExpiringRefreshTokens();

        expect(result).toStrictEqual([]);
      });
    });
  });

  describe('The refreshTokenForUser() method', () => {
    describe('When user is not found', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });
    });

    describe('When user tokens are revoked', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: new Date(),
          refresh_token: 'encrypted-token',
        } as User);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return AuthenticationExpired', () => {
        expect(result).toBe(RefreshResult.AuthenticationExpired);
      });
    });

    describe('When refresh token is expired', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: pastDate,
        } as User);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return AuthenticationExpired', () => {
        expect(result).toBe(RefreshResult.AuthenticationExpired);
      });
    });

    describe('When refresh token decryption fails', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        mockedDecrypt.mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });
    });

    describe('When TESLA_CLIENT_ID is not defined', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        delete process.env.TESLA_CLIENT_ID;

        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });
    });

    describe('When Tesla returns 401', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        const axiosError = {
          response: { status: 401, data: { error: 'login_required' } },
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        mockUserRepository.update.mockResolvedValue({ affected: 1 });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return AuthenticationExpired', () => {
        expect(result).toBe(RefreshResult.AuthenticationExpired);
      });

      it('should invalidate user tokens including JWT data', () => {
        expect(mockUserRepository.update).toHaveBeenCalledWith(fakeUserId, {
          token_revoked_at: expect.any(Date),
          jwt_token: null,
          jwt_expires_at: null,
        });
      });
    });

    describe('When Tesla returns 400 invalid_grant', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        const axiosError = {
          response: { status: 400, data: { error: 'invalid_grant' } },
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        mockUserRepository.update.mockResolvedValue({ affected: 1 });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return AuthenticationExpired', () => {
        expect(result).toBe(RefreshResult.AuthenticationExpired);
      });
    });

    describe('When Tesla returns 400 without invalid_grant', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        const axiosError = {
          response: { status: 400, data: { error: 'bad_request' } },
        };
        mockedAxios.post.mockRejectedValue(axiosError);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });

      it('should not invalidate user tokens', () => {
        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('When Tesla returns 5xx error', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        const axiosError = {
          response: { status: 500, data: { error: 'server_error' } },
        };
        mockedAxios.post.mockRejectedValue(axiosError);

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });

      it('should not invalidate user tokens', () => {
        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('When a network error occurs', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        mockedAxios.post.mockRejectedValue(new Error('Network error'));

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return TransientFailure', () => {
        expect(result).toBe(RefreshResult.TransientFailure);
      });
    });

    describe('When refresh succeeds and persist succeeds', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        mockedAxios.post.mockResolvedValue(fakeTeslaResponse);
        mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return Success', () => {
        expect(result).toBe(RefreshResult.Success);
      });

      it('should call Tesla token endpoint', () => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
          expect.any(URLSearchParams),
          expect.objectContaining({
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
        );
      });

      it('should encrypt the new tokens', () => {
        expect(mockedEncrypt).toHaveBeenCalledWith('new-access-token');
        expect(mockedEncrypt).toHaveBeenCalledWith('new-refresh-token');
      });

      it('should use IS NULL condition for optimistic locking', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'refresh_token_updated_at IS NULL'
        );
      });
    });

    describe('When user has a previous refresh_token_updated_at', () => {
      let result: RefreshResult;
      const previousUpdatedAt = new Date('2025-01-01');

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: previousUpdatedAt,
        } as User);

        mockedAxios.post.mockResolvedValue(fakeTeslaResponse);
        mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return Success', () => {
        expect(result).toBe(RefreshResult.Success);
      });

      it('should use equality condition for optimistic locking', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'refresh_token_updated_at = :previousUpdatedAt',
          { previousUpdatedAt }
        );
      });
    });

    describe('When concurrent refresh is detected', () => {
      let result: RefreshResult;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          token_revoked_at: undefined,
          refresh_token: 'encrypted-token',
          refresh_token_expires_at: null,
          refresh_token_updated_at: null,
        } as User);

        mockedAxios.post.mockResolvedValue(fakeTeslaResponse);
        mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

        result = await service.refreshTokenForUser(fakeUserId);
      });

      it('should return AlreadyRefreshed', () => {
        expect(result).toBe(RefreshResult.AlreadyRefreshed);
      });
    });
  });
});
