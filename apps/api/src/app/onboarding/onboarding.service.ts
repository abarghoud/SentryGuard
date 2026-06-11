import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { FeatureAnnouncement } from '../../entities/feature-announcement.entity';
import { UserDismissedAnnouncement } from '../../entities/user-dismissed-announcement.entity';
import { TelemetryConfigService } from '../telemetry/telemetry-config.service';

export interface OnboardingStatus {
  isComplete: boolean;
  isSkipped: boolean;
  pendingAnnouncementKey: string | null;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FeatureAnnouncement)
    private readonly featureAnnouncementRepository: Repository<FeatureAnnouncement>,
    @InjectRepository(UserDismissedAnnouncement)
    private readonly userDismissedAnnouncementRepository: Repository<UserDismissedAnnouncement>,
    private readonly telemetryConfigService: TelemetryConfigService,
  ) {}

  public async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const pendingAnnouncementKey = await this.findPendingAnnouncementKey(userId);

    return {
      isComplete: user.onboarding_completed,
      isSkipped: user.onboarding_skipped,
      pendingAnnouncementKey,
    };
  }

  private async findPendingAnnouncementKey(userId: string): Promise<string | null> {
    const activeAnnouncements = await this.featureAnnouncementRepository.find({
      where: { is_active: true },
    });

    if (activeAnnouncements.length === 0) {
      return null;
    }

    const dismissedAnnouncements = await this.userDismissedAnnouncementRepository.find({
      where: { user_id: userId },
    });

    const dismissedKeys = new Set(dismissedAnnouncements.map((d) => d.announcement_key));
    const pending = activeAnnouncements.find((a) => !dismissedKeys.has(a.key));

    return pending?.key ?? null;
  }

  public async dismissAnnouncement(userId: string, announcementKey: string): Promise<{ success: boolean }> {
    const announcement = await this.featureAnnouncementRepository.findOne({
      where: { key: announcementKey },
    });

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    const alreadyDismissed = await this.userDismissedAnnouncementRepository.findOne({
      where: { user_id: userId, announcement_key: announcementKey },
    });

    if (alreadyDismissed) {
      return { success: true };
    }

    await this.userDismissedAnnouncementRepository.save({
      user_id: userId,
      announcement_key: announcementKey,
    });

    this.logger.log(`User ${userId} dismissed announcement ${announcementKey}`);

    return { success: true };
  }

  public async completeOnboarding(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: {
        telegramConfig: true,
        pushDeviceTokens: true,
      },
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

    const hasPushToken =
      user.pushDeviceTokens &&
      user.pushDeviceTokens.some((token) => token.push_enabled === true);

    const vehiclesWithStatus = await this.telemetryConfigService.getVehicles(userId);
    const isVirtualKeyPaired = vehiclesWithStatus.some((vehicle) => vehicle.key_paired);
    const isTelemetryEnabled =
      vehiclesWithStatus.some((vehicle) => vehicle.sentry_mode_monitoring_enabled) ||
      vehiclesWithStatus.some((vehicle) => vehicle.break_in_monitoring_enabled);

    if (!isTelegramLinked && !hasPushToken) {
      throw new BadRequestException(
        'Either Telegram account must be linked or push notifications configured'
      );
    }

    if (!isVirtualKeyPaired) {
      throw new BadRequestException('Virtual key not paired');
    }

    if (!isTelemetryEnabled) {
      throw new BadRequestException('Telemetry or break-in monitoring not enabled for any vehicle');
    }

    await this.userRepository.update(userId, {
      onboarding_completed: true,
      onboarding_skipped: false,
    });

    this.logger.log(`Onboarding completed for user ${userId}`);

    return { success: true };
  }

  public async skipOnboarding(userId: string): Promise<{ success: boolean }> {
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
