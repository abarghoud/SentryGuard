import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Context } from 'telegraf';
import { TelegramMuteService } from './telegram-mute.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
}));

describe('The TelegramMuteService class', () => {
  const fakeUserId = 'user-123';
  const fakeChatId = '456';

  let service: TelegramMuteService;
  let hearsHandler: (ctx: Context) => Promise<void>;
  let muteDurationHandler: (ctx: Context) => Promise<void>;
  let muteReactivateHandler: (ctx: Context) => Promise<void>;
  let muteChangeHandler: (ctx: Context) => Promise<void>;
  let muteCancelHandler: (ctx: Context) => Promise<void>;

  const mockTelegramConfigRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockKeyboardBuilderService: MockProxy<TelegramKeyboardBuilderService> = mock<TelegramKeyboardBuilderService>();
  const mockContextService: MockProxy<TelegramContextService> = mock<TelegramContextService>();

  const buildCtx = (chatId = fakeChatId, match?: string[]): Context =>
    ({
      chat: { id: parseInt(chatId) },
      match,
      reply: jest.fn().mockResolvedValue(undefined),
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Context;

  beforeEach(async () => {
    mockBotService.registerHears.mockImplementation((_, handler) => { hearsHandler = handler; });
    mockBotService.registerAction.mockImplementation((trigger, handler) => {
      const key = trigger.toString();
      if (key === '/^mute:(\\d+)$/') muteDurationHandler = handler;
      else if (key === 'mute:reactivate') muteReactivateHandler = handler;
      else if (key === 'mute:change') muteChangeHandler = handler;
      else if (key === 'mute:cancel') muteCancelHandler = handler;
    });
    mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildMuteActiveKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildMuteDurationKeyboard.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramMuteService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: TelegramContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<TelegramMuteService>(TelegramMuteService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The checkIsNotificationMuted() method', () => {
    describe('When no linked config exists for the user', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should return false', async () => {
        const result = await service.checkIsNotificationMuted(fakeUserId);

        expect(result).toBe(false);
      });
    });

    describe('When the user config has no mute set', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({ muted_until: null });
      });

      it('should return false', async () => {
        const result = await service.checkIsNotificationMuted(fakeUserId);

        expect(result).toBe(false);
      });
    });

    describe('When the mute period has already expired', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() - 60_000),
        });
      });

      it('should return false', async () => {
        const result = await service.checkIsNotificationMuted(fakeUserId);

        expect(result).toBe(false);
      });
    });

    describe('When the mute is still active', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() + 60 * 60_000),
        });
      });

      it('should return true', async () => {
        const result = await service.checkIsNotificationMuted(fakeUserId);

        expect(result).toBe(true);
      });
    });
  });

  describe('The onModuleInit() method', () => {
    it('should register hears and action handlers', () => {
      expect(mockBotService.registerHears).toHaveBeenCalledTimes(1);
      expect(mockBotService.registerAction).toHaveBeenCalledTimes(4);
    });
  });

  describe('When the mute button is pressed', () => {
    describe('When alerts are currently muted', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          muted_until: new Date(Date.now() + 60 * 60_000),
        });
      });

      it('should reply with the already-muted message', async () => {
        const ctx = buildCtx();

        await hearsHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('muteAlreadyActive', undefined);
      });
    });

    describe('When alerts are not muted', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({ muted_until: null });
      });

      it('should reply with the duration picker', async () => {
        const ctx = buildCtx();

        await hearsHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('muteDurationTitle', undefined);
      });
    });
  });

  describe('When a mute duration is selected', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockTelegramConfigRepository.update.mockResolvedValue({ affected: 1 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should save muted_until with the selected duration', async () => {
      const ctx = buildCtx(fakeChatId, ['mute:60', '60']);

      await muteDurationHandler(ctx);

      expect(mockTelegramConfigRepository.update).toHaveBeenCalledWith(
        { chat_id: fakeChatId, status: TelegramLinkStatus.LINKED },
        { muted_until: expect.any(Date) }
      );
    });

    it('should send a confirmation message', async () => {
      const ctx = buildCtx(fakeChatId, ['mute:60', '60']);

      await muteDurationHandler(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('muteConfirmed', undefined);
    });
  });

  describe('When the user reactivates alerts', () => {
    beforeEach(() => {
      mockTelegramConfigRepository.update.mockResolvedValue({ affected: 1 });
    });

    it('should clear the muted_until in the database', async () => {
      const ctx = buildCtx();

      await muteReactivateHandler(ctx);

      expect(mockTelegramConfigRepository.update).toHaveBeenCalledWith(
        { chat_id: fakeChatId, status: TelegramLinkStatus.LINKED },
        { muted_until: null }
      );
    });

    it('should send a reactivation confirmation', async () => {
      const ctx = buildCtx();

      await muteReactivateHandler(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('muteReactivated', undefined);
    });
  });

  describe('When the user changes the mute duration', () => {
    it('should reply with the duration picker', async () => {
      const ctx = buildCtx();

      await muteChangeHandler(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('muteDurationTitle', undefined);
    });
  });

  describe('When the user cancels the mute dialog', () => {
    it('should answer the callback query and delete the message', async () => {
      const ctx = buildCtx();

      await muteCancelHandler(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
      expect(ctx.deleteMessage).toHaveBeenCalledTimes(1);
    });
  });
});
