import { TelegramLinkInfo, TelegramStatus, TelegramTestMessageResult } from '../entities';
import { TelegramRepositoryRequirements } from '../telegram.repository.requirements';
import {
  GenerateTelegramLinkRequirements,
  GetTelegramStatusRequirements,
  SendTelegramTestMessageRequirements,
} from './telegram.use-cases.requirements';

export class GetTelegramStatusUseCase implements GetTelegramStatusRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramStatus> {
    return this.repository.getTelegramStatus();
  }
}

export class GenerateTelegramLinkUseCase implements GenerateTelegramLinkRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramLinkInfo> {
    return this.repository.generateTelegramLink();
  }
}

export class SendTelegramTestMessageUseCase implements SendTelegramTestMessageRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramTestMessageResult> {
    return this.repository.sendTelegramTestMessage();
  }
}
