import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryConfigController } from './telemetry-config.controller';
import { BreakInMonitoringController } from './break-in-monitoring.controller';
import { TelemetryConfigService } from './telemetry-config.service';
import { SentryModeConfigService } from './sentry-mode-config.service';
import { BreakInMonitoringConfigService } from './break-in-monitoring-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, User]),
    AuthModule,
    ConsentModule,
  ],
  controllers: [TelemetryConfigController, BreakInMonitoringController],
  providers: [TelemetryConfigService, SentryModeConfigService, BreakInMonitoringConfigService],
  exports: [TelemetryConfigService, SentryModeConfigService, BreakInMonitoringConfigService],
})
export class TelemetryModule {}

