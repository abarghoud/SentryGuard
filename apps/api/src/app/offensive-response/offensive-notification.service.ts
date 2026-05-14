import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import i18n from '../../i18n';

@Injectable()
export class OffensiveNotificationService {
  private readonly logger = new Logger(OffensiveNotificationService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async notifyActivated(vehicle: Vehicle, durationMinutes: number): Promise<void> {
    const config = await this.findLinkedConfig(vehicle.userId);
    if (!config) return;

    const lng = config.language === 'fr' ? 'fr' : 'en';
    const vehicleName = vehicle.display_name || vehicle.vin;
    const durationLabel = this.formatDuration(durationMinutes, lng);

    const message = i18n.t('offensiveActivatedFor', { lng, vehicle: vehicleName, duration: durationLabel });

    await this.telegramBotService.sendMessage(config.chat_id, message);
  }

  async notifyDeactivated(vehicle: Vehicle): Promise<void> {
    const config = await this.findLinkedConfig(vehicle.userId);
    if (!config) return;

    const lng = config.language === 'fr' ? 'fr' : 'en';
    const vehicleName = vehicle.display_name || vehicle.vin;

    const message = i18n.t('offensiveDeactivatedAuto', { lng, vehicle: vehicleName });

    await this.telegramBotService.sendMessage(config.chat_id, message);
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