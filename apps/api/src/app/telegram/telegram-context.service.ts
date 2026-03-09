import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { UserLanguageService } from '../user/user-language.service';

@Injectable()
export class TelegramContextService {
  private readonly logger = new Logger(TelegramContextService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly userLanguageService: UserLanguageService,
  ) {}

  async getChatIdFromUserId(userId: string): Promise<string | null> {
    const config = await this.telegramConfigRepository.findOne({
      where: { userId, status: TelegramLinkStatus.LINKED },
    });

    return config?.chat_id ?? null;
  }

  async getUserLanguageFromChatId(chatId: string): Promise<'en' | 'fr'> {
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