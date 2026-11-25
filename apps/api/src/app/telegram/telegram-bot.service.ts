import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context, Telegram } from 'telegraf';
import type { Request, Response } from 'express';
import type { AbortSignal as TelegrafAbortSignal } from 'abort-controller';
import { TelegramMessageOptions } from './telegram.types';
import { TelegramMessageHelper } from './telegram-message.helper';
import { TelegramWebhookRegistrationService } from './telegram-webhook-registration.service';
import { TelegramWebhookTarget } from './telegram-webhook.types';
import { createIpv4HttpsAgent } from '../../common/utils/ipv4-network.util';
import { CaughtError } from '../../common/utils/caught-error';

const MAX_SHARED_SOCKETS = Infinity;
const MIN_WEBHOOK_SECRET_PATH_LENGTH = 16;
const MIN_WEBHOOK_SECRET_TOKEN_LENGTH = 24;

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
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

  constructor(private readonly telegramWebhookRegistrationService: TelegramWebhookRegistrationService) {}

  public async onModuleInit(): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN not defined, Telegram bot disabled');
      return;
    }

    this.bot = new Telegraf(this.botToken, { telegram: { agent: createIpv4HttpsAgent(MAX_SHARED_SOCKETS) } });
    await (this.mode === 'polling' ? this.setupPollingMode() : this.setupWebhookMode(this.bot));
  }

  public onModuleDestroy(): void {
    if (this.bot && this.mode === 'polling') {
      try {
        this.bot.stop('SIGTERM');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Error stopping Telegram bot: ${message}`);
      }
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

  public async getBotUsername(): Promise<string> {
    const fallbackUsername = process.env.TELEGRAM_BOT_USERNAME || 'SentryGuard_Bot';
    if (!this.bot) {
      return fallbackUsername;
    }

    return this.bot.botInfo?.username ?? (await this.fetchBotUsername(this.bot.telegram)) ?? fallbackUsername;
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

  public async sendMessage(
    chatId: string,
    message: string,
    options?: TelegramMessageOptions,
    signal?: AbortSignal,
    useFreshConnection = false
  ): Promise<boolean> {
    if (!this.bot || !this.botToken) {
      this.logger.warn('⚠️ Telegram bot not initialized');
      return false;
    }

    const payload = { chat_id: chatId, text: message, ...TelegramMessageHelper.buildOptions(options) };
    const callOptions = { signal: signal as TelegrafAbortSignal | undefined };
    await (useFreshConnection ? this.sendOverFreshConnection(payload, callOptions) : this.bot.telegram.callApi('sendMessage', payload, callOptions));
    this.logger.log(`📱 Message sent to chat_id: ${chatId}${useFreshConnection ? ' (fresh connection)' : ''}`);
    return true;
  }

  private async sendOverFreshConnection(
    payload: Parameters<Telegram['callApi']>[1],
    callOptions: Parameters<Telegram['callApi']>[2]
  ): Promise<void> {
    const agent = createIpv4HttpsAgent(1);

    try {
      await new Telegram(this.botToken as string, { agent }).callApi('sendMessage', payload, callOptions);
    } finally {
      agent.destroy();
    }
  }

  private async fetchBotUsername(telegram: Telegram): Promise<string | undefined> {
    try {
      const botProfile = await telegram.getMe();
      return botProfile.username;
    } catch (error) {
      this.logger.error(`❌ Error while trying to get bot username: ${new CaughtError(error).describe()}`);
      return undefined;
    }
  }

  private async setupPollingMode() {
    if (!this.bot) return;

    this.logger.log('🔄 Configuring bot in polling mode...');

    try {
      this.bot.launch();

      this.logger.log('✅ Telegram bot running in polling mode.');
    } catch (error) {
      this.logger.error(`❌ Error while trying to run polling: ${new CaughtError(error).describe()}`);
      throw error;
    }
  }

  private async setupWebhookMode(bot: Telegraf<Context>): Promise<void> {
    const target = this.resolveWebhookTarget();
    if (!target) {
      return;
    }

    this.webhookCallback = bot.webhookCallback(target.path);
    void this.telegramWebhookRegistrationService.registerUntilReady(bot, target);
  }

  private resolveWebhookTarget(): TelegramWebhookTarget | null {
    const secretPath = this.getWebhookSecretPath();
    if (!this.isWebhookConfigurationValid(secretPath)) {
      return null;
    }

    const path = this.getWebhookPath(secretPath);
    const url = `${(this.webhookBaseUrl ?? '').replace(/\/$/, '')}${path}`;
    return { path, secretToken: this.webhookSecretToken ?? '', url };
  }

  private isWebhookConfigurationValid(secretPath: string): boolean {
    if (!this.webhookBaseUrl) {
      this.logger.warn('⚠️ TELEGRAM_WEBHOOK_BASE not defined, Telegram bot webhook disabled');
      return false;
    }

    return this.isWebhookSecretPathValid(secretPath) && this.exitOnWeakSecretToken();
  }

  private isWebhookSecretPathValid(secretPath: string): boolean {
    if (secretPath.length < MIN_WEBHOOK_SECRET_PATH_LENGTH) {
      this.logger.error('❌ TELEGRAM_WEBHOOK_SECRET_PATH must be a non-guessable value (16+ chars)');
      return false;
    }

    return true;
  }

  private exitOnWeakSecretToken(): boolean {
    if (!this.webhookSecretToken || this.webhookSecretToken.length < MIN_WEBHOOK_SECRET_TOKEN_LENGTH) {
      this.logger.error('❌ TELEGRAM_WEBHOOK_SECRET_TOKEN must be defined (24+ chars) to accept webhook updates');
      process.exit(1);
    }

    return true;
  }

  private getWebhookPath(secretPath: string): string {
    return `/telegram/webhook/${secretPath}`;
  }
}
