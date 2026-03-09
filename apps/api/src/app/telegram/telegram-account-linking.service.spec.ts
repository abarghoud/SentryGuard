import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Context } from 'telegraf';
import { TelegramAccountLinkingService } from './telegram-account-linking.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { UserLanguageService } from '../user/user-language.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { CURRENT_BOT_UI_VERSION } from './telegram.types';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
}));

describe('The TelegramAccountLinkingService class', () => {
  const fakeChatId = 456;
  const fakeUserId = 'user-123';
  const fakeLinkToken = 'valid-token-abc';

  let service: TelegramAccountLinkingService;
  let registeredStartHandler: (ctx: Context) => Promise<void>;

  const mockTelegramConfigRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockKeyboardBuilderService: MockProxy<TelegramKeyboardBuilderService> = mock<TelegramKeyboardBuilderService>();
  const mockContextService: MockProxy<TelegramContextService> = mock<TelegramContextService>();
  const mockUserLanguageService: MockProxy<UserLanguageService> = mock<UserLanguageService>();

  const buildCtx = (text: string, chatId = fakeChatId): Context =>
    ({
      message: { text },
      chat: { id: chatId },
      reply: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Context;

  beforeEach(async () => {
    mockBotService.registerStart.mockImplementation((handler) => {
      registeredStartHandler = handler;
    });
    mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
    mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAccountLinkingService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: TelegramContextService, useValue: mockContextService },
        { provide: UserLanguageService, useValue: mockUserLanguageService },
      ],
    }).compile();

    service = module.get<TelegramAccountLinkingService>(TelegramAccountLinkingService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The onModuleInit() method', () => {
    it('should register a /start handler', () => {
      expect(mockBotService.registerStart).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('When /start is received without a token', () => {
    describe('When the user has a linked account', () => {
      const linkedConfig = { muted_until: null } as TelegramConfig;
      const fakeMenuOptions = {
        keyboard: { keyboard: [[{ text: '📊 My status' }]], resize_keyboard: true },
      };

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(linkedConfig);
        mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue(fakeMenuOptions as any);
      });

      it('should send a welcome message with the main menu keyboard', async () => {
        const ctx = buildCtx('/start');

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          'Welcome to SentryGuard Bot',
          expect.objectContaining({ reply_markup: expect.anything() })
        );
      });

      it('should build the keyboard with the user language and mute state', async () => {
        const ctx = buildCtx('/start');

        await registeredStartHandler(ctx);

        expect(mockKeyboardBuilderService.buildMainMenuKeyboard).toHaveBeenCalledWith('en', linkedConfig.muted_until);
      });
    });

    describe('When the user has no linked account', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should send a welcome message without keyboard', async () => {
        const ctx = buildCtx('/start');

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('Welcome to SentryGuard Bot', undefined);
      });
    });
  });

  describe('When /start is received with a token', () => {
    describe('When no config matches the token', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should reply with an invalid or expired token message', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('Invalid or expired token', undefined);
      });

      it('should not save anything to the repository', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(mockTelegramConfigRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When the config token is expired', () => {
      const expiredConfig = {
        userId: fakeUserId,
        status: TelegramLinkStatus.PENDING,
        expires_at: new Date(Date.now() - 60_000),
      } as TelegramConfig;

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(expiredConfig);
        mockTelegramConfigRepository.save.mockResolvedValue(expiredConfig);
      });

      it('should mark the config as EXPIRED', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(mockTelegramConfigRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: TelegramLinkStatus.EXPIRED })
        );
      });

      it('should reply with a token expired message', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('This token has expired', undefined);
      });

      it('should not send a success message', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).not.toHaveBeenCalledWith('Your SentryGuard account has been linked successfully!', undefined);
      });
    });

    describe('When the config is valid', () => {
      const validConfig = {
        userId: fakeUserId,
        status: TelegramLinkStatus.PENDING,
        expires_at: new Date(Date.now() + 60_000),
      } as TelegramConfig;

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(validConfig);
        mockTelegramConfigRepository.save.mockResolvedValue(validConfig);
      });

      it('should save the linked config with chat_id, LINKED status and current bot version', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(mockTelegramConfigRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            chat_id: fakeChatId.toString(),
            status: TelegramLinkStatus.LINKED,
            bot_ui_version: CURRENT_BOT_UI_VERSION,
            linked_at: expect.any(Date),
          })
        );
      });

      it('should rotate the link_token after successful linking', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        const savedConfig = mockTelegramConfigRepository.save.mock.calls[0][0];
        expect(savedConfig.link_token).toBeDefined();
        expect(savedConfig.link_token).not.toBe(fakeLinkToken);
      });

      it('should send the success message', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          'Your SentryGuard account has been linked successfully!',
          undefined
        );
      });

      it('should send the follow-up message with the main menu keyboard', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          'telegramLinkedFollowUp',
          undefined
        );
      });
    });

    describe('When an unexpected error occurs', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockRejectedValue(new Error('DB connection lost'));
      });

      it('should reply with a generic error message', async () => {
        const ctx = buildCtx(`/start ${fakeLinkToken}`);

        await registeredStartHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('❌ An error occurred. Please try again later.', undefined);
      });
    });
  });
});
