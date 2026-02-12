import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramConfigService } from './telegram-config.service';
import { TelegramFailureHandlerService } from './handlers/telegram-failure-handler.service';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { RetryManager } from '../shared/retry-manager.service';
import { telegramRetryManager } from './telegram-retry-manager.token';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramConfig, User]),
    AuthModule,
    ConsentModule,
    UserModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    TelegramService,
    TelegramBotService,
    TelegramKeyboardBuilderService,
    TelegramConfigService,
    TelegramFailureHandlerService,
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
