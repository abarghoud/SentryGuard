import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceHiddenVehicle } from '../../entities/device-hidden-vehicle.entity';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  exports: [DevicesService],
  imports: [TypeOrmModule.forFeature([DeviceHiddenVehicle])],
  providers: [DevicesService],
})
export class DevicesModule {}
