import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';

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
    TeslaVehicleCommandService,
  ],
  exports: [VehicleOffensiveResponseConfigService, AlertsOffensiveResponseService],
})
export class OffensiveResponseModule {}