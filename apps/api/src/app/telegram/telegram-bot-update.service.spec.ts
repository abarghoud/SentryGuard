import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { CURRENT_BOT_UI_VERSION } from './telegram.types';
import { telegramFailureHandler } from './interfaces/telegram-failure-handler.interface';
import type { ITelegramFailureHandler } from './interfaces/telegram-failure-handler.interface';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
}));

describe('The TelegramBotUpdateService class', () => {
  const fakeUserId = 'user-123';
  const fakeChatId = 'chat-456';

  let service: TelegramBotUpdateService;

  const mockTelegramConfigRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockKeyboardBuilderService: MockProxy<TelegramKeyboardBuilderService> = mock<TelegramKeyboardBuilderService>();
  const mockFailureHandler: MockProxy<ITelegramFailureHandler> = mock<ITelegramFailureHandler>();

  beforeEach(async () => {
    mockBotService.sendMessage.mockResolvedValue(true);
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});
    mockFailureHandler.canHandle.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotUpdateService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: telegramFailureHandler, useValue: mockFailureHandler },
      ],
    }).compile();

    service = module.get<TelegramBotUpdateService>(TelegramBotUpdateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The ensureUserIsUpToDate() method', () => {
    describe('When no linked config is found for the user', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should not send any message', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When the user is already up to date', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          bot_ui_version: CURRENT_BOT_UI_VERSION,
          status: TelegramLinkStatus.LINKED,
        });
      });

      it('should not send any message', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockBotService.sendMessage).not.toHaveBeenCalled();
      });

      it('should not update the version in the database', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockTelegramConfigRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('When the user is on an outdated bot version', () => {
      const outdatedConfig = {
        userId: fakeUserId,
        bot_ui_version: 0,
        muted_until: null,
        status: TelegramLinkStatus.LINKED,
      };

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(outdatedConfig);
        mockTelegramConfigRepository.update.mockResolvedValue({ affected: 1 });
      });

      it('should send the update message to the user with an abort signal', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          'botUpdateV1',
          {},
          expect.any(AbortSignal)
        );
      });

      it('should update the bot_ui_version to the current version', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockTelegramConfigRepository.update).toHaveBeenCalledWith(
          { userId: fakeUserId },
          { bot_ui_version: CURRENT_BOT_UI_VERSION }
        );
      });

      it('should build the main menu keyboard with the correct language and mute state', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'fr');

        expect(mockKeyboardBuilderService.buildMainMenuKeyboard).toHaveBeenCalledWith('fr', outdatedConfig.muted_until);
      });

      describe('When Telegram fails to deliver the update message', () => {
        let warnSpy: jest.SpyInstance;

        beforeEach(async () => {
          warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
          mockBotService.sendMessage.mockRejectedValue(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }));

          await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');
        });

        afterEach(() => {
          warnSpy.mockRestore();
        });

        it('should let the alert go on and log the skipped update', () => {
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[TELEGRAM_BOT_UPDATE_SKIPPED]'));
        });

        it('should keep the version so the update is sent with a later alert', () => {
          expect(mockTelegramConfigRepository.update).not.toHaveBeenCalled();
        });
      });

      describe('When Telegram does not answer within 5 seconds', () => {
        beforeEach(() => {
          jest.useFakeTimers();
          jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
          mockBotService.sendMessage.mockReturnValue(new Promise<boolean>(() => undefined));
        });

        afterEach(() => {
          jest.useRealTimers();
          jest.restoreAllMocks();
        });

        it('should stop waiting so the alert is not held back', async () => {
          const update = service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');
          await jest.advanceTimersByTimeAsync(5_000);

          await expect(update).resolves.toBeUndefined();
        });
      });

      describe('When the user blocked the bot', () => {
        const blockedBotError = new Error('403: Forbidden: bot was blocked by the user');

        beforeEach(() => {
          mockBotService.sendMessage.mockRejectedValue(blockedBotError);
          mockFailureHandler.canHandle.mockReturnValue(true);
        });

        it('should report it so the alert is not sent either', async () => {
          await expect(service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en')).rejects.toThrow(blockedBotError);
        });
      });
    });
  });
});
