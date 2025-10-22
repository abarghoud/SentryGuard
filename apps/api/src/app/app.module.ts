import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryConfigController } from './telemetry/telemetry-config.controller';
import { TelemetryConfigService } from './telemetry/telemetry-config.service';
import { TelegramService } from './telegram/telegram.service';
import { ZmqService } from './zmq/zmq.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),  // milliseconds
      limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),  // requests
    }]),
  ],
  controllers: [AppController, TelemetryConfigController],
  providers: [
    AppService,
    TelemetryConfigService,
    TelegramService,
    ZmqService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
