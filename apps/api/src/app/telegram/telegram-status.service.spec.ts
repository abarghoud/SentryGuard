import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Context } from 'telegraf';
import { TelegramStatusService } from './telegram-status.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { TelegramContextService } from './telegram-context.service';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { Vehicle } from '../../entities/vehicle.entity';

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
}));

describe('The TelegramStatusService class', () => {
  const fakeChatId = '456';
  const fakeUserId = 'user-123';

  let service: TelegramStatusService;
  let statusHandler: (ctx: Context) => Promise<void>;
  let helpHandler: (ctx: Context) => Promise<void>;

  const mockTelegramConfigRepository = { findOne: jest.fn() };
  const mockVehicleRepository = { find: jest.fn() };
  const mockBotService: MockProxy<TelegramBotService> = mock<TelegramBotService>();
  const mockKeyboardBuilderService: MockProxy<TelegramKeyboardBuilderService> = mock<TelegramKeyboardBuilderService>();
  const mockContextService: MockProxy<TelegramContextService> = mock<TelegramContextService>();

  const buildCtx = (chatId = fakeChatId): Context =>
    ({
      chat: { id: parseInt(chatId) },
      reply: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Context;

  beforeEach(async () => {
    mockBotService.registerHears.mockImplementation((_, handler) => { statusHandler = handler; });
    mockBotService.registerCommand.mockImplementation((_, handler) => { statusHandler = handler; });
    mockBotService.registerHelp.mockImplementation((handler) => { helpHandler = handler; });
    mockContextService.getUserLanguageFromChatId.mockResolvedValue('en');
    mockKeyboardBuilderService.buildMainMenuKeyboard.mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramStatusService,
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TelegramBotService, useValue: mockBotService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilderService },
        { provide: TelegramContextService, useValue: mockContextService },
      ],
    }).compile();

    service = module.get<TelegramStatusService>(TelegramStatusService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The onModuleInit() method', () => {
    it('should register hears, command, and help handlers', () => {
      expect(mockBotService.registerHears).toHaveBeenCalledTimes(1);
      expect(mockBotService.registerCommand).toHaveBeenCalledWith('status', expect.any(Function));
      expect(mockBotService.registerHelp).toHaveBeenCalledTimes(1);
    });
  });

  describe('When the status button is pressed', () => {
    describe('When no linked account is found', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue(null);
      });

      it('should reply with the no account linked message', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith('No account linked', undefined);
      });
    });

    describe('When a linked account is found with no vehicles', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          linked_at: new Date('2026-01-01'),
          muted_until: null,
          status: TelegramLinkStatus.LINKED,
        });
        mockVehicleRepository.find.mockResolvedValue([]);
      });

      it('should include the no vehicles message in the status', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('configStatusNoVehicles'),
          undefined
        );
      });

      it('should include the Telegram section in the status', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('configStatusTelegramLinked'),
          undefined
        );
      });
    });

    describe('When a linked account is found with vehicles', () => {
      const vehicles = [
        { display_name: 'My Model 3', vin: 'VIN001', telemetry_enabled: true } as Vehicle,
        { display_name: undefined, vin: 'VIN002', telemetry_enabled: false } as Vehicle,
      ];

      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          linked_at: new Date('2026-01-01'),
          muted_until: null,
          status: TelegramLinkStatus.LINKED,
        });
        mockVehicleRepository.find.mockResolvedValue(vehicles);
      });

      it('should include the vehicle display_name when available', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('My Model 3'),
          undefined
        );
      });

      it('should fall back to VIN when display_name is not set', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('VIN002'),
          undefined
        );
      });

      it('should show active telemetry status for enabled vehicles', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('configStatusTelemetryActive'),
          undefined
        );
      });

      it('should show inactive telemetry status for disabled vehicles', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('configStatusTelemetryInactive'),
          undefined
        );
      });
    });

    describe('When the user is currently muted', () => {
      beforeEach(() => {
        mockTelegramConfigRepository.findOne.mockResolvedValue({
          userId: fakeUserId,
          linked_at: new Date('2026-01-01'),
          muted_until: new Date(Date.now() + 60 * 60_000),
          status: TelegramLinkStatus.LINKED,
        });
        mockVehicleRepository.find.mockResolvedValue([]);
      });

      it('should include the mute status in the message', async () => {
        const ctx = buildCtx();

        await statusHandler(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
          expect.stringContaining('configStatusMutedUntil'),
          undefined
        );
      });
    });
  });

  describe('When the /help command is received', () => {
    it('should reply with the available commands message', async () => {
      const ctx = buildCtx();

      await helpHandler(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Available commands');
    });
  });
});
