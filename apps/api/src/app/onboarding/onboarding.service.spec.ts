import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { User } from '../../entities/user.entity';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { FeatureAnnouncement } from '../../entities/feature-announcement.entity';
import { UserDismissedAnnouncement } from '../../entities/user-dismissed-announcement.entity';
import { TelemetryConfigService } from '../telemetry/telemetry-config.service';

describe('The OnboardingService class', () => {
  let service: OnboardingService;
  let mockUserRepository: MockProxy<Repository<User>>;
  let mockFeatureAnnouncementRepository: MockProxy<Repository<FeatureAnnouncement>>;
  let mockUserDismissedAnnouncementRepository: MockProxy<Repository<UserDismissedAnnouncement>>;
  let mockTelemetryConfigService: MockProxy<TelemetryConfigService>;

  const fakeUserId = 'user-123';

  beforeEach(async () => {
    mockUserRepository = mock<Repository<User>>();
    mockFeatureAnnouncementRepository = mock<Repository<FeatureAnnouncement>>();
    mockUserDismissedAnnouncementRepository = mock<Repository<UserDismissedAnnouncement>>();
    mockTelemetryConfigService = mock<TelemetryConfigService>();

    mockFeatureAnnouncementRepository.find.mockResolvedValue([]);
    mockUserDismissedAnnouncementRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(FeatureAnnouncement),
          useValue: mockFeatureAnnouncementRepository,
        },
        {
          provide: getRepositoryToken(UserDismissedAnnouncement),
          useValue: mockUserDismissedAnnouncementRepository,
        },
        {
          provide: TelemetryConfigService,
          useValue: mockTelemetryConfigService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  describe('The getOnboardingStatus() method', () => {
    describe('When user exists', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: true,
        onboarding_skipped: false,
      } as User;

      let result: any;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);

        result = await service.getOnboardingStatus(fakeUserId);
      });

      it('should return the onboarding status', () => {
        expect(result).toStrictEqual({
          isComplete: true,
          isSkipped: false,
          pendingAnnouncementKey: null,
        });
      });
    });

    describe('When user does not exist', () => {
      const expectedError = 'User not found';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        act = async () => {
          await service.getOnboardingStatus(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });

  describe('The completeOnboarding() method', () => {
    describe('When all conditions are met', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: false,
        onboarding_skipped: false,
        telegramConfig: {
          status: TelegramLinkStatus.LINKED,
        } as TelegramConfig,
      } as User;

      const fakeVehiclesWithStatus = [
        {
          vin: 'VIN123',
          key_paired: true,
          sentry_mode_monitoring_enabled: true,
        },
      ];

      let result: any;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        mockTelemetryConfigService.getVehicles.mockResolvedValue(fakeVehiclesWithStatus as any);
        mockUserRepository.update.mockResolvedValue(undefined as any);

        result = await service.completeOnboarding(fakeUserId);
      });

      it('should update user onboarding status', () => {
        expect(mockUserRepository.update).toHaveBeenCalledWith(fakeUserId, {
          onboarding_completed: true,
          onboarding_skipped: false,
        });
      });

      it('should return success response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });

    describe('When onboarding is already completed', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: true,
        onboarding_skipped: false,
      } as User;

      let result: any;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);

        result = await service.completeOnboarding(fakeUserId);
      });

      it('should return success without updating', () => {
        expect(result).toStrictEqual({ success: true });
      });

      it('should not call update', () => {
        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('When telegram is not linked', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: false,
        onboarding_skipped: false,
        telegramConfig: null,
      } as User;

      const expectedError = 'Telegram account not linked';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        mockTelemetryConfigService.getVehicles.mockResolvedValue([]);
        act = async () => {
          await service.completeOnboarding(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When virtual key is not paired', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: false,
        onboarding_skipped: false,
        telegramConfig: {
          status: TelegramLinkStatus.LINKED,
        } as TelegramConfig,
      } as User;

      const expectedError = 'Virtual key not paired';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        mockTelemetryConfigService.getVehicles.mockResolvedValue([]);
        act = async () => {
          await service.completeOnboarding(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When telemetry is not enabled', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: false,
        onboarding_skipped: false,
        telegramConfig: {
          status: TelegramLinkStatus.LINKED,
        } as TelegramConfig,
      } as User;

      const fakeVehiclesWithStatus = [
        {
          vin: 'VIN123',
          key_paired: true,
          sentry_mode_monitoring_enabled: false,
          break_in_monitoring_enabled: false,
        },
      ];

      const expectedError = 'Telemetry or break-in monitoring not enabled for any vehicle';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        mockTelemetryConfigService.getVehicles.mockResolvedValue(fakeVehiclesWithStatus as any);
        act = async () => {
          await service.completeOnboarding(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When user does not exist', () => {
      const expectedError = 'User not found';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        act = async () => {
          await service.completeOnboarding(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });

  describe('The skipOnboarding() method', () => {
    describe('When onboarding is skipped successfully', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: false,
        onboarding_skipped: false,
      } as User;

      let result: any;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        mockUserRepository.update.mockResolvedValue(undefined as any);

        result = await service.skipOnboarding(fakeUserId);
      });

      it('should update user onboarding status', () => {
        expect(mockUserRepository.update).toHaveBeenCalledWith(fakeUserId, {
          onboarding_skipped: true,
          onboarding_completed: true,
        });
      });

      it('should return success response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });

    describe('When onboarding is already skipped', () => {
      const fakeUser = {
        userId: fakeUserId,
        onboarding_completed: true,
        onboarding_skipped: true,
      } as User;

      let result: any;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);

        result = await service.skipOnboarding(fakeUserId);
      });

      it('should return success without updating', () => {
        expect(result).toStrictEqual({ success: true });
      });

      it('should not call update', () => {
        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('When user does not exist', () => {
      const expectedError = 'User not found';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        act = async () => {
          await service.skipOnboarding(fakeUserId);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });

  describe('The dismissAnnouncement() method', () => {
    const fakeAnnouncementKey = 'break_in_offensive_response_v1';
    const fakeAnnouncement = { key: fakeAnnouncementKey, is_active: true } as FeatureAnnouncement;

    describe('When announcement exists and has not been dismissed', () => {
      let result: any;

      beforeEach(async () => {
        mockFeatureAnnouncementRepository.findOne.mockResolvedValue(fakeAnnouncement);
        mockUserDismissedAnnouncementRepository.findOne.mockResolvedValue(null);
        mockUserDismissedAnnouncementRepository.save.mockResolvedValue(undefined as any);

        result = await service.dismissAnnouncement(fakeUserId, fakeAnnouncementKey);
      });

      it('should save the dismissal record', () => {
        expect(mockUserDismissedAnnouncementRepository.save).toHaveBeenCalledWith({
          user_id: fakeUserId,
          announcement_key: fakeAnnouncementKey,
        });
      });

      it('should return success response', () => {
        expect(result).toStrictEqual({ success: true });
      });
    });

    describe('When announcement has already been dismissed', () => {
      const fakeDismissedAnnouncement = {
        user_id: fakeUserId,
        announcement_key: fakeAnnouncementKey,
      } as UserDismissedAnnouncement;

      let result: any;

      beforeEach(async () => {
        mockFeatureAnnouncementRepository.findOne.mockResolvedValue(fakeAnnouncement);
        mockUserDismissedAnnouncementRepository.findOne.mockResolvedValue(fakeDismissedAnnouncement);

        result = await service.dismissAnnouncement(fakeUserId, fakeAnnouncementKey);
      });

      it('should return success without saving again', () => {
        expect(result).toStrictEqual({ success: true });
      });

      it('should not call save', () => {
        expect(mockUserDismissedAnnouncementRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When announcement does not exist', () => {
      const expectedError = 'Announcement not found';
      let act: () => Promise<void>;

      beforeEach(() => {
        mockFeatureAnnouncementRepository.findOne.mockResolvedValue(null);
        act = async () => {
          await service.dismissAnnouncement(fakeUserId, fakeAnnouncementKey);
        };
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should throw error with correct message', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });

});