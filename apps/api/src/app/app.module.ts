import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaService } from './messaging/kafka/kafka.service';
import { TelemetryMessageHandlerService } from './telemetry/handlers/telemetry-message-handler.service';
import { TelemetryValidationService } from './telemetry/services/telemetry-validation.service';
import { SentryAlertHandlerService } from './alerts/sentry/sentry-alert-handler.service';
import { TelemetryEventHandlerSymbol } from './telemetry/interfaces/telemetry-event-handler.interface';
import { kafkaMessageHandler } from './messaging/kafka/interfaces/message-handler.interface';
import { AuthModule } from './auth/auth.module';
import { ConsentModule } from './consent/consent.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { TelegramModule } from './telegram/telegram.module';
import { UserModule } from './user/user.module';
import { RedirectModule } from './redirect/redirect.module';
import { TeslaPublicKeyModule } from './tesla-public-key/tesla-public-key.module';
import { CloudflareThrottlerGuard } from '../common/guards/cloudflare-throttler.guard';
import { TokenRevokedExceptionFilter } from '../common/filters/token-revoked-exception.filter';
import { getDatabaseConfig } from '../config/database.config';
import { getThrottleConfig } from '../config/throttle.config';
import { getOciLoggingConfig } from '../config/oci-logging.config';
import { OciLoggingService } from '../common/services/oci-logging.service';
import { OciLoggerService } from '../common/loggers/oci-logger.service';
import { Vehicle } from '../entities/vehicle.entity';
import { User } from '../entities/user.entity';
import { RetryManager } from './messaging/kafka/retry-manager.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([Vehicle, User]),
    ScheduleModule.forRoot(),
    AuthModule,
    TelemetryModule,
    ConsentModule,
    TelegramModule,
    UserModule,
    RedirectModule,
    TeslaPublicKeyModule,
    ThrottlerModule.forRoot([getThrottleConfig()]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    KafkaService,
    TelemetryMessageHandlerService,
    {
      provide: RetryManager,
      useFactory: () => new RetryManager(
        parseInt(process.env.KAFKA_MESSAGE_MAX_RETRIES || '3'),
        parseInt(process.env.KAFKA_MESSAGE_RETRY_BASE_DELAY || '1000'),
        parseInt(process.env.KAFKA_MESSAGE_RETRY_MAX_DELAY || '30000')
      ),
    },
    TelemetryValidationService,
    SentryAlertHandlerService,
    {
      provide: kafkaMessageHandler,
      useClass: TelemetryMessageHandlerService,
    },
    {
      provide: TelemetryEventHandlerSymbol,
      useFactory: (
        sentryHandler: SentryAlertHandlerService,
      ) => [sentryHandler],
      inject: [SentryAlertHandlerService],
    },
    {
      provide: OciLoggingService,
      useFactory: () => new OciLoggingService(getOciLoggingConfig()),
    },
    OciLoggerService,
    {
      provide: APP_GUARD,
      useClass: CloudflareThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: TokenRevokedExceptionFilter,
    },
  ],
})
export class AppModule {}
