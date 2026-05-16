import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Context } from 'telegraf';
import { TelegramOffensiveResponseService } from './telegram-offensive-response.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { VehicleOffensiveResponseConfigService } from '../offensive-response/vehicle-offensive-response-config.service';
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
  let hearsSentryHandler: (ctx: Context) => Promise<void>;
  let selectHandler: (ctx: Context) => Promise<void>;
  let setSentryHandler: (ctx: Context) => Promise<void>;
  let setBreakInHandler: (ctx: Context) => Promise<void>;

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
  const mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService> = mock<AlertsOffensiveResponseService>();
  const mockVehicleOffensiveResponseConfigService: MockProxy<VehicleOffensiveResponseConfigService> = mock<VehicleOffensiveResponseConfigService>();

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: fakeUserId,
    vin: '5YJ3E1EA123456789',
    display_name: 'Model 3',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: false,
    sentry_offensive_response: OffensiveResponse.DISABLED,
    break_in_offensive_response: OffensiveResponse.DISABLED,
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  const fakeConfig: TelegramConfig = {
    bot_ui_version: 0, user: undefined,
    id: 'config-1',
    userId: fakeUserId,
    chat_id: fakeChatId,
    link_token: 'token',
    status: TelegramLinkStatus.LINKED,
    created_at: new Date(),
    updated_at: new Date()
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

    mockBotService.registerHears.mockImplementation((_, handler) => {
      if (!hearsSentryHandler) {
        hearsSentryHandler = handler;
      }
    });
    mockBotService.registerAction.mockImplementation((trigger, handler) => {
      if (typeof trigger === 'string') {
        if (trigger === 'o_sl:vehicle-1') selectHandler = handler;
      } else {
        const pattern = trigger.toString();
        if (pattern.includes('o_sl')) selectHandler = handler;
        else if (pattern.includes('o_ss')) setSentryHandler = handler;
        else if (pattern.includes('o_sb')) setBreakInHandler = handler;
      }
    });
    mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildOffensiveTypeKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildDurationKeyboard.mockReturnValue({});
    mockKeyboardBuilderService.buildActiveSentryKeyboard.mockReturnValue({});
    mockVehicleRepository.save.mockImplementation(async (v) => v);
    mockVehicleOffensiveResponseConfigService.setSentryOffensiveWithDuration.mockResolvedValue({ success: true, sentry_offensive_response: OffensiveResponse.HONK });
    mockVehicleOffensiveResponseConfigService.disableSentryOffensive.mockResolvedValue({ success: true, sentry_offensive_response: OffensiveResponse.DISABLED });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramOffensiveResponseService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: TelegramContextService, useValue: mockContextService },
        { provide: AlertsOffensiveResponseService, useValue: mockOffensiveResponseService },
        { provide: VehicleOffensiveResponseConfigService, useValue: mockVehicleOffensiveResponseConfigService },
      ],
    }).compile();

    service = module.get<TelegramOffensiveResponseService>(TelegramOffensiveResponseService);
    service.onModuleInit();
  });

  describe('The onModuleInit() method', () => {
    it('should register hears and action handlers', () => {
      expect(mockBotService.registerHears).toHaveBeenCalledTimes(2);
      expect(mockBotService.registerAction).toHaveBeenCalledTimes(8);
    });
  });

  describe('When the Sentry button is pressed', () => {
    describe('When user has no linked config', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should reply with no account linked message', async () => {
        const ctx = buildCtx();
        await hearsSentryHandler(ctx);
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
        await hearsSentryHandler(ctx);
        expect(ctx.reply).toHaveBeenCalledWith('offensiveNoVehicles', undefined);
      });
    });

    describe('When user has one vehicle', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
        mockVehicleRepository.find.mockResolvedValue([fakeVehicle]);
      });

      it('should show sentry type options directly', async () => {
        const ctx = buildCtx();
        await hearsSentryHandler(ctx);
        expect(mockKeyboardBuilderService.buildOffensiveTypeKeyboard).toHaveBeenCalledWith(
          fakeVehicle.id,
          'sentry',
          fakeVehicle.sentry_offensive_response,
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

      it('should show vehicle selection keyboard with sentry prefix', async () => {
        const ctx = buildCtx();
        await hearsSentryHandler(ctx);
        expect(mockKeyboardBuilderService.buildVehicleSelectionKeyboard).toHaveBeenCalledWith(
          [fakeVehicle, secondVehicle],
          'sentry',
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

      it('should show type options for that vehicle', async () => {
        const ctx = buildCtx(fakeChatId, ['o_sl:sentry:vehicle-1', 'sentry', 'vehicle-1']);
        await selectHandler(ctx);

        expect(mockKeyboardBuilderService.buildOffensiveTypeKeyboard).toHaveBeenCalledWith(
          fakeVehicle.id,
          'sentry',
          fakeVehicle.sentry_offensive_response,
          'en',
        );
      });
    });
  });

  describe('When a sentry offensive response is set', () => {
    beforeEach(() => {
      mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
      mockVehicleRepository.findOne.mockResolvedValue({ ...fakeVehicle });
    });

    it('should show duration keyboard when HONK is selected', async () => {
      const ctx = buildCtx(fakeChatId, ['o_ss:vehicle-1:HONK', 'vehicle-1', 'HONK']);

      await setSentryHandler(ctx);

      expect(mockKeyboardBuilderService.buildDurationKeyboard).toHaveBeenCalledWith('vehicle-1', 'en');
    });

    it('should disable sentry response when DISABLED is selected', async () => {
      const ctx = buildCtx(fakeChatId, ['o_ss:vehicle-1:DISABLED', 'vehicle-1', 'DISABLED']);

      await setSentryHandler(ctx);

      expect(mockVehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sentry_offensive_response: OffensiveResponse.DISABLED,
          sentry_offensive_response_until: null,
        }),
      );
    });
  });

  describe('When a break-in offensive response is set', () => {
    beforeEach(() => {
      mockTelegramConfigRepository.findOne.mockResolvedValue(fakeConfig);
      mockVehicleRepository.findOne.mockResolvedValue({ ...fakeVehicle });
      mockVehicleRepository.save.mockImplementation(async (v) => v);
    });

    it('should update the vehicle break_in_offensive_response and confirm', async () => {
      const ctx = buildCtx(fakeChatId, ['o_sb:vehicle-1:HONK', 'vehicle-1', 'HONK']);

      await setBreakInHandler(ctx);

      expect(mockVehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ break_in_offensive_response: OffensiveResponse.HONK }),
      );
    });
  });
});
