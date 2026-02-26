import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import i18n from '../../i18n';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramMessageOptions, buildTelegramOptions, formatRemainingTime } from './telegram.types';

@Injectable()
export class TelegramStatusService implements OnModuleInit {
  private readonly logger = new Logger(TelegramStatusService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly botService: TelegramBotService,
    private readonly keyboardBuilderService: TelegramKeyboardBuilderService,
    private readonly contextService: TelegramContextService,
  ) {}

  onModuleInit(): void {
    this.botService.registerHears(
      [i18n.t('menuButtonStatus', { lng: 'en' }), i18n.t('menuButtonStatus', { lng: 'fr' })],
      async (ctx) => this.handleStatusButton(ctx)
    );

    this.botService.registerAction('menu:open', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleStatusButton(ctx);
    });

    this.botService.registerCommand('status', async (ctx) => this.handleStatusButton(ctx));
    this.botService.registerHelp(async (ctx) => this.handleHelp(ctx));
  }

  private async handleStatusButton(ctx: Context): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const lng = await this.contextService.getUserLanguageFromChatId(chatId);
    const config = await this.telegramConfigRepository.findOne({
      where: { chat_id: chatId, status: TelegramLinkStatus.LINKED },
    });

    if (!config) {
      await this.safeReply(ctx, i18n.t('No account linked', { lng }));
      return;
    }

    const vehicles = await this.vehicleRepository.find({ where: { userId: config.userId } });
    await this.safeReply(
      ctx,
      this.buildConfigurationStatusMessage(config, vehicles, lng),
      this.keyboardBuilderService.buildMainMenuKeyboard(lng, config.muted_until)
    );
  }

  private async handleHelp(ctx: Context): Promise<void> {
    const lng = await this.contextService.getUserLanguageFromChatId(ctx.chat.id.toString());
    await ctx.reply(i18n.t('Available commands', { lng }));
  }

  private buildConfigurationStatusMessage(config: TelegramConfig, vehicles: Vehicle[], lng: 'en' | 'fr'): string {
    return [
      i18n.t('configStatusTitle', { lng }),
      '',
      this.buildTelegramSection(config, lng),
      '',
      this.buildVehiclesSection(vehicles, lng),
    ].join('\n');
  }

  private buildTelegramSection(config: TelegramConfig, lng: 'en' | 'fr'): string {
    const locale = lng === 'fr' ? 'fr-FR' : 'en-GB';
    const date = config.linked_at
      ? config.linked_at.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const lines = [
      i18n.t('configStatusTelegram', { lng }),
      i18n.t('configStatusTelegramLinked', { lng, date }),
    ];

    if (config.muted_until && new Date() < config.muted_until) {
      lines.push(i18n.t('configStatusMutedUntil', { lng, duration: formatRemainingTime(config.muted_until) }));
    }

    return lines.join('\n');
  }

  private buildVehiclesSection(vehicles: Vehicle[], lng: 'en' | 'fr'): string {
    const header = i18n.t('configStatusVehicles', { lng });

    if (vehicles.length === 0) {
      return [header, i18n.t('configStatusNoVehicles', { lng })].join('\n');
    }

    return [header, ...vehicles.map((vehicle) => this.buildVehicleLine(vehicle, lng))].join('\n');
  }

  private buildVehicleLine(vehicle: Vehicle, lng: 'en' | 'fr'): string {
    const name = vehicle.display_name || vehicle.vin;
    const telemetryKey = vehicle.telemetry_enabled ? 'configStatusTelemetryActive' : 'configStatusTelemetryInactive';

    return `• ${name} — ${i18n.t(telemetryKey, { lng })}`;
  }

  private async safeReply(ctx: Context, message: string, options?: TelegramMessageOptions): Promise<void> {
    try {
      const telegramOptions = buildTelegramOptions(options);
      await ctx.reply(message, Object.keys(telegramOptions).length > 1 ? telegramOptions : undefined);
    } catch (error) {
      this.logger.warn(`⚠️ Could not send message to user (possibly blocked the bot): ${error}`, error);
    }
  }
}