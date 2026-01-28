import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TelemetryConfigService } from '../telemetry/telemetry-config.service';

export interface OnboardingStatus {
  isComplete: boolean;
  isSkipped: boolean;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly telemetryConfigService: TelemetryConfigService,
  ) {}

  async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      isComplete: user.onboarding_completed,
      isSkipped: user.onboarding_skipped,
    };
  }

  async completeOnboarding(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['telegramConfig'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.onboarding_completed && !user.onboarding_skipped) {
      this.logger.log(`Onboarding already completed for user ${userId}`);
      return { success: true };
    }

    const isTelegramLinked =
      user.telegramConfig?.status === TelegramLinkStatus.LINKED;

    const vehiclesWithStatus = await this.telemetryConfigService.getVehicles(userId);
    const isVirtualKeyPaired = vehiclesWithStatus.some((vehicle) => vehicle.key_paired);
    const isTelemetryEnabled = vehiclesWithStatus.some((vehicle) => vehicle.telemetry_enabled);

    if (!isTelegramLinked) {
      throw new BadRequestException('Telegram account not linked');
    }

    if (!isVirtualKeyPaired) {
      throw new BadRequestException('Virtual key not paired');
    }

    if (!isTelemetryEnabled) {
      throw new BadRequestException('Telemetry not enabled for any vehicle');
    }

    await this.userRepository.update(userId, {
      onboarding_completed: true,
      onboarding_skipped: false,
    });

    this.logger.log(`Onboarding completed for user ${userId}`);

    return { success: true };
  }

  async skipOnboarding(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.onboarding_skipped && user.onboarding_completed) {
      this.logger.log(`Onboarding already skipped for user ${userId}`);
      return { success: true };
    }

    await this.userRepository.update(userId, {
      onboarding_skipped: true,
      onboarding_completed: true,
    });

    this.logger.log(`Onboarding skipped for user ${userId}`);

    return { success: true };
  }
}
