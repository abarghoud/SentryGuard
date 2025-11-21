import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZmqService } from './zmq/zmq.service';
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
    AuthModule,
    TelemetryModule,
    TelegramModule,
    UserModule,
    ThrottlerModule.forRoot([getThrottleConfig()]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ZmqService,
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
