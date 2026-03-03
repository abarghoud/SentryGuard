export const CURRENT_BOT_UI_VERSION = 1;

export interface TelegramKeyboard {
  inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  keyboard?: Array<Array<{ text: string }>>;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
}

export interface TelegramMessageOptions {
  keyboard?: TelegramKeyboard;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export function formatRemainingTime(date: Date): string {
  const totalMinutes = Math.ceil((date.getTime() - Date.now()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, totalMinutes)}min`;
}

export function buildTelegramOptions(options?: TelegramMessageOptions): Record<string, unknown> {
  const telegramOptions: Record<string, unknown> = {
    parse_mode: options?.parse_mode || 'HTML',
  };

  if (options?.keyboard?.inline_keyboard) {
    telegramOptions.reply_markup = {
      inline_keyboard: options.keyboard.inline_keyboard,
    };
  } else if (options?.keyboard?.keyboard) {
    telegramOptions.reply_markup = {
      keyboard: options.keyboard.keyboard,
      one_time_keyboard: options.keyboard.one_time_keyboard,
      resize_keyboard: options.keyboard.resize_keyboard,
    };
  }

  return telegramOptions;
}