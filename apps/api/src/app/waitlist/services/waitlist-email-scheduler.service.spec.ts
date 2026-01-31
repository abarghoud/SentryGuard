import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistEmailSchedulerService } from './waitlist-email-scheduler.service';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';

const mockWaitlistService = {
  claimUsersForEmailScheduling: jest.fn(),
  sendWelcomeEmailAndMarkSent: jest.fn(),
  resetEmailQueuedAt: jest.fn(),
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
      ],
    }).compile();

    service = module.get<WaitlistEmailSchedulerService>(
      WaitlistEmailSchedulerService
    );

    jest.clearAllMocks();
  });

  describe('The processApprovedUsers() method', () => {
    describe('When there are no approved users', () => {
      beforeEach(async () => {
        mockWaitlistService.claimUsersForEmailScheduling.mockResolvedValue([]);

        await service.processApprovedUsers();
      });

      it('should claim users for email scheduling', () => {
        expect(
          mockWaitlistService.claimUsersForEmailScheduling
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

        mockWaitlistService.claimUsersForEmailScheduling.mockResolvedValue(
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

      it('should not reset emailQueuedAt for any user', () => {
        expect(mockWaitlistService.resetEmailQueuedAt).not.toHaveBeenCalled();
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

        mockWaitlistService.claimUsersForEmailScheduling.mockResolvedValue(
          mockUsers
        );

        mockWaitlistService.sendWelcomeEmailAndMarkSent
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error(expectedError))
          .mockResolvedValueOnce(undefined);

        mockWaitlistService.resetEmailQueuedAt.mockResolvedValue(undefined);

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

      it('should reset emailQueuedAt for failed user', () => {
        expect(mockWaitlistService.resetEmailQueuedAt).toHaveBeenCalledWith(
          'user-2'
        );
      });

      it('should not reset emailQueuedAt for successful users', () => {
        expect(mockWaitlistService.resetEmailQueuedAt).toHaveBeenCalledTimes(
          1
        );
      });
    });
  });
});