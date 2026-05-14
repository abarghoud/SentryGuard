import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseService } from './vehicle-offensive-response.service';
import { OffensiveResponseService } from '../alerts/services/offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { ScheduledOffensiveDeactivationService } from './scheduled-offensive-deactivation.service';
import { OffensiveNotificationService } from './offensive-notification.service';
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
    VehicleOffensiveResponseService,
    OffensiveResponseService,
    TeslaVehicleCommandService,
    ScheduledOffensiveDeactivationService,
    OffensiveNotificationService,
    DistributedLockService,
  ],
  exports: [VehicleOffensiveResponseService, OffensiveResponseService],
})
export class OffensiveResponseModule {}