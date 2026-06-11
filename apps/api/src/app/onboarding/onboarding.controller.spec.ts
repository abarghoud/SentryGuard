import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService, OnboardingStatus } from './onboarding.service';
import type { User } from '../../entities/user.entity';

describe('The OnboardingController class', () => {
  let controller: OnboardingController;
  let mockOnboardingService: MockProxy<OnboardingService>;

  const fakeUserId = 'user-123';
  const fakeUser = { userId: fakeUserId } as User;

  beforeEach(async () => {
    mockOnboardingService = mock<OnboardingService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        {
          provide: OnboardingService,
          useValue: mockOnboardingService,
        },
      ],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  describe('The getOnboardingStatus() method', () => {
    describe('When called with a valid user', () => {
      const expectedStatus: OnboardingStatus = {
        isComplete: false,
        isSkipped: false,
      };

      let result: OnboardingStatus;

      beforeEach(async () => {
        mockOnboardingService.getOnboardingStatus.mockResolvedValue(expectedStatus);

        result = await controller.getOnboardingStatus(fakeUser);
      });

      it('should call the service with the user ID', () => {
        expect(mockOnboardingService.getOnboardingStatus).toHaveBeenCalledWith(fakeUserId);
      });

      it('should return the onboarding status', () => {
        expect(result).toStrictEqual(expectedStatus);
      });
    });
  });

  describe('The completeOnboarding() method', () => {
    describe('When onboarding is completed successfully', () => {
      const expectedResponse = { success: true };

      let result: { success: boolean };

      beforeEach(async () => {
        mockOnboardingService.completeOnboarding.mockResolvedValue(expectedResponse);

        result = await controller.completeOnboarding(fakeUser);
      });

      it('should call the service with the user ID', () => {
        expect(mockOnboardingService.completeOnboarding).toHaveBeenCalledWith(fakeUserId);
      });

      it('should return success response', () => {
        expect(result).toStrictEqual(expectedResponse);
      });
    });
  });

  describe('The skipOnboarding() method', () => {
    describe('When onboarding is skipped successfully', () => {
      const expectedResponse = { success: true };

      let result: { success: boolean };

      beforeEach(async () => {
        mockOnboardingService.skipOnboarding.mockResolvedValue(expectedResponse);

        result = await controller.skipOnboarding(fakeUser);
      });

      it('should call the service with the user ID', () => {
        expect(mockOnboardingService.skipOnboarding).toHaveBeenCalledWith(fakeUserId);
      });

      it('should return success response', () => {
        expect(result).toStrictEqual(expectedResponse);
      });
    });

  });

  describe('The dismissAnnouncement() method', () => {
    describe('When called with a valid user and key', () => {
      const fakeAnnouncementKey = 'break_in_offensive_response_v1';
      const expectedResponse = { success: true };

      let result: { success: boolean };

      beforeEach(async () => {
        mockOnboardingService.dismissAnnouncement.mockResolvedValue(expectedResponse);

        result = await controller.dismissAnnouncement(fakeUser, fakeAnnouncementKey);
      });

      it('should call the service with the user ID and key', () => {
        expect(mockOnboardingService.dismissAnnouncement).toHaveBeenCalledWith(fakeUserId, fakeAnnouncementKey);
      });

      it('should return success response', () => {
        expect(result).toStrictEqual(expectedResponse);
      });
    });
  });
});