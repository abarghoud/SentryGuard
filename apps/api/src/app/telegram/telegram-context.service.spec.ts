import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramContextService } from './telegram-context.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { UserLanguageService } from '../user/user-language.service';

describe('The TelegramContextService class', () => {
  const fakeUserId = 'user-123';
  const fakeChatId = 'chat-456';

  let service: TelegramContextService;

  const mockTelegramConfigRepository = { findOne: jest.fn() };
  const mockUserLanguageService: MockProxy<UserLanguageService> = mock<UserLanguageService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramContextService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: UserLanguageService, useValue: mockUserLanguageService },
      ],
    }).compile();

    service = module.get<TelegramContextService>(TelegramContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The getChatIdFromUserId() method', () => {
    describe('When a linked config exists for the user', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({ chat_id: fakeChatId });
      });

      it('should return the chat_id', async () => {
        const result = await service.getChatIdFromUserId(fakeUserId);

        expect(result).toBe(fakeChatId);
      });
    });

    describe('When no linked config exists for the user', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should return null', async () => {
        const result = await service.getChatIdFromUserId(fakeUserId);

        expect(result).toBeNull();
      });
    });
  });

  describe('The getUserLanguageFromChatId() method', () => {
    describe('When a linked config exists for the chat', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({ userId: fakeUserId });
      });

      it('should return the user preferred language', async () => {
        mockUserLanguageService.getUserLanguage.mockResolvedValue('fr');

        const result = await service.getUserLanguageFromChatId(fakeChatId);

        expect(result).toBe('fr');
        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith(fakeUserId);
      });
    });

    describe('When no linked config exists for the chat', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should return the default language "en"', async () => {
        const result = await service.getUserLanguageFromChatId(fakeChatId);

        expect(result).toBe('en');
        expect(mockUserLanguageService.getUserLanguage).not.toHaveBeenCalled();
      });
    });

    describe('When an error occurs while fetching the config', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockRejectedValue(new Error('DB error'));
      });

      it('should return the default language "en"', async () => {
        const result = await service.getUserLanguageFromChatId(fakeChatId);

        expect(result).toBe('en');
      });
    });

    describe('When an error occurs while fetching the user language', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({ userId: fakeUserId });
        mockUserLanguageService.getUserLanguage.mockRejectedValue(new Error('Language service error'));
      });

      it('should return the default language "en"', async () => {
        const result = await service.getUserLanguageFromChatId(fakeChatId);

        expect(result).toBe('en');
      });
    });
  });
});
