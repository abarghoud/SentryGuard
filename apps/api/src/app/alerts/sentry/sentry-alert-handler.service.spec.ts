import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { SentryAlertHandlerService } from './sentry-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { UserLanguageService } from '../../user/user-language.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { User } from '../../../entities/user.entity';
import { TelemetryMessage, SentryModeState } from '../../telemetry/models/telemetry-message.model';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

const mockTelegramService = mock<TelegramService>();
const mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
const mockUserLanguageService = mock<UserLanguageService>();
const mockVehicleRepository = mock<Repository<Vehicle>>();
const mockUserRepository = mock<Repository<User>>();

describe('The SentryAlertHandlerService class', () => {
  let service: SentryAlertHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryAlertHandlerService,
        {
          provide: TelegramService,
          useValue: mockTelegramService
        },
        {
          provide: TelegramKeyboardBuilderService,
          useValue: mockKeyboardBuilder
        },
        {
          provide: UserLanguageService,
          useValue: mockUserLanguageService
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository
        }
      ]
    }).compile();

    service = module.get<SentryAlertHandlerService>(SentryAlertHandlerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The handle method', () => {
    describe('when message does not contain valid SentryMode', () => {
      it('should skip message without SentryMode', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'OtherField', value: { stringValue: 'value' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });

      it('should skip message with invalid SentryMode value', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'SentryMode', value: { sentryModeStateValue: 'InvalidState' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });

      it('should skip message with null SentryMode value', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'SentryMode', value: { sentryModeStateValue: null } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });

      it('should skip message with invalid sentryModeStateValue', async () => {
        const invalidMessage = plainToInstance(TelemetryMessage, {
          data: [{ key: 'SentryMode', value: { sentryModeStateValue: 'InvalidState' } }],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        await service.handle(invalidMessage);

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    const baseTelemetryMessage = plainToInstance(TelemetryMessage, {
      data: [
        {
          key: 'SentryMode',
          value: { sentryModeStateValue: 'SentryModeStateAware' }
        }
      ],
      createdAt: '2025-01-21T10:00:00.000Z',
      vin: 'TEST_VIN_123',
      isResend: false
    });

    let handlePromise: Promise<void>;

    describe('when SentryMode is Aware and vehicle exists', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([
          {
            userId: 'test-user',
            display_name: 'Test Vehicle'
          } as Vehicle
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
        mockTelegramService.sendSentryAlert.mockResolvedValue(true);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should send Sentry alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.find).toHaveBeenCalledWith({
          where: { vin: 'TEST_VIN_123' },
          select: ['userId', 'display_name']
        });

        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('test-user');
        expect(mockKeyboardBuilder.buildSentryAlertKeyboard).toHaveBeenCalledWith({
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'test-user', 'en');
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'en', {
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
      });
    });

    describe('when SentryMode is Aware and multiple users have the same VIN', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([
          {
            userId: 'test-user-1',
            display_name: 'Test Vehicle'
          } as Vehicle,
          {
            userId: 'test-user-2',
            display_name: 'Test Vehicle'
          } as Vehicle,
          {
            userId: 'test-user-3',
            display_name: 'Test Vehicle'
          } as Vehicle
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
        mockTelegramService.sendSentryAlert.mockResolvedValue(true);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should send Sentry alert to all users', async () => {
        await handlePromise;

        expect(mockVehicleRepository.find).toHaveBeenCalledWith({
          where: { vin: 'TEST_VIN_123' },
          select: ['userId', 'display_name']
        });

        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledTimes(3);
        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('test-user-1');
        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('test-user-2');
        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('test-user-3');

        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledTimes(3);
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-1', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'en', expect.any(Object));
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-2', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'en', expect.any(Object));
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-3', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'en', expect.any(Object));
      });
    });

    describe('when SentryMode is Aware and multiple users have the same VIN with duplicate userIds (should never happen, but just in case)', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([
          {
            userId: 'test-user-1',
            display_name: 'Test Vehicle'
          } as Vehicle,
          {
            userId: 'test-user-1',
            display_name: 'Test Vehicle'
          } as Vehicle,
          {
            userId: 'test-user-2',
            display_name: 'Test Vehicle'
          } as Vehicle
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
        mockTelegramService.sendSentryAlert.mockResolvedValue(true);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should deduplicate userIds and send alert only once per user', async () => {
        await handlePromise;

        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledTimes(2);
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-1', expect.any(Object), 'en', expect.any(Object));
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-2', expect.any(Object), 'en', expect.any(Object));
      });
    });

    describe('when SentryMode is not Aware', () => {
      beforeEach(async () => {
        const telemetryMessage = plainToInstance(TelemetryMessage, {
          ...baseTelemetryMessage,
          data: [
            {
              key: 'SentryMode',
              value: { sentryModeStateValue: SentryModeState.Off }
            }
          ]
        });

        handlePromise = service.handle(telemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when SentryMode data is missing', () => {
      beforeEach(async () => {
        const telemetryMessage = plainToInstance(TelemetryMessage, {
          data: [
            {
              key: 'OtherData',
              value: { stringValue: 'SomeValue' }
            }
          ],
          createdAt: baseTelemetryMessage.createdAt,
          vin: baseTelemetryMessage.vin,
          isResend: baseTelemetryMessage.isResend
        });

        handlePromise = service.handle(telemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when vehicle is not found', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([]);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should not send alert', async () => {
        await handlePromise;

        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when repository query fails', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockRejectedValue(new Error('Database error'));

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should throw error', async () => {
        await expect(handlePromise).rejects.toThrow('Database error');

        expect(mockTelegramService.sendSentryAlert).not.toHaveBeenCalled();
      });
    });

    describe('when Telegram service fails for one user', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([
          {
            userId: 'test-user-1',
            display_name: 'Test Vehicle'
          } as Vehicle,
          {
            userId: 'test-user-2',
            display_name: 'Test Vehicle'
          } as Vehicle
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
        mockTelegramService.sendSentryAlert
          .mockRejectedValueOnce(new Error('Telegram error'))
          .mockResolvedValueOnce(true);

        handlePromise = service.handle(baseTelemetryMessage);
      });

      it('should continue notifying other users even if one fails', async () => {
        await handlePromise;

        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledTimes(2);
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-1', expect.any(Object), 'en', expect.any(Object));
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user-2', expect.any(Object), 'en', expect.any(Object));
      });
    });

    describe('when SentryMode is provided as sentryModeStateValue and is Aware', () => {
      beforeEach(async () => {
        mockVehicleRepository.find.mockResolvedValue([
          {
            userId: 'test-user',
            display_name: 'Test Vehicle'
          } as Vehicle
        ]);
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
        mockTelegramService.sendSentryAlert.mockResolvedValue(true);

        const message = plainToInstance(TelemetryMessage, {
          data: [
            {
              key: 'SentryMode',
              value: { sentryModeStateValue: 'SentryModeStateAware' }
            }
          ],
          createdAt: '2025-01-21T10:00:00.000Z',
          vin: 'TEST_VIN_123',
          isResend: false
        });

        handlePromise = service.handle(message);
      });

      it('should send Sentry alert', async () => {
        await handlePromise;

        expect(mockVehicleRepository.find).toHaveBeenCalledWith({
          where: { vin: 'TEST_VIN_123' },
          select: ['userId', 'display_name']
        });

        expect(mockUserLanguageService.getUserLanguage).toHaveBeenCalledWith('test-user');
        expect(mockKeyboardBuilder.buildSentryAlertKeyboard).toHaveBeenCalledWith({
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'test-user', 'en');
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith('test-user', {
          vin: 'TEST_VIN_123',
          display_name: 'Test Vehicle'
        }, 'en', {
          inline_keyboard: [[{ text: 'Test Button', url: 'http://test.com' }]]
        });
      });
    });
  });
});
