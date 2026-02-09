import { Test, TestingModule } from '@nestjs/testing';
import { TeslaTokenRefreshSchedulerService } from './tesla-token-refresh-scheduler.service';
import {
  TeslaTokenRefreshService,
  RefreshResult,
} from './tesla-token-refresh.service';
import { DistributedLockService } from '../../../common/services/distributed-lock.service';
import { User } from '../../../entities/user.entity';

const mockTeslaTokenRefreshService = {
  findUsersWithExpiringRefreshTokens: jest.fn(),
  refreshTokenForUser: jest.fn(),
};

const mockDistributedLockService = {
  withLock: jest.fn(),
};

describe('The TeslaTokenRefreshSchedulerService class', () => {
  let service: TeslaTokenRefreshSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeslaTokenRefreshSchedulerService,
        {
          provide: TeslaTokenRefreshService,
          useValue: mockTeslaTokenRefreshService,
        },
        {
          provide: DistributedLockService,
          useValue: mockDistributedLockService,
        },
      ],
    }).compile();

    service = module.get<TeslaTokenRefreshSchedulerService>(
      TeslaTokenRefreshSchedulerService
    );

    jest.clearAllMocks();

    mockDistributedLockService.withLock.mockImplementation(
      async (_key: number, task: () => Promise<void>) => {
        await task();
        return true;
      }
    );
  });

  describe('The refreshExpiringTokens() method', () => {
    describe('When there are no users with expiring tokens', () => {
      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue([]);

        await service.refreshExpiringTokens();
      });

      it('should query for users with expiring tokens', () => {
        expect(
          mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens
        ).toHaveBeenCalled();
      });

      it('should not attempt any token refresh', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).not.toHaveBeenCalled();
      });
    });

    describe('When there are users with expiring tokens', () => {
      const fakeUsers = [
        { userId: 'user-1' } as User,
        { userId: 'user-2' } as User,
      ];

      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue(fakeUsers);
        mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
          RefreshResult.Success
        );

        await service.refreshExpiringTokens();
      });

      it('should refresh token for each user', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledTimes(2);
      });

      it('should refresh first user', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledWith('user-1');
      });

      it('should refresh second user', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledWith('user-2');
      });
    });

    describe('When one user refresh fails', () => {
      const fakeUsers = [
        { userId: 'user-1' } as User,
        { userId: 'user-2' } as User,
        { userId: 'user-3' } as User,
      ];

      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue(fakeUsers);

        mockTeslaTokenRefreshService.refreshTokenForUser
          .mockResolvedValueOnce(RefreshResult.Success)
          .mockResolvedValueOnce(RefreshResult.TransientFailure)
          .mockResolvedValueOnce(RefreshResult.Success);

        await service.refreshExpiringTokens();
      });

      it('should continue processing remaining users', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledTimes(3);
      });

      it('should still process third user after second fails', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenNthCalledWith(3, 'user-3');
      });
    });

    describe('When refreshTokenForUser throws an unexpected error', () => {
      const fakeUsers = [
        { userId: 'user-1' } as User,
        { userId: 'user-2' } as User,
      ];

      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue(fakeUsers);

        mockTeslaTokenRefreshService.refreshTokenForUser
          .mockRejectedValueOnce(new Error('Unexpected error'))
          .mockResolvedValueOnce(RefreshResult.Success);

        await service.refreshExpiringTokens();
      });

      it('should continue processing after unexpected error', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledTimes(2);
      });

      it('should still process second user', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenNthCalledWith(2, 'user-2');
      });
    });

    describe('When user has AuthenticationExpired result', () => {
      const fakeUsers = [{ userId: 'user-1' } as User];

      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue(fakeUsers);
        mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
          RefreshResult.AuthenticationExpired
        );

        await service.refreshExpiringTokens();
      });

      it('should count as skipped', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledWith('user-1');
      });
    });

    describe('When user has AlreadyRefreshed result', () => {
      const fakeUsers = [{ userId: 'user-1' } as User];

      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue(fakeUsers);
        mockTeslaTokenRefreshService.refreshTokenForUser.mockResolvedValue(
          RefreshResult.AlreadyRefreshed
        );

        await service.refreshExpiringTokens();
      });

      it('should count as skipped', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).toHaveBeenCalledWith('user-1');
      });
    });

    describe('When the distributed lock is already held', () => {
      beforeEach(async () => {
        mockDistributedLockService.withLock.mockResolvedValue(false);

        await service.refreshExpiringTokens();
      });

      it('should not query for users with expiring tokens', () => {
        expect(
          mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens
        ).not.toHaveBeenCalled();
      });

      it('should not attempt any token refresh', () => {
        expect(
          mockTeslaTokenRefreshService.refreshTokenForUser
        ).not.toHaveBeenCalled();
      });
    });

    describe('When the distributed lock is available', () => {
      beforeEach(async () => {
        mockTeslaTokenRefreshService.findUsersWithExpiringRefreshTokens.mockResolvedValue([]);

        await service.refreshExpiringTokens();
      });

      it('should acquire the lock before executing', () => {
        expect(mockDistributedLockService.withLock).toHaveBeenCalledWith(
          100001,
          expect.any(Function)
        );
      });
    });
  });
});
