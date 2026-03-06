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