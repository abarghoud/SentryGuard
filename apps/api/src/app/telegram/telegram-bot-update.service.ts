import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { CURRENT_BOT_UI_VERSION } from './telegram.types';

@Injectable()
export class TelegramBotUpdateService {
  private readonly logger = new Logger(TelegramBotUpdateService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly botService: TelegramBotService,
    private readonly keyboardBuilderService: TelegramKeyboardBuilderService,
  ) {}

  async ensureUserIsUpToDate(userId: string, chatId: string, lng: 'en' | 'fr'): Promise<void> {
    const config = await this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });

    if (!config || config.bot_ui_version >= CURRENT_BOT_UI_VERSION) {
      return;
    }

    await this.botService.sendMessage(
      chatId,
      i18n.t('botUpdateV1', { lng }),
      this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until)
    );

    await this.telegramConfigRepository.update({ userId }, { bot_ui_version: CURRENT_BOT_UI_VERSION });

    this.logger.log(`✅ Bot UI updated to v${CURRENT_BOT_UI_VERSION} for user ${userId}`);
  }
}