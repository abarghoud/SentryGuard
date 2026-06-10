import { TelegramRepositoryRequirements } from './telegram.repository.requirements';
import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from './entities';
import {
  GenerateTelegramLinkRequirements,
  GetTelegramStatusRequirements,
  UnlinkTelegramRequirements,
  SendTestMessageRequirements,
} from './telegram.use-cases.requirements';

export class GenerateTelegramLinkUseCase implements GenerateTelegramLinkRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramLinkInfo> {
    return this.repository.generateTelegramLink();
  }
}

export class GetTelegramStatusUseCase implements GetTelegramStatusRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramStatus> {
    return this.repository.getTelegramStatus();
  }
}

export class UnlinkTelegramUseCase implements UnlinkTelegramRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramActionResponse> {
    return this.repository.unlinkTelegram();
  }
}

export class SendTestMessageUseCase implements SendTestMessageRequirements {
  public constructor(private readonly repository: TelegramRepositoryRequirements) {}

  public async execute(): Promise<TelegramActionResponse> {
    return this.repository.sendTestMessage();
  }
}
