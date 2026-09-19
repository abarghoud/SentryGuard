import { Injectable, Logger } from '@nestjs/common';
import { ITelegramFailureHandler } from '../interfaces/telegram-failure-handler.interface';
import { TelegramConfigService } from '../telegram-config.service';

@Injectable()
export class TelegramFailureHandlerService implements ITelegramFailureHandler {
  private readonly logger = new Logger(TelegramFailureHandlerService.name);

  constructor(
    private readonly telegramConfigService: TelegramConfigService,
  ) {}

  public canHandle(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('bot was blocked by the user') ||
      errorMessage.includes('forbidden: bot was blocked') ||
      errorMessage.includes('user is deactivated') ||
      errorMessage.includes('chat not found')
    );
  }

  public async handleFailure(error: Error, userId: string): Promise<void> {
    this.logger.warn(`[TELEGRAM_BLOCKED] Bot blocked or user deactivated for user ${userId}, removing Telegram configuration`);

    try {
      await this.telegramConfigService.removeTelegramConfig(userId);
      this.logger.log(`[TELEGRAM_BLOCKED] Successfully removed Telegram configuration for user: ${userId}`);
    } catch (removalError) {
      this.logger.error(`[TELEGRAM_CONFIG_ERROR] Failed to remove Telegram configuration for user ${userId}:`, removalError);
      throw removalError;
    }
  }
}