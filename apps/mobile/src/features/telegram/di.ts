import { apiClient, tokenStore } from '../../core/api';
import { TelegramApiRepository } from './data/telegram.api-repository';
import { TelegramMockRepository } from './data/telegram.mock-repository';
import {
  TelegramRepositoryRequirements,
  TelegramLinkInfo,
  TelegramStatus,
  TelegramActionResponse,
} from '@sentryguard/telegram-domain';
import {
  GenerateTelegramLinkUseCase,
  GetTelegramStatusUseCase,
  SendTestMessageUseCase,
  UnlinkTelegramUseCase,
} from '@sentryguard/telegram-domain';

class DynamicTelegramRepository implements TelegramRepositoryRequirements {
  public constructor(
    private readonly apiRepo: TelegramRepositoryRequirements,
    private readonly mockRepo: TelegramRepositoryRequirements
  ) {}

  private getRepo(): TelegramRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getTelegramStatus(): Promise<TelegramStatus> {
    return this.getRepo().getTelegramStatus();
  }

  public async generateTelegramLink(): Promise<TelegramLinkInfo> {
    return this.getRepo().generateTelegramLink();
  }

  public async sendTestMessage(): Promise<TelegramActionResponse> {
    return this.getRepo().sendTestMessage();
  }

  public async unlinkTelegram(): Promise<TelegramActionResponse> {
    return this.getRepo().unlinkTelegram();
  }
}

export const telegramRepository = new DynamicTelegramRepository(
  new TelegramApiRepository(apiClient),
  new TelegramMockRepository()
);

export const getTelegramStatusUseCase = new GetTelegramStatusUseCase(telegramRepository);
export const generateTelegramLinkUseCase = new GenerateTelegramLinkUseCase(telegramRepository);
export const sendTelegramTestMessageUseCase = new SendTestMessageUseCase(telegramRepository);
export const unlinkTelegramUseCase = new UnlinkTelegramUseCase(telegramRepository);
