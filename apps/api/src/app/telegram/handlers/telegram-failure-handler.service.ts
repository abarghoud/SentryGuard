import { Injectable, Logger } from '@nestjs/common';
import { ErrorMeaningClassifierService } from '../../../common/services/error-meaning-classifier.service';
import { ITelegramFailureHandler } from '../interfaces/telegram-failure-handler.interface';
import { TelegramConfigService } from '../telegram-config.service';

@Injectable()
export class TelegramFailureHandlerService implements ITelegramFailureHandler {
  private readonly logger = new Logger(TelegramFailureHandlerService.name);

  constructor(
    private readonly telegramConfigService: TelegramConfigService,
    private readonly errorClassifier: ErrorMeaningClassifierService,
  ) {}

  public canHandle(error: Error): Promise<boolean> {
    return this.errorClassifier.isTelegramContactGone(error);
  }

  public async handleFailure(error: Error, userId: string): Promise<void> {
    this.logger.warn(`[TELEGRAM_BLOCKED] Bot blocked or user deactivated for user ${userId}, removing Telegram configuration: ${error.message}`);

    try {
      await this.telegramConfigService.removeTelegramConfig(userId);
      this.logger.log(`[TELEGRAM_BLOCKED] Successfully removed Telegram configuration for user: ${userId}`);
    } catch (removalError) {
      this.logger.error(`[TELEGRAM_CONFIG_ERROR] Failed to remove Telegram configuration for user ${userId}:`, removalError);
      throw removalError;
    }
  }
}