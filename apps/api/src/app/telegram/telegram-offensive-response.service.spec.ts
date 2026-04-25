import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Context } from 'telegraf';
import { TelegramOffensiveResponseService } from './telegram-offensive-response.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
}));

describe('The TelegramOffensiveResponseService class', () => {
  const fakeChatId = '456';
  const fakeUserId = 'user-123';

  let service: TelegramOffensiveResponseService;
  let hearsHandler: (ctx: Context) => Promise<void>;
  let selectHandler: (ctx: Context) => Promise<void>;
  let setHandler: (ctx: Context) => Promise<void>;

  const mockTelegramConfigRepository = {
    findOne: jest.fn(),
  };
  const mockVehicleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };
  const mockBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockKeyboardBuilderService: MockProxy<TelegramKeyboardBuilderService> = mock<TelegramKeyboardBuilderService>();
  const mockContextService: MockProxy<TelegramContextService> = mock<TelegramContextService>();

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: fakeUserId,
    vin: '5YJ3E1EA123456789',
    display_name: 'Model 3',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: false,
    offensive_response: OffensiveResponse.DISABLED,
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  const fakeConfig: TelegramConfig = {
    id: 'config-1',
    userId: fakeUserId,
    chat_id: fakeChatId,
    link_token: 'token',
    status: TelegramLinkStatus.LINKED,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const buildCtx = (chatId = fakeChatId, match?: string[]): Context =>
    ({
      chat: { id: parseInt(chatId) },
      match,
      reply: jest.fn().mockResolvedValue(undefined),
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Context;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBotService.registerHears.mockImplementation((_, handler) => { hearsHandler = handler; });
    mockBotService.registerAction.mockImplementation((trigger, handler) => {
      if (typeof trigger === 'string') {
        if (trigger === 'o_sl:vehicle-1') selectHandler = handler;
      } else {
        const pattern = trigger.toString();
        if (pattern.includes('o_sl')) selectHandler = handler;
        else if (pattern.includes('o_s:')) setHandler = handler;
      }
    });
    mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildOffensiveResponseKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildVehicleSelectionKeyboard.mockReturnValue({});
    mockVehicleRepository.save.mockImplementation(async (v) => v);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramOffensiveResponseService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: TelegramContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<TelegramOffensiveResponseService>(TelegramOffensiveResponseService);
    service.onModuleInit();
  });

  describe('The onModuleInit() method', () => {
    it('should register hears and action handlers', () => {
      expect(mockBotService.registerHears).toHaveBeenCalledTimes(1);
      expect(mockBotService.registerAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('When the offensive button is pressed', () => {
    describe('When user has no linked config', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should reply with no account linked message', async () => {
        const ctx = buildCtx();
        await hearsHandler(ctx);
        expect(ctx.reply).toHaveBeenCalledWith('No account linked', undefined);
      });
    });

    describe('When user has no vehicles', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
        mockVehicleRepository.find.mockResolvedValue([]);
      });

      it('should reply with no vehicles message', async () => {
        const ctx = buildCtx();
        await hearsHandler(ctx);
        expect(ctx.reply).toHaveBeenCalledWith('offensiveNoVehicles', undefined);
      });
    });

    describe('When user has one vehicle', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
        mockVehicleRepository.find.mockResolvedValue([fakeVehicle]);
      });

      it('should show response options directly', async () => {
        const ctx = buildCtx();
        await hearsHandler(ctx);
        expect(mockKeyboardBuilderService.buildOffensiveResponseKeyboard).toHaveBeenCalledWith(
          fakeVehicle.id,
          fakeVehicle.offensive_response,
          'en',
        );
      });
    });

    describe('When user has multiple vehicles', () => {
      const secondVehicle = { ...fakeVehicle, id: 'vehicle-2', display_name: 'Model Y' };

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
        mockVehicleRepository.find.mockResolvedValue([fakeVehicle, secondVehicle]);
      });

      it('should show vehicle selection keyboard', async () => {
        const ctx = buildCtx();
        await hearsHandler(ctx);
        expect(mockKeyboardBuilderService.buildVehicleSelectionKeyboard).toHaveBeenCalledWith(
          [fakeVehicle, secondVehicle],
          'offensive',
        );
      });
    });
  });

  describe('When a vehicle is selected', () => {
    describe('When vehicle belongs to user', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
        mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
        mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
      });

      it('should show response options for that vehicle', async () => {
        const ctx = buildCtx(fakeChatId, ['o_sl:vehicle-1', 'vehicle-1']);
        await selectHandler(ctx);

        expect(mockKeyboardBuilderService.buildOffensiveResponseKeyboard).toHaveBeenCalledWith(
          fakeVehicle.id,
          fakeVehicle.offensive_response,
          'en',
        );
      });
    });
  });

  describe('When an offensive response is set', () => {
    beforeEach(() => {
      mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
      mockVehicleRepository.findOne.mockResolvedValue({ ...fakeVehicle });
      mockVehicleRepository.save.mockImplementation(async (v) => v);
    });

    it('should update the vehicle offensive_response and confirm', async () => {
      const ctx = buildCtx(fakeChatId, ['o_s:vehicle-1:FLASH', 'vehicle-1', 'FLASH']);

      await setHandler(ctx);

      expect(mockVehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ offensive_response: OffensiveResponse.FLASH }),
      );
    });
  });
});