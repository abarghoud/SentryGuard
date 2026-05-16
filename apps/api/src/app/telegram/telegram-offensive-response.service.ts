import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { VehicleOffensiveResponseConfigService } from '../offensive-response/vehicle-offensive-response-config.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramMessageHelper } from './telegram-message.helper';
import { TelegramMessageOptions } from './telegram.types';

@Injectable()
export class TelegramOffensiveResponseService implements OnModuleInit {
  private readonly logger = new Logger(TelegramOffensiveResponseService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly botService: TelegramBotService,
    private readonly keyboardBuilderService: TelegramKeyboardBuilderService,
    private readonly contextService: TelegramContextService,
    private readonly offensiveResponseService: AlertsOffensiveResponseService,
    private readonly vehicleOffensiveResponseConfigService: VehicleOffensiveResponseConfigService,
  ) {}

  onModuleInit(): void {
    const { withChatId } = TelegramMessageHelper;

    this.botService.registerHears(
      [
        i18n.t('menuButtonSentry', { lng: 'en' }),
        i18n.t('menuButtonSentry', { lng: 'fr' }),
      ],
      withChatId((ctx, chatId) => this.handleOffensiveButton(ctx, chatId, 'sentry')),
    );

    this.botService.registerHears(
      [
        i18n.t('menuButtonBreakIn', { lng: 'en' }),
        i18n.t('menuButtonBreakIn', { lng: 'fr' }),
      ],
      withChatId((ctx, chatId) => this.handleOffensiveButton(ctx, chatId, 'break_in')),
    );

    this.botService.registerAction(/^o_sl:(sentry|break_in):(.+)$/, withChatId((ctx, chatId) => this.handleVehicleSelection(ctx, chatId)));
    this.botService.registerAction(/^o_ss:(.+):(.+)$/, withChatId((ctx, chatId) => this.handleSetSentryResponse(ctx, chatId)));
    this.botService.registerAction(/^o_sb:(.+):(.+)$/, withChatId((ctx, chatId) => this.handleSetBreakInResponse(ctx, chatId)));
    this.botService.registerAction(/^o_ts:(.+)$/, withChatId((ctx, chatId) => this.handleTestSentryResponse(ctx, chatId)));
    this.botService.registerAction(/^o_tb:(.+)$/, withChatId((ctx, chatId) => this.handleTestBreakInResponse(ctx, chatId)));
    this.botService.registerAction(/^od(\d+):(.+)$/, withChatId((ctx, chatId) => this.handleSetDuration(ctx, chatId)));
    this.botService.registerAction(/^od_cancel:(.+)$/, withChatId((ctx, chatId) => this.handleCancelDuration(ctx, chatId)));
    this.botService.registerAction(/^od_prolong:(.+)$/, withChatId((ctx, chatId) => this.handleProlongDuration(ctx, chatId)));
  }

  private async handleOffensiveButton(ctx: Context, chatId: string, alertType: 'sentry' | 'break_in'): Promise<void> {
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config) {
      await this.safeReply(ctx, i18n.t('No account linked', { lng }));
      return;
    }

    const vehicles = await this.findUserVehicles(config.userId);

    if (vehicles.length === 0) {
      await this.safeReply(ctx, i18n.t('offensiveNoVehicles', { lng }));
      return;
    }

    if (vehicles.length === 1) {
      await this.showTypeOptions(ctx, lng, vehicles[0], alertType);
      return;
    }

    await this.safeReply(ctx, i18n.t('offensiveSelectVehicle', { lng }), this.keyboardBuilderService.buildVehicleSelectionKeyboard(vehicles, alertType));
  }

  private async handleVehicleSelection(ctx: Context, chatId: string): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const alertType = match?.[1] as 'sentry' | 'break_in';
    const vehicleId = match?.[2];
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config || !vehicleId) {
      await ctx.answerCbQuery();
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId, userId: config.userId } });

    if (!vehicle) {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.showTypeOptions(ctx, lng, vehicle, alertType);
  }

  private async showTypeOptions(ctx: Context, lng: 'en' | 'fr', vehicle: Vehicle, alertType: 'sentry' | 'break_in'): Promise<void> {
    const vehicleName = vehicle.display_name || vehicle.vin;

    if (alertType === 'sentry' && vehicle.sentry_offensive_response === OffensiveResponse.HONK && vehicle.sentry_offensive_response_until) {
      const remaining = vehicle.sentry_offensive_response_until.getTime() - Date.now();

      if (remaining > 0) {
        const remainingLabel = this.formatDuration(Math.ceil(remaining / 60000), lng);
        const expiresKey = alertType === 'sentry' ? 'offensiveExpiresInSentry' : 'offensiveExpiresIn';
        const keyboard = this.keyboardBuilderService.buildActiveSentryKeyboard(vehicle.id, lng);
        await this.safeReply(ctx, i18n.t(expiresKey, { lng, vehicle: vehicleName, time: remainingLabel }), keyboard);
        return;
      }
    }

    const currentValue = alertType === 'sentry' ? vehicle.sentry_offensive_response : vehicle.break_in_offensive_response;
    const keyboard = this.keyboardBuilderService.buildOffensiveTypeKeyboard(vehicle.id, alertType, currentValue, lng);
    const label = alertType === 'sentry' ? 'Sentry' : 'Break-In';
    await this.safeReply(ctx, i18n.t('offensiveChooseResponse', { lng, vehicle: vehicleName }) + `\n<b>${label}</b>`, keyboard);
  }

  private async handleSetSentryResponse(ctx: Context, chatId: string): Promise<void> {
    await this.handleSetResponse(ctx, chatId, 'sentry');
  }

  private async handleSetBreakInResponse(ctx: Context, chatId: string): Promise<void> {
    await this.handleSetResponse(ctx, chatId, 'break_in');
  }

  private async handleSetResponse(ctx: Context, chatId: string, alertType: 'sentry' | 'break_in'): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const vehicleId = match?.[1];
    const responseValue = match?.[2] as OffensiveResponse;
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config || !vehicleId || !responseValue) {
      await ctx.answerCbQuery();
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId, userId: config.userId } });

    if (!vehicle) {
      await ctx.answerCbQuery();
      return;
    }

    if (alertType === 'sentry' && responseValue === OffensiveResponse.HONK) {
      await ctx.answerCbQuery();
      await ctx.deleteMessage();
      await this.safeReply(ctx, i18n.t('offensiveChooseDuration', { lng }), this.keyboardBuilderService.buildDurationKeyboard(vehicleId, lng));
      return;
    }

    if (alertType === 'sentry') {
      vehicle.sentry_offensive_response = responseValue;
      vehicle.sentry_offensive_response_until = null;
    } else {
      vehicle.break_in_offensive_response = responseValue;
    }

    await this.vehicleRepository.save(vehicle);

    this.logger.log(`[OFFENSIVE] Updated ${alertType} response for vehicle ${vehicle.vin} to ${responseValue}`);

    const vehicleName = vehicle.display_name || vehicle.vin;
    const responseLabel = this.getResponseLabel(responseValue, lng);
    const typeLabel = alertType === 'sentry' ? 'Sentry' : 'Break-In';

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, i18n.t('offensiveConfirmed', { lng, vehicle: vehicleName, response: `${typeLabel}: ${responseLabel}` }), this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until));
  }

  private async handleSetDuration(ctx: Context, chatId: string): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const durationMinutes = parseInt(match?.[1], 10);
    const vehicleId = match?.[2];
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config || !vehicleId || isNaN(durationMinutes)) {
      await ctx.answerCbQuery();
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId, userId: config.userId } });

    if (!vehicle) {
      await ctx.answerCbQuery();
      return;
    }

    const result = await this.vehicleOffensiveResponseConfigService.setSentryOffensiveWithDuration(config.userId, vehicle.vin, durationMinutes, true);

    if (!result.success) {
      await this.answerCbQuery(ctx, i18n.t('offensiveError', { lng }), true);
      return;
    }

    this.logger.log(`[OFFENSIVE] Sentry horn activated for ${durationMinutes}min on vehicle ${vehicle.vin}`);

    const vehicleName = vehicle.display_name || vehicle.vin;
    const durationLabel = this.formatDuration(durationMinutes, lng);

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, i18n.t('offensiveActivatedForSentry', { lng, vehicle: vehicleName, duration: durationLabel }), this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until));
  }

  private async handleCancelDuration(ctx: Context, chatId: string): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const vehicleId = match?.[1];
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config || !vehicleId) {
      await ctx.answerCbQuery();
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId, userId: config.userId } });

    if (!vehicle) {
      await ctx.answerCbQuery();
      return;
    }

    const result = await this.vehicleOffensiveResponseConfigService.disableSentryOffensive(config.userId, vehicle.vin);

    if (!result.success) {
      await this.answerCbQuery(ctx, i18n.t('offensiveError', { lng }), true);
      return;
    }

    const vehicleName = vehicle.display_name || vehicle.vin;

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, i18n.t('offensiveDisabledMsgSentry', { lng, vehicle: vehicleName }), this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until));
  }

  private async handleProlongDuration(ctx: Context, chatId: string): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const vehicleId = match?.[1];
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);

    if (!vehicleId) {
      await ctx.answerCbQuery();
      return;
    }

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, i18n.t('offensiveChooseDuration', { lng }), this.keyboardBuilderService.buildDurationKeyboard(vehicleId, lng));
  }

  private async handleTestSentryResponse(ctx: Context, chatId: string): Promise<void> {
    await this.handleTestResponse(ctx, chatId, 'sentry');
  }

  private async handleTestBreakInResponse(ctx: Context, chatId: string): Promise<void> {
    await this.handleTestResponse(ctx, chatId, 'break_in');
  }

  private async handleTestResponse(ctx: Context, chatId: string, alertType: 'sentry' | 'break_in'): Promise<void> {
    const match = (ctx as unknown as { match: string[] }).match;
    const vehicleId = match?.[1];
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.findLinkedConfig(chatId);

    if (!config || !vehicleId) {
      await ctx.answerCbQuery();
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId, userId: config.userId } });

    if (!vehicle) {
      await ctx.answerCbQuery();
      return;
    }

    const responseValue = alertType === 'sentry' ? vehicle.sentry_offensive_response : vehicle.break_in_offensive_response;

    if (responseValue === OffensiveResponse.DISABLED) {
      await this.answerCbQuery(ctx, i18n.t('offensiveTestDisabled', { lng }), true);
      return;
    }

    await this.answerCbQuery(ctx, `⚡ ${i18n.t('offensiveTestTriggered', { lng })}`);

    this.logger.log(`[OFFENSIVE] Test ${alertType} response triggered via Telegram for VIN ${vehicle.vin}`);

    try {
      if (alertType === 'sentry') {
        await this.offensiveResponseService.handleSentryOffensiveResponse(vehicle.vin);
      } else {
        await this.offensiveResponseService.handleBreakInOffensiveResponse(vehicle.vin);
      }
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Test request failed for VIN ${vehicle.vin}`, error);
    }
  }

  private getResponseLabel(response: OffensiveResponse, lng: 'en' | 'fr'): string {
    const labels: Record<OffensiveResponse, string> = {
      [OffensiveResponse.DISABLED]: i18n.t('offensiveDisabled', { lng }),
      [OffensiveResponse.HONK]: i18n.t('offensiveHonk', { lng }),
    };
    return labels[response];
  }

  private formatDuration(minutes: number, lng: 'en' | 'fr'): string {
    if (minutes < 60) {
      return lng === 'fr' ? `${minutes} min` : `${minutes} min`;
    }

    const hours = minutes / 60;

    if (Number.isInteger(hours)) {
      return lng === 'fr' ? `${hours}h` : `${hours}h`;
    }

    const h = Math.floor(hours);
    const m = minutes - h * 60;
    return lng === 'fr' ? `${h}h${m}` : `${h}h${m}m`;
  }

  private async findLinkedConfig(chatId: string): Promise<TelegramConfig | null> {
    return this.telegramConfigRepository.findOne({
      where: { chat_id: chatId, status: TelegramLinkStatus.LINKED },
    });
  }

  private async findUserVehicles(userId: string): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { userId },
      order: { created_at: 'ASC' },
    });
  }

  private async answerCbQuery(ctx: Context, text: string, showAlert = false): Promise<void> {
    await ctx.answerCbQuery({ text, show_alert: showAlert } as unknown as string);
  }

  private async safeReply(ctx: Context, message: string, options?: TelegramMessageOptions): Promise<void> {
    await TelegramMessageHelper.safeReply(ctx, message, options, this.logger);
  }
}