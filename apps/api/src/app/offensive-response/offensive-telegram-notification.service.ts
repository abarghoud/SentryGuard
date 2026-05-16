import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import { UserLanguageService } from '../user/user-language.service';
import i18n from '../../i18n';

@Injectable()
export class OffensiveTelegramNotificationService {
  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly telegramBotService: TelegramBotService,
    private readonly userLanguageService: UserLanguageService,
  ) {}

  async notifyActivated(vehicle: Vehicle, durationMinutes: number): Promise<void> {
    const config = await this.findLinkedConfig(vehicle.userId);
    if (!config) return;

    const lng = await this.userLanguageService.getUserLanguage(config.userId);
    const vehicleName = vehicle.display_name || vehicle.vin;
    const durationLabel = this.formatDuration(durationMinutes, lng);

    const chatId = config.chat_id;
    if (!chatId) return;

    const message = i18n.t('offensiveActivatedForSentry', { lng, vehicle: vehicleName, duration: durationLabel });

    await this.telegramBotService.sendMessage(chatId, message);
  }

  async notifyDeactivated(vehicle: Vehicle): Promise<void> {
    const config = await this.findLinkedConfig(vehicle.userId);
    if (!config) return;

    const chatId = config.chat_id;
    if (!chatId) return;

    const lng = await this.userLanguageService.getUserLanguage(config.userId);
    const vehicleName = vehicle.display_name || vehicle.vin;

    const message = i18n.t('offensiveDeactivatedAutoSentry', { lng, vehicle: vehicleName });

    await this.telegramBotService.sendMessage(chatId, message);
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

  private async findLinkedConfig(userId: string): Promise<TelegramConfig | null> {
    return this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });
  }
}
