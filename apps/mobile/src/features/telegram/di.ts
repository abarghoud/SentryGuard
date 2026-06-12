import { apiClient } from '../../core/api';
import { TelegramApiRepository } from './data/telegram.api-repository';
import {
  GenerateTelegramLinkUseCase,
  GetTelegramStatusUseCase,
  SendTestMessageUseCase,
  UnlinkTelegramUseCase,
} from '@sentryguard/telegram-domain';

export const telegramRepository = new TelegramApiRepository(apiClient);

export const getTelegramStatusUseCase = new GetTelegramStatusUseCase(telegramRepository);
export const generateTelegramLinkUseCase = new GenerateTelegramLinkUseCase(telegramRepository);
export const sendTelegramTestMessageUseCase = new SendTestMessageUseCase(telegramRepository);
export const unlinkTelegramUseCase = new UnlinkTelegramUseCase(telegramRepository);
