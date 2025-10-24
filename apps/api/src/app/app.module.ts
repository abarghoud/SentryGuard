import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZmqService } from './zmq/zmq.service';
import { AuthModule } from './auth/auth.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { TelegramModule } from './telegram/telegram.module';
import { CloudflareThrottlerGuard } from '../common/guards/cloudflare-throttler.guard';
import { getDatabaseConfig } from '../config/database.config';
import { Vehicle } from '../entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([Vehicle]),
    AuthModule,
    TelemetryModule,
    TelegramModule,
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),  // milliseconds
      limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),  // requests
    }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ZmqService,
    {
      provide: APP_GUARD,
      useClass: CloudflareThrottlerGuard,
    },
  ],
})
export class AppModule {}
