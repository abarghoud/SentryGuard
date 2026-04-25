import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { OffensiveResponseService } from '../alerts/services/offensive-response.service';
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
    private readonly offensiveResponseService: OffensiveResponseService,
  ) {}

  onModuleInit(): void {
    const { withChatId } = TelegramMessageHelper;

    this.botService.registerHears(
      [
        i18n.t('menuButtonOffensive', { lng: 'en' }),
        i18n.t('menuButtonOffensive', { lng: 'fr' }),
      ],
      withChatId((ctx, chatId) => this.handleOffensiveButton(ctx, chatId)),
    );

    this.botService.registerAction(/^o_sl:(.+)$/, withChatId((ctx, chatId) => this.handleVehicleSelection(ctx, chatId)));
    this.botService.registerAction(/^o_s:(.+):(.+)$/, withChatId((ctx, chatId) => this.handleSetResponse(ctx, chatId)));
    this.botService.registerAction(/^o_t:(.+)$/, withChatId((ctx, chatId) => this.handleTestResponse(ctx, chatId)));
  }

  private async handleOffensiveButton(ctx: Context, chatId: string): Promise<void> {
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
      await this.showResponseOptions(ctx, lng, vehicles[0]);
      return;
    }

    await this.safeReply(ctx, i18n.t('offensiveSelectVehicle', { lng }), this.keyboardBuilderService.buildVehicleSelectionKeyboard(vehicles, 'offensive'));
  }

  private async handleVehicleSelection(ctx: Context, chatId: string): Promise<void> {
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

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.showResponseOptions(ctx, lng, vehicle);
  }

  private async handleSetResponse(ctx: Context, chatId: string): Promise<void> {
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

    vehicle.offensive_response = responseValue;
    await this.vehicleRepository.save(vehicle);

    this.logger.log(`[OFFENSIVE] Updated vehicle ${vehicle.vin} to ${responseValue}`);

    const vehicleName = vehicle.display_name || vehicle.vin;
    const responseLabel = this.getResponseLabel(responseValue, lng);

    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.safeReply(ctx, i18n.t('offensiveConfirmed', { lng, vehicle: vehicleName, response: responseLabel }), this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until));
  }

  private async handleTestResponse(ctx: Context, chatId: string): Promise<void> {
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

    if (vehicle.offensive_response === OffensiveResponse.DISABLED) {
      await ctx.answerCbQuery({ text: i18n.t('offensiveTestDisabled', { lng }), show_alert: true });
      return;
    }

    await ctx.answerCbQuery({ text: `⚡ ${i18n.t('offensiveTestTriggered', { lng })}` });

    this.logger.log(`[OFFENSIVE] Test triggered via Telegram for VIN ${vehicle.vin}`);

    try {
      await this.offensiveResponseService.handleOffensiveResponse(vehicle.vin);
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Test request failed for VIN ${vehicle.vin}`, error);
    }
  }

  private async showResponseOptions(ctx: Context, lng: 'en' | 'fr', vehicle: Vehicle): Promise<void> {
    const vehicleName = vehicle.display_name || vehicle.vin;
    const keyboard = this.keyboardBuilderService.buildOffensiveResponseKeyboard(vehicle.id, vehicle.offensive_response, lng);
    await this.safeReply(ctx, i18n.t('offensiveChooseResponse', { lng, vehicle: vehicleName }), keyboard);
  }

  private getResponseLabel(response: OffensiveResponse, lng: 'en' | 'fr'): string {
    const labels: Record<OffensiveResponse, string> = {
      [OffensiveResponse.DISABLED]: i18n.t('offensiveDisabled', { lng }),
      [OffensiveResponse.FLASH]: i18n.t('offensiveFlash', { lng }),
      [OffensiveResponse.HONK]: i18n.t('offensiveHonk', { lng }),
      [OffensiveResponse.FLASH_AND_HONK]: i18n.t('offensiveFlashAndHonk', { lng }),
    };
    return labels[response];
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

  private async safeReply(ctx: Context, message: string, options?: TelegramMessageOptions): Promise<void> {
    await TelegramMessageHelper.safeReply(ctx, message, options, this.logger);
  }
}