import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';
import { VehicleAlertSoundConfigService } from './vehicle-alert-sound-config.service';
import { VehicleAlertSoundsController } from './vehicle-alert-sounds.controller';

@Module({
  controllers: [VehicleAlertSoundsController],
  exports: [VehicleAlertSoundConfigService],
  imports: [TypeOrmModule.forFeature([Vehicle]), AuthModule, ConsentModule, UserModule],
  providers: [VehicleAlertSoundConfigService],
})
export class VehicleAlertSoundsModule {}
