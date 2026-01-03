import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig } from '../../entities/telegram-config.entity';

@Injectable()
export class TelegramConfigService {
  private readonly logger = new Logger(TelegramConfigService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
  ) {}

  async removeTelegramConfig(userId: string): Promise<void> {
    try {
      const result = await this.telegramConfigRepository.delete({ userId });

      if (result.affected && result.affected > 0) {
        this.logger.log(`[TELEGRAM_CONFIG_REMOVED] Successfully removed Telegram configuration for user: ${userId}`);
      } else {
        this.logger.warn(`[TELEGRAM_CONFIG_NOT_FOUND] No Telegram configuration found for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`[TELEGRAM_CONFIG_ERROR] Failed to remove Telegram configuration for user ${userId}:`, error);
      throw error;
    }
  }
}