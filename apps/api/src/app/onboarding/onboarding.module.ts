import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { FeatureAnnouncement } from '../../entities/feature-announcement.entity';
import { UserDismissedAnnouncement } from '../../entities/user-dismissed-announcement.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FeatureAnnouncement, UserDismissedAnnouncement]),
    TelemetryModule,
  ],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
