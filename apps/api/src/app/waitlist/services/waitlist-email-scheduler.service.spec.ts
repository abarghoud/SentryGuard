import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistEmailSchedulerService } from './waitlist-email-scheduler.service';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';

const mockWaitlistService = {
  getApprovedUsersWithoutWelcomeEmail: jest.fn(),
  sendWelcomeEmailAndMarkSent: jest.fn(),
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
        mockWaitlistService.getApprovedUsersWithoutWelcomeEmail.mockResolvedValue(
          []
        );

        await service.processApprovedUsers();
      });

      it('should fetch approved users without welcome email', () => {
        expect(
          mockWaitlistService.getApprovedUsersWithoutWelcomeEmail
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

        mockWaitlistService.getApprovedUsersWithoutWelcomeEmail.mockResolvedValue(
          mockUsers
        );
        mockWaitlistService.sendWelcomeEmailAndMarkSent.mockResolvedValue(
          undefined
        );

        await service.processApprovedUsers();
      });

      it('should send welcome email to each user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledTimes(2);
      });

      it('should send email to first user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[0]);
      });

      it('should send email to second user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[1]);
      });
    });

    describe('When email sending fails for one user', () => {
      let mockUsers: Waitlist[];

      beforeEach(async () => {
        mockUsers = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            status: WaitlistStatus.Approved,
          } as Waitlist,
          {
            id: 'user-2',
            email: 'user2@example.com',
            status: WaitlistStatus.Approved,
          } as Waitlist,
          {
            id: 'user-3',
            email: 'user3@example.com',
            status: WaitlistStatus.Approved,
          } as Waitlist,
        ];

        mockWaitlistService.getApprovedUsersWithoutWelcomeEmail.mockResolvedValue(
          mockUsers
        );

        mockWaitlistService.sendWelcomeEmailAndMarkSent
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Email failed'))
          .mockResolvedValueOnce(undefined);

        await service.processApprovedUsers();
      });

      it('should continue processing other users', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledTimes(3);
      });

      it('should process first user', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[0]);
      });

      it('should process second user despite failure', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[1]);
      });

      it('should process third user after second fails', () => {
        expect(
          mockWaitlistService.sendWelcomeEmailAndMarkSent
        ).toHaveBeenCalledWith(mockUsers[2]);
      });
    });
  });
});
