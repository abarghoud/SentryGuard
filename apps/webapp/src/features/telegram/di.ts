import { apiClient } from '../../core/api';
import { TelegramApiRepository } from './data/telegram.api-repository';
import {
  GenerateTelegramLinkUseCase,
  GetTelegramStatusUseCase,
  UnlinkTelegramUseCase,
  SendTestMessageUseCase,
} from './domain/use-cases/telegram.use-cases';

export const telegramRepository = new TelegramApiRepository(apiClient);

export const generateTelegramLinkUseCase = new GenerateTelegramLinkUseCase(telegramRepository);
export const getTelegramStatusUseCase = new GetTelegramStatusUseCase(telegramRepository);
export const unlinkTelegramUseCase = new UnlinkTelegramUseCase(telegramRepository);
export const sendTestMessageUseCase = new SendTestMessageUseCase(telegramRepository);
