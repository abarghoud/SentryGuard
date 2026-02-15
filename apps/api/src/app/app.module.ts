import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
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
import { OnboardingModule } from './onboarding/onboarding.module';
import { CloudflareThrottlerGuard } from '../common/guards/cloudflare-throttler.guard';
import { TokenRevokedExceptionFilter } from '../common/filters/token-revoked-exception.filter';
import { getDatabaseConfig } from '../config/database.config';
import { getThrottleConfig } from '../config/throttle.config';
import { getPinoConfig } from '../config/pino.config';
import { Vehicle } from '../entities/vehicle.entity';
import { User } from '../entities/user.entity';
import { RetryManager } from './shared/retry-manager.service';

@Module({
  imports: [
    LoggerModule.forRoot(getPinoConfig()),
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
    OnboardingModule,
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
