import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { TelegramFailureHandlerService } from './telegram-failure-handler.service';
import { TelegramConfigService } from '../telegram-config.service';

describe('The TelegramFailureHandlerService class', () => {
  let service: TelegramFailureHandlerService;
  let mockTelegramConfigService: MockProxy<TelegramConfigService>;

  beforeEach(async () => {
    mockTelegramConfigService = mock<TelegramConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramFailureHandlerService,
        {
          provide: TelegramConfigService,
          useValue: mockTelegramConfigService,
        },
      ],
    }).compile();

    service = module.get<TelegramFailureHandlerService>(TelegramFailureHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The canHandle() method', () => {
    describe('When error message contains "bot was blocked by the user"', () => {
      it('should return true', () => {
        const error = new Error('bot was blocked by the user');
        expect(service.canHandle(error)).toBe(true);
      });
    });

    describe('When error message contains "forbidden: bot was blocked"', () => {
      it('should return true', () => {
        const error = new Error('forbidden: bot was blocked');
        expect(service.canHandle(error)).toBe(true);
      });
    });

    describe('When error message contains "chat not found"', () => {
      it('should return true', () => {
        const error = new Error('chat not found');
        expect(service.canHandle(error)).toBe(true);
      });
    });

    describe('When error message uses mixed case', () => {
      it('should return true', () => {
        const error = new Error('Bot Was Blocked By The User');
        expect(service.canHandle(error)).toBe(true);
      });
    });

    describe('When error message is not related to bot blocking', () => {
      it('should return false', () => {
        const error = new Error('network timeout');
        expect(service.canHandle(error)).toBe(false);
      });
    });

    describe('When error message is empty', () => {
      it('should return false', () => {
        const error = new Error('');
        expect(service.canHandle(error)).toBe(false);
      });
    });
  });

  describe('The handleFailure() method', () => {
    const userId = 'user123';

    describe('When removeTelegramConfig succeeds', () => {
      it('should remove Telegram configuration', async () => {
        mockTelegramConfigService.removeTelegramConfig.mockResolvedValue(undefined);

        const error = new Error('bot was blocked by the user');
        await expect(service.handleFailure(error, userId)).resolves.not.toThrow();

        expect(mockTelegramConfigService.removeTelegramConfig).toHaveBeenCalledWith(userId);
        expect(mockTelegramConfigService.removeTelegramConfig).toHaveBeenCalledTimes(1);
      });
    });

    describe('When removeTelegramConfig fails', () => {
      it('should throw the removal error', async () => {
        const removalError = new Error('Database connection failed');
        mockTelegramConfigService.removeTelegramConfig.mockRejectedValue(removalError);

        const error = new Error('bot was blocked by the user');
        await expect(service.handleFailure(error, userId)).rejects.toThrow(removalError);

        expect(mockTelegramConfigService.removeTelegramConfig).toHaveBeenCalledWith(userId);
        expect(mockTelegramConfigService.removeTelegramConfig).toHaveBeenCalledTimes(1);
      });
    });
  });
});