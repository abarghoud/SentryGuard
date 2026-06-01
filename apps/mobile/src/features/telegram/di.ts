import { apiClient } from '../../core/api';
import { TelegramApiRepository } from './data/telegram.api-repository';
import {
  GenerateTelegramLinkUseCase,
  GetTelegramStatusUseCase,
  SendTelegramTestMessageUseCase,
} from './domain/use-cases/telegram.use-cases';

export const telegramRepository = new TelegramApiRepository(apiClient);

export const getTelegramStatusUseCase = new GetTelegramStatusUseCase(telegramRepository);
export const generateTelegramLinkUseCase = new GenerateTelegramLinkUseCase(telegramRepository);
export const sendTelegramTestMessageUseCase = new SendTelegramTestMessageUseCase(telegramRepository);
