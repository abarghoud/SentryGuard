import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistEmailSchedulerService } from './waitlist-email-scheduler.service';
import { WaitlistService } from './waitlist.service';
import { DistributedLockService } from '../../../common/services/distributed-lock.service';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';
import { SchedulerLockKey } from '../../../config/scheduler-lock-key.config';

const mockWaitlistService = {
  findApprovedUsersForEmailSending: jest.fn(),
  sendWelcomeEmailAndMarkSent: jest.fn(),
};

const mockDistributedLockService = {
  withLock: jest.fn(),
};

describe('The WaitlistEmailSchedulerService class', () => {
  let service: WaitlistEmailSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistEmailSchedulerService,
        {
          provide: WaitlistService,
          useValue: mockWaitlistService,
        },
        {
          provide: DistributedLockService,
          useValue: mockDistributedLockService,
        },
      ],
    }).compile();

    service = module.get<WaitlistEmailSchedulerService>(
      WaitlistEmailSchedulerService
    );

    jest.clearAllMocks();

    mockDistributedLockService.withLock.mockImplementation(
      async (_key: number, task: () => Promise<void>) => {
        await task();
        return true;
      }
    );
  });

  describe('The processApprovedUsers() method', () => {
    describe('When there are no approved users', () => {
      beforeEach(async () => {
        mockWaitlistService.findApprovedUsersForEmailSending.mockResolvedValue([]);

        await service.processApprovedUsers();
      });

      it('should find approved users for email sending', () => {
        expect(
          mockWaitlistService.findApprovedUsersForEmailSending
        ).toHaveBeenCalled();
      });

      it('should not send any emails', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).not.toHaveBeenCalled();
      });
    });

    describe('When there are approved users', () => {
      let mockUsers: Waitlist[];

      beforeEach(async () => {
        mockUsers = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            fullName: 'User One',
            preferredLanguage: 'en',
            status: WaitlistStatus.Approved,
          } as Waitlist,
          {
            id: 'user-2',
            email: 'user2@example.com',
            fullName: 'User Two',
            preferredLanguage: 'fr',
            status: WaitlistStatus.Approved,
          } as Waitlist,
        ];

        mockWaitlistService.findApprovedUsersForEmailSending.mockResolvedValue(
          mockUsers
        );
        mockWaitlistService.sendWelcomeEmailAndMarkSent.mockResolvedValue(
          undefined
        );

        await service.processApprovedUsers();
      });

      it('should send email for each user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledTimes(2);
      });

      it('should send email for first user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[0]);
      });

      it('should send email for second user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[1]);
      });

    });

    describe('When email sending fails for one user', () => {
      let mockUsers: Waitlist[];
      const expectedError = 'Email service unavailable';

      beforeEach(async () => {
        mockUsers = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            fullName: 'User One',
            preferredLanguage: 'en',
            status: WaitlistStatus.Approved,
          } as Waitlist,
          {
            id: 'user-2',
            email: 'user2@example.com',
            fullName: 'User Two',
            preferredLanguage: 'fr',
            status: WaitlistStatus.Approved,
          } as Waitlist,
          {
            id: 'user-3',
            email: 'user3@example.com',
            fullName: 'User Three',
            preferredLanguage: 'de',
            status: WaitlistStatus.Approved,
          } as Waitlist,
        ];

        mockWaitlistService.findApprovedUsersForEmailSending.mockResolvedValue(
          mockUsers
        );

        mockWaitlistService.sendWelcomeEmailAndMarkSent
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error(expectedError))
          .mockResolvedValueOnce(undefined);

        await service.processApprovedUsers();
      });

      it('should continue processing other users', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledTimes(3);
      });

      it('should send email for first user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenNthCalledWith(1, mockUsers[0]);
      });

      it('should attempt to send email for second user despite failure', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenNthCalledWith(2, mockUsers[1]);
      });

      it('should send email for third user after second fails', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenNthCalledWith(3, mockUsers[2]);
      });

    });

    describe('When the distributed lock is already held', () => {
      beforeEach(async () => {
        mockDistributedLockService.withLock.mockResolvedValue(false);

        await service.processApprovedUsers();
      });

      it('should not find approved users for email sending', () => {
        expect(
          mockWaitlistService.findApprovedUsersForEmailSending
        ).not.toHaveBeenCalled();
      });

      it('should not send any emails', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).not.toHaveBeenCalled();
      });
    });

    describe('When the distributed lock is available', () => {
      beforeEach(async () => {
        mockWaitlistService.findApprovedUsersForEmailSending.mockResolvedValue([]);

        await service.processApprovedUsers();
      });

      it('should acquire the lock before executing', () => {
        expect(mockDistributedLockService.withLock).toHaveBeenCalledWith(
          SchedulerLockKey.WaitlistEmail,
          expect.any(Function)
        );
      });
    });
  });
});
