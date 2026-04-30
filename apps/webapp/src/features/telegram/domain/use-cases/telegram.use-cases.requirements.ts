import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from '../entities';

export interface GenerateTelegramLinkRequirements {
  execute(): Promise<TelegramLinkInfo>;
}

export interface GetTelegramStatusRequirements {
  execute(): Promise<TelegramStatus>;
}

export interface UnlinkTelegramRequirements {
  execute(): Promise<TelegramActionResponse>;
}

export interface SendTestMessageRequirements {
  execute(): Promise<TelegramActionResponse>;
}
