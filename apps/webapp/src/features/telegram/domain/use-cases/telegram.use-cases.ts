import { TelegramRepositoryRequirements } from '../telegram.repository.requirements';
import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from '../entities';

export class GenerateTelegramLinkUseCase {
  constructor(private repository: TelegramRepositoryRequirements) {}

  async execute(): Promise<TelegramLinkInfo> {
    return this.repository.generateTelegramLink();
  }
}

export class GetTelegramStatusUseCase {
  constructor(private repository: TelegramRepositoryRequirements) {}

  async execute(): Promise<TelegramStatus> {
    return this.repository.getTelegramStatus();
  }
}

export class UnlinkTelegramUseCase {
  constructor(private repository: TelegramRepositoryRequirements) {}

  async execute(): Promise<TelegramActionResponse> {
    return this.repository.unlinkTelegram();
  }
}

export class SendTestMessageUseCase {
  constructor(private repository: TelegramRepositoryRequirements) {}

  async execute(): Promise<TelegramActionResponse> {
    return this.repository.sendTestMessage();
  }
}
