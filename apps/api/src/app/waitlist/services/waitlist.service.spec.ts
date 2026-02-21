import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UpdateResult } from 'typeorm';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistStatus } from '../../../entities/waitlist.entity';
import {
  emailServiceRequirementsSymbol,
  EmailServiceRequirements,
} from '../interfaces/email-service.requirements';
import { waitlistEmailBatchSizeToken } from '../../../config/waitlist-cron.config';
import { EmailContentBuilderService } from './email-content-builder.service';
import { mock, MockProxy } from 'jest-mock-extended';

const mockWaitlistRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
};

describe('The WaitlistService class', () => {
  let service: WaitlistService;
  let mockEmailService: MockProxy<EmailServiceRequirements>;
  let mockEmailContentBuilder: MockProxy<EmailContentBuilderService>;
  let loggerLogSpy: jest.SpyInstance;
  const emailBatchSize = 20;

  beforeEach(async () => {
    mockEmailService = mock<EmailServiceRequirements>();
    mockEmailContentBuilder = mock<EmailContentBuilderService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: getRepositoryToken(Waitlist),
          useValue: mockWaitlistRepository,
        },
        {
          provide: emailServiceRequirementsSymbol,
          useValue: mockEmailService,
        },
        {
          provide: EmailContentBuilderService,
          useValue: mockEmailContentBuilder,
        },
        {
          provide: waitlistEmailBatchSizeToken,
          useValue: emailBatchSize,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
    loggerLogSpy = jest.spyOn(service['logger'], 'log');

    jest.clearAllMocks();
  });

  describe('The addToWaitlist() method', () => {
    const email = 'test@example.com';
    const fullName = 'Test User';
    const preferredLanguage = 'en';

    describe('When email does not exist in waitlist', () => {
      let mockEntry: Waitlist;

      beforeEach(async () => {
        mockEntry = {
          id: 'entry-id',
          email,
          fullName,
          preferredLanguage,
          status: WaitlistStatus.Pending,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Waitlist;

        mockWaitlistRepository.findOne.mockResolvedValue(null);
        mockWaitlistRepository.create.mockReturnValue(mockEntry);
        mockWaitlistRepository.save.mockResolvedValue(mockEntry);

        await service.addToWaitlist(email, fullName, preferredLanguage);
      });

      it('should check if email exists', () => {
        expect(mockWaitlistRepository.findOne).toHaveBeenCalledWith({
          where: { email },
        });
      });

      it('should create new entry with pending status', () => {
        expect(mockWaitlistRepository.create).toHaveBeenCalledWith({
          email,
          fullName,
          preferredLanguage,
          status: WaitlistStatus.Pending,
        });
      });

      it('should save the new entry', () => {
        expect(mockWaitlistRepository.save).toHaveBeenCalledWith(mockEntry);
      });
    });

    describe('When email already exists in waitlist', () => {
      let existingEntry: Waitlist;

      beforeEach(async () => {
        existingEntry = {
          id: 'existing-id',
          email,
          fullName: 'Existing User',
          preferredLanguage: 'fr',
          status: WaitlistStatus.Pending,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Waitlist;

        mockWaitlistRepository.findOne.mockResolvedValue(existingEntry);

        await service.addToWaitlist(email, fullName, preferredLanguage);
      });

      it('should not create a new entry', () => {
        expect(mockWaitlistRepository.create).not.toHaveBeenCalled();
      });

      it('should not save anything', () => {
        expect(mockWaitlistRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('The isApproved() method', () => {
    const email = 'test@example.com';

    describe('When user has approved status', () => {
      let result: boolean;

      beforeEach(async () => {
        const approvedEntry = {
          id: 'entry-id',
          email,
          status: WaitlistStatus.Approved,
        } as Waitlist;

        mockWaitlistRepository.findOne.mockResolvedValue(approvedEntry);

        result = await service.isApproved(email);
      });

      it('should return true', () => {
        expect(result).toBe(true);
      });
    });

    describe('When user has pending status', () => {
      let result: boolean;

      beforeEach(async () => {
        const pendingEntry = {
          id: 'entry-id',
          email,
          status: WaitlistStatus.Pending,
        } as Waitlist;

        mockWaitlistRepository.findOne.mockResolvedValue(pendingEntry);

        result = await service.isApproved(email);
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });
    });

    describe('When user has rejected status', () => {
      let result: boolean;

      beforeEach(async () => {
        const rejectedEntry = {
          id: 'entry-id',
          email,
          status: WaitlistStatus.Rejected,
        } as Waitlist;

        mockWaitlistRepository.findOne.mockResolvedValue(rejectedEntry);

        result = await service.isApproved(email);
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });
    });

    describe('When user does not exist in waitlist', () => {
      let result: boolean;

      beforeEach(async () => {
        mockWaitlistRepository.findOne.mockResolvedValue(null);

        result = await service.isApproved(email);
      });

      it('should return false', () => {
        expect(result).toBe(false);
      });
    });
  });

  describe('The findApprovedUsersForEmailSending() method', () => {
    describe('When there are approved users', () => {
      let result: Waitlist[];
      const mockEntries = [
        {
          id: 'entry-1',
          email: 'user1@example.com',
          status: WaitlistStatus.Approved,
          approvedAt: new Date(),
          welcomeEmailSentAt: undefined,
        } as Waitlist,
        {
          id: 'entry-2',
          email: 'user2@example.com',
          status: WaitlistStatus.Approved,
          approvedAt: new Date(),
          welcomeEmailSentAt: undefined,
        } as Waitlist,
      ];

      beforeEach(async () => {
        mockWaitlistRepository.find.mockResolvedValue(mockEntries);

        result = await service.findApprovedUsersForEmailSending();
      });

      it('should return the approved entries', () => {
        expect(result).toEqual(mockEntries);
      });

      it('should query with correct where conditions and take limit', () => {
        expect(mockWaitlistRepository.find).toHaveBeenCalledWith({
          where: {
            status: WaitlistStatus.Approved,
            approvedAt: expect.anything(),
            welcomeEmailSentAt: expect.anything(),
          },
          take: emailBatchSize,
        });
      });
    });

    describe('When there are no approved users', () => {
      let result: Waitlist[];

      beforeEach(async () => {
        mockWaitlistRepository.find.mockResolvedValue([]);

        result = await service.findApprovedUsersForEmailSending();
      });

      it('should return an empty array', () => {
        expect(result).toEqual([]);
      });
    });
  });

  describe('The sendWelcomeEmailAndMarkSent() method', () => {
    const mockEntry: Waitlist = {
      id: 'entry-id',
      email: 'test@example.com',
      fullName: 'Test User',
      preferredLanguage: 'en',
      status: WaitlistStatus.Approved,
    } as Waitlist;

    describe('When email is sent successfully', () => {
      beforeEach(async () => {
        mockEmailContentBuilder.buildWelcomeEmail.mockReturnValue({
          subject: 'Welcome to SentryGuard',
          body: '<h1>Welcome, Test User!</h1>',
        });
        mockEmailService.sendEmail.mockResolvedValue(undefined);
        mockWaitlistRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

        await service.sendWelcomeEmailAndMarkSent(mockEntry);
      });

      it('should build welcome email content', () => {
        expect(mockEmailContentBuilder.buildWelcomeEmail).toHaveBeenCalledWith(
          mockEntry.fullName,
          mockEntry.preferredLanguage
        );
      });

      it('should send email with correct parameters', () => {
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          mockEntry.email,
          'Welcome to SentryGuard',
          '<h1>Welcome, Test User!</h1>'
        );
      });

      it('should mark welcome email as sent', () => {
        expect(mockWaitlistRepository.update).toHaveBeenCalledWith(
          mockEntry.id,
          { welcomeEmailSentAt: expect.any(Date) }
        );
      });

      it('should log starting to send email', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(
          `Starting to send welcome email to ${mockEntry.email} (entry: ${mockEntry.id})`
        );
      });

      it('should log email sent successfully', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(
          `Welcome email sent successfully to ${mockEntry.email} (entry: ${mockEntry.id})`
        );
      });

      it('should log email marked as sent', () => {
        expect(loggerLogSpy).toHaveBeenCalledWith(
          `Welcome email marked as sent for ${mockEntry.email} (entry: ${mockEntry.id})`
        );
      });
    });

    describe('When email sending fails', () => {
      const expectedError = new Error('Email send failed');
      let act: () => Promise<void>;

      beforeEach(() => {
        mockEmailContentBuilder.buildWelcomeEmail.mockReturnValue({
          subject: 'Welcome to SentryGuard',
          body: '<h1>Welcome, Test User!</h1>',
        });
        mockEmailService.sendEmail.mockRejectedValue(expectedError);

        act = () => service.sendWelcomeEmailAndMarkSent(mockEntry);
      });

      it('should throw the error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });

      it('should not mark welcome email as sent', async () => {
        try {
          await act();
        } catch {
          // expected
        }
        expect(mockWaitlistRepository.update).not.toHaveBeenCalled();
      });
    });
  });
});
