import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramRepositoryRequirements } from './telegram.repository.requirements';
import {
  GenerateTelegramLinkUseCase,
  GetTelegramStatusUseCase,
  UnlinkTelegramUseCase,
  SendTestMessageUseCase,
} from './telegram.use-cases';
import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from './entities';

describe('The Telegram Use Cases', () => {
  let mockRepository: MockProxy<TelegramRepositoryRequirements>;

  beforeEach(() => {
    mockRepository = mock<TelegramRepositoryRequirements>();
  });

  describe('The GenerateTelegramLinkUseCase', () => {
    let useCase: GenerateTelegramLinkUseCase;

    beforeEach(() => {
      useCase = new GenerateTelegramLinkUseCase(mockRepository);
    });

    it('should call generateTelegramLink on the repository', async () => {
      const mockResult: TelegramLinkInfo = {
        success: true,
        link: 'https://t.me/bot',
        expires_at: '2026-06-10T20:00:00Z',
        expires_in_minutes: 15,
      };
      mockRepository.generateTelegramLink.mockResolvedValue(mockResult);

      const result = await useCase.execute();

      expect(mockRepository.generateTelegramLink).toHaveBeenCalled();
      expect(result).toStrictEqual(mockResult);
    });
  });

  describe('The GetTelegramStatusUseCase', () => {
    let useCase: GetTelegramStatusUseCase;

    beforeEach(() => {
      useCase = new GetTelegramStatusUseCase(mockRepository);
    });

    it('should call getTelegramStatus on the repository', async () => {
      const mockResult: TelegramStatus = {
        linked: true,
        status: 'linked',
        message: 'Linked successfully',
      };
      mockRepository.getTelegramStatus.mockResolvedValue(mockResult);

      const result = await useCase.execute();

      expect(mockRepository.getTelegramStatus).toHaveBeenCalled();
      expect(result).toStrictEqual(mockResult);
    });
  });

  describe('The UnlinkTelegramUseCase', () => {
    let useCase: UnlinkTelegramUseCase;

    beforeEach(() => {
      useCase = new UnlinkTelegramUseCase(mockRepository);
    });

    it('should call unlinkTelegram on the repository', async () => {
      const mockResult: TelegramActionResponse = {
        success: true,
        message: 'Unlinked',
      };
      mockRepository.unlinkTelegram.mockResolvedValue(mockResult);

      const result = await useCase.execute();

      expect(mockRepository.unlinkTelegram).toHaveBeenCalled();
      expect(result).toStrictEqual(mockResult);
    });
  });

  describe('The SendTestMessageUseCase', () => {
    let useCase: SendTestMessageUseCase;

    beforeEach(() => {
      useCase = new SendTestMessageUseCase(mockRepository);
    });

    it('should call sendTestMessage on the repository', async () => {
      const mockResult: TelegramActionResponse = {
        success: true,
        message: 'Sent',
      };
      mockRepository.sendTestMessage.mockResolvedValue(mockResult);

      const result = await useCase.execute();

      expect(mockRepository.sendTestMessage).toHaveBeenCalled();
      expect(result).toStrictEqual(mockResult);
    });
  });
});
