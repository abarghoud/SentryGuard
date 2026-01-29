import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { User } from '../../entities/user.entity';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TelemetryConfigService } from '../telemetry/telemetry-config.service';

describe('The OnboardingService class', () => {
  let service: OnboardingService;
  let mockUserRepository: MockProxy<Repository<User>>;
  let mockTelemetryConfigService: MockProxy<TelemetryConfigService>;

  const fakeUserId = 'user-123';

  beforeEach(async () => {
    mockUserRepository = mock<Repository<User>>();
    mockTelemetryConfigService = mock<TelemetryConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
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
          telemetry_enabled: true,
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
          telemetry_enabled: false,
        },
      ];

      const expectedError = 'Telemetry not enabled for any vehicle';
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
});