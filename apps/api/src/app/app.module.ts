import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryService } from './telemetry/telemetry.service';
import { TelemetryGateway } from './telemetry/telemetry.gateway';
import { TelegramService } from './telegram/telegram.service';

@Module({
  imports: [],
  controllers: [AppController, TelemetryController],
  providers: [AppService, TelemetryService, TelegramService, TelemetryGateway],
})
export class AppModule {}
