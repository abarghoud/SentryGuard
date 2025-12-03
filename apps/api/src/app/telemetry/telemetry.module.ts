import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryConfigController } from './telemetry-config.controller';
import { TelemetryConfigService } from './telemetry-config.service';
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
  controllers: [TelemetryConfigController],
  providers: [TelemetryConfigService],
  exports: [TelemetryConfigService],
})
export class TelemetryModule {}

