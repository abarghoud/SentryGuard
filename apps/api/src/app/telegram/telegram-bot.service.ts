import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import type { Request, Response } from 'express';
import i18n from '../../i18n';
import {
  TelegramConfig,
  TelegramLinkStatus,
} from '../../entities/telegram-config.entity';
import { UserLanguageService } from '../user/user-language.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<Context> | null = null;
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly webhookBaseUrl = process.env.TELEGRAM_WEBHOOK_BASE;
  private readonly webhookSecretPath =
    process.env.TELEGRAM_WEBHOOK_SECRET_PATH;
  private readonly webhookSecretToken =
    process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || undefined;
  private readonly mode = process.env.TELEGRAM_MODE || 'webhook';
  private webhookCallback:
    | ReturnType<Telegraf<Context>['webhookCallback']>
    | null = null;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly userLanguageService: UserLanguageService
  ) {}

  private async safeReply(ctx: Context, message: string): Promise<void> {
    try {
      await ctx.reply(message);
    } catch (error) {
      this.logger.warn(
        '⚠️ Could not send message to user (possibly blocked the bot):',
        error
      );
    }
  }

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn(
        '⚠️ TELEGRAM_BOT_TOKEN not defined, Telegram bot disabled'
      );
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);

      this.setupBotCommands();

      if (this.mode === 'polling') {
        await this.setupPollingMode();
      } else {
        await this.setupWebhookMode();
      }

      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } catch (error) {
      this.logger.error('❌ Telegram bot initialization error:', error);
    }
  }

  /**
   * Configure les commandes du bot
   */
  private setupBotCommands() {
    if (!this.bot) return;

    this.bot.start(async (ctx) => {
      const args = ctx.message.text.split(' ');

      if (args.length > 1) {
        const linkToken = args[1];
        await this.handleLinkToken(ctx, linkToken);
      } else {
        const lng = await this.getUserLanguageFromChatId(
          ctx.chat.id.toString()
        );
        await ctx.reply(i18n.t('Welcome to SentryGuard Bot', { lng }));
      }
    });

    this.bot.command('status', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const lng = await this.getUserLanguageFromChatId(chatId);
      const config = await this.telegramConfigRepository.findOne({
        where: { chat_id: chatId, status: TelegramLinkStatus.LINKED },
      });

      if (config) {
        await ctx.reply(i18n.t('Your account is linked and active!', { lng }));
      } else {
        await ctx.reply(i18n.t('No account linked', { lng }));
      }
    });

    this.bot.help(async (ctx) => {
      const lng = await this.getUserLanguageFromChatId(
        ctx.chat.id.toString()
      );
      await ctx.reply(i18n.t('Available commands', { lng }));
    });
  }

  private async setupPollingMode() {
    if (!this.bot) return;

    this.logger.log('🔄 Configuring bot in polling mode...');

    try {
      this.bot.launch();

      this.logger.log('✅ Telegram bot running in polling mode.');
    } catch (error) {
      this.logger.error('❌ Error while trying to run polling:', error);
      throw error;
    }
  }

  private async setupWebhookMode() {
    if (!this.bot) return;

    if (!this.webhookBaseUrl) {
      this.logger.warn(
        '⚠️ TELEGRAM_WEBHOOK_BASE not defined, Telegram bot webhook disabled'
      );
      return;
    }

    const sanitizedWebhookPath = this.webhookSecretPath
      ? this.webhookSecretPath.replace(/^\//, '')
      : undefined;

    if (!sanitizedWebhookPath || sanitizedWebhookPath.length < 16) {
      this.logger.error(
        '❌ TELEGRAM_WEBHOOK_SECRET_PATH must be a non-guessable value (16+ chars)'
      );
      return;
    }

    if (!this.webhookSecretToken || this.webhookSecretToken.length < 24) {
      this.logger.error(
        '❌ TELEGRAM_WEBHOOK_SECRET_TOKEN must be defined (24+ chars) to accept webhook updates'
      );
      return;
    }

    try {
      const webhookPath = this.getWebhookPath(sanitizedWebhookPath);
      const webhookUrl = `${this.webhookBaseUrl.replace(/\/$/, '')}${webhookPath}`;

      await this.bot.telegram.setWebhook(webhookUrl, {
        secret_token: this.webhookSecretToken,
        drop_pending_updates: true,
      });

      this.webhookCallback = this.bot.webhookCallback(webhookPath);
      this.logger.log(
        `✅ Telegram bot configured with webhook on ${webhookUrl} (secure secret path)`
      );
    } catch (error) {
      this.logger.error('❌ Error while trying to configure webhook:', error);
      throw error;
    }
  }

  private async handleLinkToken(
    ctx: Context,
    linkToken: string
  ): Promise<void> {
    try {
      const config = await this.telegramConfigRepository.findOne({
        where: { link_token: linkToken, status: TelegramLinkStatus.PENDING },
      });

      const lng = config
        ? await this.userLanguageService.getUserLanguage(config.userId)
        : 'en';

      if (!config) {
        await this.safeReply(ctx, i18n.t('Invalid or expired token', { lng }));
        return;
      }

      if (config.expires_at && new Date() > config.expires_at) {
        config.status = TelegramLinkStatus.EXPIRED;
        await this.telegramConfigRepository.save(config);
        await this.safeReply(ctx, i18n.t('This token has expired', { lng }));
        return;
      }

      const chatId = ctx.chat?.id?.toString();
      if (!chatId) {
        this.logger.warn('⚠️ chatId missing in Telegram update');
        await this.safeReply(ctx, '❌ Unable to process this request.');
        return;
      }
      config.chat_id = chatId;
      config.status = TelegramLinkStatus.LINKED;
      config.linked_at = new Date();
      await this.telegramConfigRepository.save(config);

      this.logger.log(
        `✅ Account linked: userId=${config.userId}, chatId=${chatId}`
      );

      await this.safeReply(
        ctx,
        i18n.t('Your SentryGuard account has been linked successfully!', { lng })
      );
    } catch (error) {
      this.logger.error('❌ Error while trying to handle link token:', error);
      await this.safeReply(ctx, '❌ An error occurred. Please try again later.');
    }
  }

  async sendMessageToUser(
    userId: string,
    message: string,
    options?: {
      keyboard?: {
        inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
        keyboard?: Array<Array<{ text: string }>>;
        one_time_keyboard?: boolean;
        resize_keyboard?: boolean;
      };
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    }
  ): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn('⚠️ Telegram bot not initialized');
      return false;
    }

    const config = await this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });

    if (!config || !config.chat_id) {
      this.logger.warn(
        `⚠️ No chat_id found for user: ${userId}`
      );
      return false;
    }

    const telegramOptions: Record<string, unknown> = {
      parse_mode: options?.parse_mode || 'HTML',
    };

    if (options?.keyboard?.inline_keyboard) {
      telegramOptions.reply_markup = {
        inline_keyboard: options.keyboard.inline_keyboard,
      };
    } else if (options?.keyboard?.keyboard) {
      telegramOptions.reply_markup = {
        keyboard: options.keyboard.keyboard,
        one_time_keyboard: options.keyboard.one_time_keyboard,
        resize_keyboard: options.keyboard.resize_keyboard,
      };
    }

    await this.bot.telegram.sendMessage(config.chat_id, message, telegramOptions);

    this.logger.log(`📱 Message sent to user ${userId} (chat_id: ${config.chat_id})`);
    return true;
  }

  async getBotUsername(): Promise<string | null> {
    if (!this.bot) {
      return process.env.TELEGRAM_BOT_USERNAME || null;
    }

    try {
      const me = await this.bot.telegram.getMe();
      return me.username || null;
    } catch (error) {
      this.logger.error(
        '❌ Error while trying to get bot username:',
        error
      );
      return process.env.TELEGRAM_BOT_USERNAME || null;
    }
  }

  getWebhookSecretPath(): string {
    return (this.webhookSecretPath || '').replace(/^\//, '');
  }

  getWebhookSecretToken(): string | undefined {
    return this.webhookSecretToken;
  }

  getWebhookCallback():
    | ReturnType<Telegraf<Context>['webhookCallback']>
    | null {
    return this.webhookCallback;
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    if (!this.webhookCallback) {
      this.logger.warn('⚠️ Webhook not initialized');
      res.status(503).send('Webhook not configured');
      return;
    }

    return this.webhookCallback(req, res);
  }

  private getWebhookPath(secretPath: string): string {
    return `/telegram/webhook/${secretPath}`;
  }

  private async getUserLanguageFromChatId(
    chatId: string
  ): Promise<'en' | 'fr'> {
    try {
      const config = await this.telegramConfigRepository.findOne({
        where: { chat_id: chatId, status: TelegramLinkStatus.LINKED },
      });

      if (!config) {
        return 'en';
      }

      return await this.userLanguageService.getUserLanguage(config.userId);
    } catch (error) {
      this.logger.warn(
        `⚠️ Unable to get user language for chatId ${chatId}, defaulting to 'en'`,
        error
      );
      return 'en';
    }
  }
}
