import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';
import { BreakInDetectionController } from './break-in-detection.controller';
import { VehicleBreakInDetectionConfigService } from './vehicle-break-in-detection-config.service';

@Module({
  controllers: [BreakInDetectionController],
  imports: [TypeOrmModule.forFeature([Vehicle]), AuthModule, ConsentModule, UserModule],
  providers: [VehicleBreakInDetectionConfigService],
})
export class BreakInDetectionModule {}
