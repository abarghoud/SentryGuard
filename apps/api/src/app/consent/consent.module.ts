import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { TelemetryCleanupModule } from '../telemetry/telemetry-cleanup.module';
import { UserConsent } from '../../entities/user-consent.entity';
import { User } from '../../entities/user.entity';
import { Vehicle } from '../../entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserConsent, User, Vehicle]),
    TelemetryCleanupModule,
  ],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentGuard],
  exports: [ConsentService, ConsentGuard],
})
export class ConsentModule {}
