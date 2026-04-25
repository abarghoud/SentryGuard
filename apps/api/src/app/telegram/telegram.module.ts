import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramAccountLinkingService } from './telegram-account-linking.service';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramStatusService } from './telegram-status.service';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { TelegramConfigService } from './telegram-config.service';
import { TelegramFailureHandlerService } from './handlers/telegram-failure-handler.service';
import { TelegramOffensiveResponseService } from './telegram-offensive-response.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { RetryManager } from '../shared/retry-manager.service';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { User } from '../../entities/user.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramConfig, User, Vehicle]),
    AuthModule,
    ConsentModule,
    UserModule,
    TelemetryModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    TelegramService,
    TelegramBotService,
    TelegramKeyboardBuilderService,
    TelegramContextService,
    TelegramAccountLinkingService,
    TelegramMuteService,
    TelegramStatusService,
    TelegramBotUpdateService,
    TelegramConfigService,
    TelegramFailureHandlerService,
    TelegramOffensiveResponseService,
    {
      provide: telegramFailureHandler,
      useClass: TelegramFailureHandlerService,
    },
    {
      provide: telegramRetryManager,
      useFactory: () => new RetryManager(
        parseInt(process.env.TELEGRAM_MAX_RETRIES || '3'),
        parseInt(process.env.TELEGRAM_BASE_DELAY_MS || '1000'),
        parseInt(process.env.TELEGRAM_MAX_DELAY_MS || '10000')
      ),
    },
  ],
  exports: [TelegramService, TelegramBotService, TelegramKeyboardBuilderService, TelegramConfigService],
})
export class TelegramModule {}