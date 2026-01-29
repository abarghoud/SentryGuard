import {
  Controller,
  Get,
  Post,
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
  async getOnboardingStatus(@CurrentUser() user: User): Promise<OnboardingStatus> {
    return await this.onboardingService.getOnboardingStatus(user.userId);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedWrite())
  async completeOnboarding(@CurrentUser() user: User): Promise<{ success: boolean }> {
    this.logger.log(`User ${user.userId} completing onboarding`);
    return await this.onboardingService.completeOnboarding(user.userId);
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard)
  @Throttle(ThrottleOptions.authenticatedWrite())
  async skipOnboarding(@CurrentUser() user: User): Promise<{ success: boolean }> {
    this.logger.log(`User ${user.userId} skipping onboarding`);
    return await this.onboardingService.skipOnboarding(user.userId);
  }
}
