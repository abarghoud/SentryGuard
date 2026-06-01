import { TelegramLinkInfo, TelegramStatus, TelegramTestMessageResult } from '../entities';

export interface GetTelegramStatusRequirements {
  execute(): Promise<TelegramStatus>;
}

export interface GenerateTelegramLinkRequirements {
  execute(): Promise<TelegramLinkInfo>;
}

export interface SendTelegramTestMessageRequirements {
  execute(): Promise<TelegramTestMessageResult>;
}
