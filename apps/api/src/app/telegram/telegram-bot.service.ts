import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import type { Request, Response } from 'express';
import { TelegramMessageOptions } from './telegram.types';
import { TelegramMessageHelper } from './telegram-message.helper';

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

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn(
        '⚠️ TELEGRAM_BOT_TOKEN not defined, Telegram bot disabled'
      );
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);

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

  public registerStart(handler: (ctx: Context) => Promise<void>): void {
    this.bot?.start(handler);
  }

  public registerHears(patterns: string[], handler: (ctx: Context) => Promise<void>): void {
    this.bot?.hears(patterns, handler);
  }

  public registerAction(trigger: string | RegExp, handler: (ctx: Context) => Promise<void>): void {
    this.bot?.action(trigger, handler);
  }

  public registerCommand(command: string, handler: (ctx: Context) => Promise<void>): void {
    this.bot?.command(command, handler);
  }

  public registerHelp(handler: (ctx: Context) => Promise<void>): void {
    this.bot?.help(handler);
  }

  async getBotUsername(): Promise<string | null> {
    if (!this.bot) {
      return process.env.TELEGRAM_BOT_USERNAME || null;
    }

    try {
      const botProfile = await this.bot.telegram.getMe();
      return botProfile.username || null;
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

  async handleUpdate(req: Request, res: Response): Promise<void> {
    if (!this.webhookCallback) {
      this.logger.warn('⚠️ Webhook not initialized');
      res.status(503).send('Webhook not configured');
      return;
    }

    return this.webhookCallback(req, res);
  }

  async sendMessage(
    chatId: string,
    message: string,
    options?: TelegramMessageOptions
  ): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn('⚠️ Telegram bot not initialized');
      return false;
    }

    const telegramOptions = TelegramMessageHelper.buildOptions(options);
    await this.bot.telegram.sendMessage(chatId, message, telegramOptions);

    this.logger.log(`📱 Message sent to chat_id: ${chatId}`);
    return true;
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

  private getWebhookPath(secretPath: string): string {
    return `/telegram/webhook/${secretPath}`;
  }
}