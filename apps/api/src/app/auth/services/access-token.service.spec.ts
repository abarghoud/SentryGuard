import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccessTokenService } from './access-token.service';
import { User } from '../../../entities/user.entity';
import {
  TeslaTokenRefreshService,
  RefreshResult,
} from './tesla-token-refresh.service';
import { mock, MockProxy } from 'jest-mock-extended';

jest.mock('../../../common/utils/crypto.util');
import { decrypt } from '../../../common/utils/crypto.util';
const mockedDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

describe('The AccessTokenService class', () => {
  let service: AccessTokenService;
  let mockTeslaTokenRefreshService: MockProxy<TeslaTokenRefreshService>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    mockTeslaTokenRefreshService = mock<TeslaTokenRefreshService>();
    mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
      RefreshResult.Success
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TeslaTokenRefreshService,
          useValue: mockTeslaTokenRefreshService,
        },
      ],
    }).compile();

    service = module.get<AccessTokenService>(AccessTokenService);

    jest.clearAllMocks();
    mockedDecrypt.mockClear();
    mockUserRepository.findOne.mockResolvedValue(null);
  });

  describe('The getAccessTokenForUserId() method', () => {
    describe('When the user exists and token is valid', () => {
      const fakeUserId = 'user-123';
      const fakeDecryptedToken = 'decrypted-access-token';
      let result: string | null;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          access_token: 'encrypted-token',
          expires_at: new Date(Date.now() + 3600000),
        } as User);
        mockedDecrypt.mockReturnValue(fakeDecryptedToken);

        result = await service.getAccessTokenForUserId(fakeUserId);
      });

      it('should return the decrypted access token', () => {
        expect(result).toBe(fakeDecryptedToken);
      });
    });

    describe('When the user does not exist', () => {
      let result: string | null;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        result = await service.getAccessTokenForUserId('unknown-user-id');
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });

    describe('When the token is expired and refresh succeeds', () => {
      const fakeUserId = 'expired-user-id';
      const fakeDecryptedToken = 'decrypted-new-token';
      let result: string | null;

      beforeEach(async () => {
        const expiredUser = {
          userId: fakeUserId,
          access_token: 'encrypted-expired-token',
          expires_at: new Date(Date.now() - 3600000),
        } as User;

        const refreshedUser = {
          userId: fakeUserId,
          access_token: 'encrypted-new-token',
          expires_at: new Date(Date.now() + 3600000),
        } as User;

        mockUserRepository.findOne
          .mockResolvedValueOnce(expiredUser)
          .mockResolvedValueOnce(refreshedUser);

        mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
          RefreshResult.Success
        );
        mockedDecrypt.mockReturnValue(fakeDecryptedToken);

        result = await service.getAccessTokenForUserId(fakeUserId);
      });

      it('should return the refreshed decrypted token', () => {
        expect(result).toBe(fakeDecryptedToken);
      });

      it('should call refresh service', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledWith(fakeUserId);
      });
    });

    describe('When the token is expired and refresh fails', () => {
      const fakeUserId = 'expired-user-id';
      let result: string | null;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          access_token: 'encrypted-expired-token',
          expires_at: new Date(Date.now() - 3600000),
        } as User);

        mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
          RefreshResult.AuthenticationExpired
        );

        result = await service.getAccessTokenForUserId(fakeUserId);
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });

    describe('When decryption fails', () => {
      const fakeUserId = 'user-with-bad-token';
      let result: string | null;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          access_token: 'corrupted-token',
          expires_at: new Date(Date.now() + 3600000),
        } as User);

        mockedDecrypt.mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        result = await service.getAccessTokenForUserId(fakeUserId);
      });

      it('should return null', () => {
        expect(result).toBeNull();
      });
    });
  });
});