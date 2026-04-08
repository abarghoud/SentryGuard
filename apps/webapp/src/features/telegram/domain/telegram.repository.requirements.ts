import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from './entities';

export interface TelegramRepositoryRequirements {
  generateTelegramLink(): Promise<TelegramLinkInfo>;
  getTelegramStatus(): Promise<TelegramStatus>;
  unlinkTelegram(): Promise<TelegramActionResponse>;
  sendTestMessage(): Promise<TelegramActionResponse>;
}
