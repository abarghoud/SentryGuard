import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramBotUpdateService } from './telegram-bot-update.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { CURRENT_BOT_UI_VERSION } from './telegram.types';

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

  beforeEach(async () => {
    mockBotService.sendMessage.mockResolvedValue(true);
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotUpdateService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
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

      it('should send the update message to the user', async () => {
        await service.ensureUserIsUpToDate(fakeUserId, fakeChatId, 'en');

        expect(mockBotService.sendMessage).toHaveBeenCalledWith(
          fakeChatId,
          'botUpdateV1',
          {}
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
    });
  });
});
