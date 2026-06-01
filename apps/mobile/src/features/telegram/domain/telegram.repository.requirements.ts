import { TelegramLinkInfo, TelegramStatus, TelegramTestMessageResult } from './entities';

export interface TelegramRepositoryRequirements {
  generateTelegramLink(): Promise<TelegramLinkInfo>;
  getTelegramStatus(): Promise<TelegramStatus>;
  sendTelegramTestMessage(): Promise<TelegramTestMessageResult>;
}
