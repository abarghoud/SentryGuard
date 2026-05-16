import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { ScheduledOffensiveDeactivationService } from './scheduled-offensive-deactivation.service';
import { OffensiveTelegramNotificationService } from './offensive-telegram-notification.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { TelegramModule } from '../telegram/telegram.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, TelegramConfig]),
    AuthModule,
    ConsentModule,
    forwardRef(() => TelegramModule),
    UserModule,
  ],
  controllers: [OffensiveResponseController],
  providers: [
    VehicleOffensiveResponseConfigService,
    AlertsOffensiveResponseService,
    TeslaVehicleCommandService,
    ScheduledOffensiveDeactivationService,
    OffensiveTelegramNotificationService,
    DistributedLockService,
  ],
  exports: [VehicleOffensiveResponseConfigService, AlertsOffensiveResponseService],
})
export class OffensiveResponseModule {}