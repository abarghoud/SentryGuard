import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaService } from './messaging/kafka/kafka.service';
import { TelemetryMessageHandlerService } from './telemetry/handlers/telemetry-message-handler.service';
import { TelemetryValidationService } from './telemetry/services/telemetry-validation.service';
import { SentryAlertHandlerService } from './alerts/sentry/sentry-alert-handler.service';
import { TelemetryEventHandlerSymbol } from './telemetry/interfaces/telemetry-event-handler.interface';
import { kafkaMessageHandler } from './messaging/kafka/interfaces/message-handler.interface';
import { AuthModule } from './auth/auth.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { TelegramModule } from './telegram/telegram.module';
import { UserModule } from './user/user.module';
import { CloudflareThrottlerGuard } from '../common/guards/cloudflare-throttler.guard';
import { TokenRevokedExceptionFilter } from '../common/filters/token-revoked-exception.filter';
import { getDatabaseConfig } from '../config/database.config';
import { getThrottleConfig } from '../config/throttle.config';
import { getOciLoggingConfig } from '../config/oci-logging.config';
import { OciLoggingService } from '../common/services/oci-logging.service';
import { OciLoggerService } from '../common/loggers/oci-logger.service';
import { Vehicle } from '../entities/vehicle.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([Vehicle, User]),
    ScheduleModule.forRoot(),
    AuthModule,
    TelemetryModule,
    TelegramModule,
    UserModule,
    ThrottlerModule.forRoot([getThrottleConfig()]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    KafkaService,
    TelemetryMessageHandlerService,
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
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  onModuleInit() {
    // Log pool configuration at startup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver = this.dataSource.driver as any;
    const pool = driver.master || driver.pool;
    
    if (pool) {
      const config = getDatabaseConfig();
      const poolConfig = config.extra || {};
      
      this.logger.log(`[DB_POOL_CONFIG] Configured max: ${poolConfig.max || 'default'} | Actual pool max: ${pool.options?.max || pool.max || 'N/A'} | Current total: ${pool.totalCount || 0}`);
      this.logger.log(`[DB_POOL_CONFIG] Pool options: ${JSON.stringify(pool.options || {})}`);
    } else {
      this.logger.warn('[DB_POOL_CONFIG] Could not access pool configuration');
    }
  }
}
