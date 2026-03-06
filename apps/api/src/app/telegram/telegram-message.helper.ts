import { Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramMessageOptions } from './telegram.types';

const MINUTES_PER_HOUR = 60;
export const MILLISECONDS_PER_MINUTE = 60_000;
const MINIMUM_DISPLAY_MINUTES = 1;

export class TelegramMessageHelper {
  static formatRemainingTime(date: Date): string {
    const totalMinutes = Math.ceil((date.getTime() - Date.now()) / MILLISECONDS_PER_MINUTE);
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;

    return `${Math.max(MINIMUM_DISPLAY_MINUTES, totalMinutes)}min`;
  }

  static buildOptions(options?: TelegramMessageOptions): Record<string, unknown> {
    return {
      parse_mode: options?.parse_mode ?? 'HTML',
      ...TelegramMessageHelper.buildReplyMarkup(options),
    };
  }

  static withChatId(
    handler: (ctx: Context, chatId: string) => Promise<void>
  ): (ctx: Context) => Promise<void> {
    return async (ctx: Context) => {
      const chatId = ctx.chat?.id.toString();
      if (chatId) await handler(ctx, chatId);
    };
  }

  static async safeReply(
    ctx: Context, message: string, options: TelegramMessageOptions | undefined, logger: Logger
  ): Promise<void> {
    try {
      const telegramOptions = TelegramMessageHelper.buildOptions(options);
      await ctx.reply(message, Object.keys(telegramOptions).length > 1 ? telegramOptions : undefined);
    } catch (error) {
      logger.warn(`⚠️ Could not send message to user (possibly blocked the bot): ${error}`, error);
    }
  }

  private static buildReplyMarkup(options?: TelegramMessageOptions): Record<string, unknown> {
    if (options?.keyboard?.inline_keyboard) {
      return { reply_markup: { inline_keyboard: options.keyboard.inline_keyboard } };
    }

    if (options?.keyboard?.keyboard) {
      return {
        reply_markup: {
          keyboard: options.keyboard.keyboard,
          one_time_keyboard: options.keyboard.one_time_keyboard,
          resize_keyboard: options.keyboard.resize_keyboard,
        },
      };
    }

    return {};
  }
}
