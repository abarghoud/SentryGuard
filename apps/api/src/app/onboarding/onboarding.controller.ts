import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OnboardingService, OnboardingStatus } from './onboarding.service';
import { ThrottleOptions } from '../../config/throttle.config';
import type { User } from '../../entities/user.entity';

@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedRead())
  public async getOnboardingStatus(@CurrentUser() user: User): Promise<OnboardingStatus> {
    return await this.onboardingService.getOnboardingStatus(user.userId);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedWrite())
  public async completeOnboarding(@CurrentUser() user: User): Promise<{ success: boolean }> {
    this.logger.log(`User ${user.userId} completing onboarding`);
    return await this.onboardingService.completeOnboarding(user.userId);
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedWrite())
  public async skipOnboarding(@CurrentUser() user: User): Promise<{ success: boolean }> {
    this.logger.log(`User ${user.userId} skipping onboarding`);
    return await this.onboardingService.skipOnboarding(user.userId);
  }

  @Post('dismiss-announcement/:key')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedWrite())
  public async dismissAnnouncement(
    @CurrentUser() user: User,
    @Param('key') key: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`User ${user.userId} dismissing announcement ${key}`);
    return await this.onboardingService.dismissAnnouncement(user.userId, key);
  }
}
