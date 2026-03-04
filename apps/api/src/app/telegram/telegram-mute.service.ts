import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramMessageOptions } from './telegram.types';
import { TelegramMessageHelper, MILLISECONDS_PER_MINUTE } from './telegram-message.helper';

@Injectable()
export class TelegramMuteService implements OnModuleInit {
  private readonly logger = new Logger(TelegramMuteService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly botService: TelegramBotService,
    private readonly keyboardBuilderService: TelegramKeyboardBuilderService,
    private readonly contextService: TelegramContextService,
  ) {}

  async checkIsNotificationMuted(userId: string): Promise<boolean> {
    const config = await this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });

    if (!config) {
      this.logger.debug(`[MUTE_CHECK] No linked config found for user ${userId} — alert will be skipped`);
      return false;
    }

    const mutedUntil = config.muted_until;
    const isMuted = mutedUntil != null && new Date() < mutedUntil;

    if (isMuted) {
      this.logger.log(`[MUTE_CHECK] Alerts muted for user ${userId} until ${mutedUntil.toISOString()}`);
    } else {
      this.logger.debug(`[MUTE_CHECK] Alerts active for user ${userId}`);
    }

    return isMuted;
  }

  onModuleInit(): void {
    const { withChatId } = TelegramMessageHelper;

    this.botService.registerHears(
      [
        i18n.t('menuButtonMute', { lng: 'en' }),
        i18n.t('menuButtonMute', { lng: 'fr' }),
        i18n.t('menuButtonMuteActive', { lng: 'en' }),
        i18n.t('menuButtonMuteActive', { lng: 'fr' }),
      ],
      withChatId((ctx, chatId) => this.handleMuteButton(ctx, chatId))
    );

    this.botService.registerAction(/^mute:(\d+)$/, withChatId((ctx, chatId) => this.handleMuteDuration(ctx, chatId)));
    this.botService.registerAction('mute:reactivate', withChatId((ctx, chatId) => this.handleMuteReactivate(ctx, chatId)));
    this.botService.registerAction('mute:change', withChatId((ctx, chatId) => this.handleMuteChange(ctx, chatId)));
    this.botService.registerAction('mute:cancel', async (ctx) => this.handleMuteCancel(ctx));
  }

  private async handleMuteButton(ctx: Context, chatId: string): Promise<void> {
    const [lng, config] = await Promise.all([
      this.contextService.getUserLanguageFromChatId(chatId),
      this.telegramConfigRepository.findOne({ where: { chat_id: chatId, status: TelegramLinkStatus.LINKED } }),
    ]);

    if (config?.muted_until && new Date() < config.muted_until) {
      const duration = TelegramMessageHelper.formatRemainingTime(config.muted_until);
      await this.safeReply(ctx, i18n.t('muteAlreadyActive', { lng, duration }), this.keyboardBuilderService.buildMuteActiveKeyboard(lng));
    } else {
      await this.safeReply(ctx, i18n.t('muteDurationTitle', { lng }), this.keyboardBuilderService.buildMuteDurationKeyboard());
    }
  }

  private async handleMuteDuration(ctx: Context, chatId: string): Promise<void> {
    const MAX_MUTE_MINUTES = 1440;

    try {
      const minutes = Math.min(parseInt(ctx.match[1]), MAX_MUTE_MINUTES);
      const lng = await this.contextService.getUserLanguageFromChatId(chatId);
      const mutedUntil = new Date(Date.now() + minutes * MILLISECONDS_PER_MINUTE);

      await this.saveMutedUntil(chatId, mutedUntil);
      this.logger.log(`[MUTE] chat_id=${chatId} muted for ${minutes}min until ${mutedUntil.toISOString()}`);
      await this.confirmMute(ctx, mutedUntil, lng);
    } catch (error) {
      this.logger.warn(`⚠️ Error handling mute duration: ${error}`, error);
      await ctx.answerCbQuery();
    }
  }

  private async handleMuteReactivate(ctx: Context, chatId: string): Promise<void> {
    try {
      const lng = await this.contextService.getUserLanguageFromChatId(chatId);
      await this.clearMutedUntil(chatId);
      this.logger.log(`[MUTE] chat_id=${chatId} reactivated alerts`);
      await Promise.all([ctx.answerCbQuery(), ctx.deleteMessage()]);
      await this.safeReply(ctx, i18n.t('muteReactivated', { lng }), this.keyboardBuilderService.buildMainMenuKeyboard(lng));
    } catch (error) {
      this.logger.warn(`⚠️ Error handling mute reactivate: ${error}`, error);
      await ctx.answerCbQuery();
    }
  }

  private async handleMuteChange(ctx: Context, chatId: string): Promise<void> {
    try {
      const lng = await this.contextService.getUserLanguageFromChatId(chatId);
      this.logger.log(`[MUTE] chat_id=${chatId} requested duration change`);
      await ctx.answerCbQuery();
      await ctx.deleteMessage();
      await this.safeReply(ctx, i18n.t('muteDurationTitle', { lng }), this.keyboardBuilderService.buildMuteDurationKeyboard());
    } catch (error) {
      this.logger.warn(`⚠️ Error handling mute change: ${error}`, error);
      await ctx.answerCbQuery();
    }
  }

  private async handleMuteCancel(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery();
      await ctx.deleteMessage();
    } catch (error) {
      this.logger.warn(`⚠️ Error handling mute cancel: ${error}`, error);
    }
  }

  private async saveMutedUntil(chatId: string, mutedUntil: Date): Promise<void> {
    await this.telegramConfigRepository.update(
      { chat_id: chatId, status: TelegramLinkStatus.LINKED },
      { muted_until: mutedUntil }
    );
  }

  private async clearMutedUntil(chatId: string): Promise<void> {
    await this.telegramConfigRepository.update(
      { chat_id: chatId, status: TelegramLinkStatus.LINKED },
      { muted_until: null }
    );
  }

  private async confirmMute(ctx: Context, mutedUntil: Date, lng: 'en' | 'fr'): Promise<void> {
    const confirmation = i18n.t('muteConfirmed', { lng, duration: TelegramMessageHelper.formatRemainingTime(mutedUntil) });
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, confirmation, this.keyboardBuilderService.buildMainMenuKeyboard(lng, mutedUntil));
  }

  private async safeReply(ctx: Context, message: string, options?: TelegramMessageOptions): Promise<void> {
    await TelegramMessageHelper.safeReply(ctx, message, options, this.logger);
  }
}