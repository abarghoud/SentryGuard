import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { AlertsAutoSentryService } from './alerts-auto-sentry.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';
import { LatencyGuardService } from '../../common/services/latency-guard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
    AuthModule,
    ConsentModule,
    UserModule,
  ],
  controllers: [OffensiveResponseController],
  providers: [
    VehicleOffensiveResponseConfigService,
    AlertsOffensiveResponseService,
    AlertsAutoSentryService,
    TeslaVehicleCommandService,
    LatencyGuardService,
  ],
  exports: [
    VehicleOffensiveResponseConfigService,
    AlertsOffensiveResponseService,
    AlertsAutoSentryService,
  ],
})
export class OffensiveResponseModule {}