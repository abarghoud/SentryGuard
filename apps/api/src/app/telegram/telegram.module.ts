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
  ],
  exports: [TelegramService, TelegramBotService, TelegramKeyboardBuilderService, TelegramConfigService],
})
export class TelegramModule {}
