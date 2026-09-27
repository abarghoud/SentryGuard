import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryCleanupHandler } from './handlers/telemetry-cleanup.handler';
import { TelemetryConfigService } from './telemetry-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentRevokedHandlerSymbol } from '../consent/interfaces/consent-revoked-handler.interface';
import { ErrorMeaningClassifierService } from '../../common/services/error-meaning-classifier.service';
import { typeSafeClientProvider } from '../../common/utils/typesafe-client.token';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), AuthModule],
  providers: [
    TelemetryConfigService,
    TelemetryCleanupHandler,
    ErrorMeaningClassifierService,
    typeSafeClientProvider,
    {
      provide: ConsentRevokedHandlerSymbol,
      useExisting: TelemetryCleanupHandler,
    },
  ],
  exports: [ConsentRevokedHandlerSymbol, TelemetryConfigService],
})
export class TelemetryCleanupModule {}
