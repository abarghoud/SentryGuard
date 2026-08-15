import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaService } from './messaging/kafka/kafka.service';
import { TelemetryMessageHandlerService } from './telemetry/handlers/telemetry-message-handler.service';
import { TelemetryValidationService } from './telemetry/services/telemetry-validation.service';
import { SentryAlertHandlerService } from './alerts/sentry/sentry-alert-handler.service';
import { BreakInAlertHandlerService } from './alerts/break-in/break-in-alert-handler.service';
import { ChargePortLatchTrackerService } from './alerts/break-in/charge-port-latch-tracker.service';
import { VehicleAlertNotifierService } from './alerts/common/vehicle-alert-notifier.service';
import { OffensiveResponseModule } from './offensive-response/offensive-response.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
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
import { LogContextInterceptor } from '../common/interceptors/log-context.interceptor';
import { TokenRevokedExceptionFilter } from '../common/filters/token-revoked-exception.filter';
import { KafkaLogContextService } from '../common/services/kafka-log-context.service';
import { getDatabaseConfig } from '../config/database.config';
import { getThrottleConfig } from '../config/throttle.config';
import { getPinoConfig } from '../config/pino.config';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { Vehicle } from '../entities/vehicle.entity';
import { User } from '../entities/user.entity';
import { NotificationPreferences } from '../entities/notification-preferences.entity';
import { PushDeviceToken } from '../entities/push-device-token.entity';
import { AlertEvent } from '../entities/alert-event.entity';
import { RetryManager } from './shared/retry-manager.service';
import { GracefulShutdownService } from './shared/graceful-shutdown.service';
import { NotificationQueueService } from './notifications/notification-queue.service';
import { TokenBucketRateLimiterService } from '../common/services/token-bucket-rate-limiter.service';
import { NotificationSweeperService } from './notifications/notification-sweeper.service';
import { AlertNotifierRegistry } from './alerts/common/alert-notifier.registry';
import { DistributedLockService } from '../common/services/distributed-lock.service';
import {
  NOTIFICATION_QUEUE_SIZE,
  NOTIFICATION_WORKER_COUNT,
  TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND,
} from '../config/notification-queue.config';

@Module({
  imports: [
    LoggerModule.forRoot(getPinoConfig()),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([Vehicle, User, NotificationPreferences, PushDeviceToken, AlertEvent]),
    ScheduleModule.forRoot(),
    AuthModule,
    TelemetryModule,
    ConsentModule,
    TelegramModule,
    UserModule,
    RedirectModule,
    TeslaPublicKeyModule,
    OnboardingModule,
    OffensiveResponseModule,
    AlertsModule,
    NotificationsModule,
    ThrottlerModule.forRoot([getThrottleConfig()]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    HealthService,
    KafkaService,
    GracefulShutdownService,
    TelemetryMessageHandlerService,
    {
      provide: RetryManager,
      useFactory: () => new RetryManager(
        parseInt(process.env.KAFKA_MESSAGE_MAX_RETRIES || '3'),
        parseInt(process.env.KAFKA_MESSAGE_RETRY_BASE_DELAY || '1000'),
        parseInt(process.env.KAFKA_MESSAGE_RETRY_MAX_DELAY || '30000')
      ),
    },
    {
      provide: TokenBucketRateLimiterService,
      useFactory: () => new TokenBucketRateLimiterService(TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND),
    },
    {
      provide: NotificationQueueService,
      useFactory: (rateLimiter: TokenBucketRateLimiterService) =>
        new NotificationQueueService(rateLimiter, NOTIFICATION_QUEUE_SIZE, NOTIFICATION_WORKER_COUNT),
      inject: [TokenBucketRateLimiterService],
    },
    DistributedLockService,
    AlertNotifierRegistry,
    NotificationSweeperService,
    TelemetryValidationService,
    VehicleAlertNotifierService,
    SentryAlertHandlerService,
    BreakInAlertHandlerService,
    ChargePortLatchTrackerService,
    {
      provide: kafkaMessageHandler,
      useClass: TelemetryMessageHandlerService,
    },
    {
      provide: TelemetryEventHandlerSymbol,
      useFactory: (
        sentryHandler: SentryAlertHandlerService,
        breakInHandler: BreakInAlertHandlerService,
      ) => [sentryHandler, breakInHandler],
      inject: [SentryAlertHandlerService, BreakInAlertHandlerService],
    },
    KafkaLogContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogContextInterceptor,
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
export class AppModule { }
