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
  private webhookCallback:
    | ReturnType<Telegraf<Context>['webhookCallback']>
    | null = null;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly userLanguageService: UserLanguageService
  ) {}

  /**
   * Initialise le bot au démarrage du module
   */
  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn(
        '⚠️ TELEGRAM_BOT_TOKEN not defined, Telegram bot disabled'
      );
      return;
    }

    if (!this.webhookBaseUrl) {
      this.logger.warn(
        '⚠️ TELEGRAM_WEBHOOK_BASE not defined, Telegram bot webhook disabled (no polling fallback to avoid multi-instance conflicts)'
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
      this.bot = new Telegraf(this.botToken);

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

      const webhookPath = this.getWebhookPath(sanitizedWebhookPath);
      const webhookUrl = `${this.webhookBaseUrl.replace(/\/$/, '')}${webhookPath}`;

      await this.bot.telegram.setWebhook(webhookUrl, {
        secret_token: this.webhookSecretToken,
        drop_pending_updates: true,
      });

      this.webhookCallback = this.bot.webhookCallback(webhookPath);
      this.logger.log(
        `✅ Telegram bot configuré en webhook sur ${webhookUrl} (secret path sécurisé)`
      );

      // Graceful stop
      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } catch (error) {
      this.logger.error('❌ Telegram bot initialization error:', error);
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
        await ctx.reply(i18n.t('Invalid or expired token', { lng }));
        return;
      }

      if (config.expires_at && new Date() > config.expires_at) {
        config.status = TelegramLinkStatus.EXPIRED;
        await this.telegramConfigRepository.save(config);
        await ctx.reply(i18n.t('This token has expired', { lng }));
        return;
      }

      const chatId = ctx.chat?.id?.toString();
      if (!chatId) {
        this.logger.warn('⚠️ chatId manquant dans la mise à jour Telegram');
        await ctx.reply('❌ Unable to process this request.');
        return;
      }
      config.chat_id = chatId;
      config.status = TelegramLinkStatus.LINKED;
      config.linked_at = new Date();
      await this.telegramConfigRepository.save(config);

      this.logger.log(
        `✅ Compte lié: userId=${config.userId}, chatId=${chatId}`
      );

      await ctx.reply(
        i18n.t('Your SentryGuard account has been linked successfully!', { lng })
      );
    } catch (error) {
      this.logger.error('❌ Erreur lors de la liaison du token:', error);
      await ctx.reply(
        '❌ Une erreur est survenue. Veuillez réessayer plus tard.'
      );
    }
  }

  /**
   * Envoie un message à un utilisateur spécifique
   */
  async sendMessageToUser(userId: string, message: string): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn('⚠️ Bot Telegram non initialisé');
      return false;
    }

    try {
      // Récupérer la configuration de l'utilisateur
      const config = await this.telegramConfigRepository.findOne({
        where: { userId, status: TelegramLinkStatus.LINKED },
      });

      if (!config || !config.chat_id) {
        this.logger.warn(
          `⚠️ Aucun chat_id trouvé pour l'utilisateur: ${userId}`
        );
        return false;
      }

      await this.bot.telegram.sendMessage(config.chat_id, message, {
        parse_mode: 'HTML',
      });

      this.logger.log(`📱 Message envoyé à l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de l'envoi du message à ${userId}:`,
        error
      );
      return false;
    }
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
        '❌ Erreur lors de la récupération du bot username:',
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
      this.logger.warn('⚠️ Webhook non initialisé');
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
