import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryCleanupHandler } from './handlers/telemetry-cleanup.handler';
import { TelemetryConfigService } from './telemetry-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentRevokedHandlerSymbol } from '../consent/interfaces/consent-revoked-handler.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), AuthModule],
  providers: [
    TelemetryConfigService,
    TelemetryCleanupHandler,
    {
      provide: ConsentRevokedHandlerSymbol,
      useExisting: TelemetryCleanupHandler,
    },
  ],
  exports: [ConsentRevokedHandlerSymbol, TelemetryConfigService],
})
export class TelemetryCleanupModule {}
