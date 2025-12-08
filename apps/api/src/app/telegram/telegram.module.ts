import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
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
  providers: [TelegramService, TelegramBotService],
  exports: [TelegramService, TelegramBotService],
})
export class TelegramModule {}
