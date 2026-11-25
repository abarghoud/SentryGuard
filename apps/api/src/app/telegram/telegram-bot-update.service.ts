import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TELEGRAM_REQUEST_TIMEOUT_MS } from '../../config/telegram-request-timeout.config';
import { CaughtError } from '../../common/utils/caught-error';
import { withTimeout } from '../../common/utils/with-timeout.util';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
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
    @Inject(telegramFailureHandler) private readonly failureHandler: ITelegramFailureHandler,
  ) {}

  public async ensureUserIsUpToDate(userId: string, chatId: string, lng: 'en' | 'fr'): Promise<void> {
    try {
      await withTimeout(
        (signal) => this.sendUpdateIfOutdated(userId, chatId, lng, signal),
        TELEGRAM_REQUEST_TIMEOUT_MS,
        `Telegram bot update request timed out after ${TELEGRAM_REQUEST_TIMEOUT_MS}ms`
      );
    } catch (error) {
      this.skipUpdateUnlessBotBlocked(userId, error);
    }
  }

  private skipUpdateUnlessBotBlocked(userId: string, error: unknown): void {
    if (error instanceof Error && this.failureHandler.canHandle(error)) {
      throw error;
    }

    this.logger.warn(`[TELEGRAM_BOT_UPDATE_SKIPPED] Could not send the bot update to user ${userId}, it will be sent with a later alert: ${new CaughtError(error).describe()}`);
  }

  private async sendUpdateIfOutdated(userId: string, chatId: string, lng: 'en' | 'fr', signal: AbortSignal): Promise<void> {
    const config = await this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });

    if (!config || config.bot_ui_version >= CURRENT_BOT_UI_VERSION) {
      return;
    }

    await this.sendUpdate(config, chatId, lng, signal);
    this.logger.log(`✅ Bot UI updated to v${CURRENT_BOT_UI_VERSION} for user ${userId}`);
  }

  private async sendUpdate(config: TelegramConfig, chatId: string, lng: 'en' | 'fr', signal: AbortSignal): Promise<void> {
    await this.botService.sendMessage(
      chatId,
      i18n.t('botUpdateV1', { lng }),
      this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until),
      signal
    );

    await this.telegramConfigRepository.update({ userId: config.userId }, { bot_ui_version: CURRENT_BOT_UI_VERSION });
  }
}
