import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryConfigController } from './telemetry/telemetry-config.controller';
import { TelemetryConfigService } from './telemetry/telemetry-config.service';
import { TelegramService } from './telegram/telegram.service';
import { ZmqService } from './zmq/zmq.service';

@Module({
  imports: [],
  controllers: [AppController, TelemetryConfigController],
  providers: [
    AppService, 
    TelemetryConfigService,
    TelegramService, 
    ZmqService
  ],
})
export class AppModule {}
