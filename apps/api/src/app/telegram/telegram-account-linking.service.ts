import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { UserLanguageService } from '../user/user-language.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramMessageOptions, CURRENT_BOT_UI_VERSION } from './telegram.types';
import { TelegramMessageHelper } from './telegram-message.helper';

@Injectable()
export class TelegramAccountLinkingService implements OnModuleInit {
  private readonly logger = new Logger(TelegramAccountLinkingService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly userLanguageService: UserLanguageService,
    private readonly botService: TelegramBotService,
    private readonly keyboardBuilderService: TelegramKeyboardBuilderService,
    private readonly contextService: TelegramContextService,
  ) {}

  onModuleInit(): void {
    this.botService.registerStart(async (ctx) => {
      const args = ctx.message.text.split(' ');
      const linkToken = args.length > 1 ? args[1] : undefined;
      await this.handleStart(ctx, linkToken);
    });
  }

  private async handleStart(ctx: Context, linkToken?: string): Promise<void> {
    if (linkToken) {
      await this.handleLinkToken(ctx, linkToken);
    } else {
      await this.handleStartWithoutToken(ctx);
    }
  }

  private async handleStartWithoutToken(ctx: Context): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.telegramConfigRepository.findOne({
      where: { chat_id: chatId, status: TelegramLinkStatus.LINKED },
    });
    const welcomeMessage = i18n.t('Welcome to SentryGuard Bot', { lng });

    if (config) {
      await this.safeReply(ctx, welcomeMessage, this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until));
    } else {
      await this.safeReply(ctx, welcomeMessage);
    }
  }

  private async handleLinkToken(ctx: Context, linkToken: string): Promise<void> {
    try {
      const config = await this.findPendingConfig(linkToken);
      const lng = await this.getLanguageForConfig(config);

      if (!config) {
        await this.safeReply(ctx, i18n.t('Invalid or expired token', { lng }));
        return;
      }

      const isExpired = await this.handleExpiredToken(ctx, config, lng);
      if (isExpired) return;

      await this.linkAccountToChat(ctx, config, lng);
    } catch (error) {
      this.logger.error('❌ Error while trying to handle link token:', error);
      await this.safeReply(ctx, '❌ An error occurred. Please try again later.');
    }
  }

  private async findPendingConfig(linkToken: string): Promise<TelegramConfig | null> {
    return await this.telegramConfigRepository.findOne({
      where: { link_token: linkToken, status: TelegramLinkStatus.PENDING },
    });
  }

  private async getLanguageForConfig(config: TelegramConfig | null): Promise<'en' | 'fr'> {
    return config
      ? await this.userLanguageService.getUserLanguage(config.userId)
      : 'en';
  }

  private async handleExpiredToken(ctx: Context, config: TelegramConfig, lng: 'en' | 'fr'): Promise<boolean> {
    if (config.expires_at && new Date() > config.expires_at) {
      config.status = TelegramLinkStatus.EXPIRED;
      await this.telegramConfigRepository.save(config);
      await this.safeReply(ctx, i18n.t('This token has expired', { lng }));
      return true;
    }
    return false;
  }

  private async linkAccountToChat(ctx: Context, config: TelegramConfig, lng: 'en' | 'fr'): Promise<void> {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) {
      this.logger.warn('⚠️ chatId missing in Telegram update');
      await this.safeReply(ctx, '❌ Unable to process this request.');
      return;
    }

    await this.saveLinkConfig(config, chatId);
    await this.sendLinkSuccessMessages(ctx, lng);
  }

  private async saveLinkConfig(config: TelegramConfig, chatId: string): Promise<void> {
    config.chat_id = chatId;
    config.status = TelegramLinkStatus.LINKED;
    config.linked_at = new Date();
    config.bot_ui_version = CURRENT_BOT_UI_VERSION;
    await this.telegramConfigRepository.save(config);

    this.logger.log(`✅ Account linked: userId=${config.userId}, chatId=${chatId}`);
  }

  private async sendLinkSuccessMessages(ctx: Context, lng: 'en' | 'fr'): Promise<void> {
    await this.safeReply(ctx, i18n.t('Your SentryGuard account has been linked successfully!', { lng }));
    await this.safeReply(ctx, i18n.t('telegramLinkedFollowUp', { lng }), this.keyboardBuilderService.buildMainMenuKeyboard(lng));
  }

  private async safeReply(ctx: Context, message: string, options?: TelegramMessageOptions): Promise<void> {
    try {
      const telegramOptions = TelegramMessageHelper.buildOptions(options);
      await ctx.reply(message, Object.keys(telegramOptions).length > 1 ? telegramOptions : undefined);
    } catch (error) {
      this.logger.warn(`⚠️ Could not send message to user (possibly blocked the bot): ${error}`, error);
    }
  }
}