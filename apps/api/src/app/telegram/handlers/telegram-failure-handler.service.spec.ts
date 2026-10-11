import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { ErrorMeaningClassifierService } from '../../../common/services/error-meaning-classifier.service';
import { TelegramFailureHandlerService } from './telegram-failure-handler.service';
import { TelegramConfigService } from '../telegram-config.service';

describe('The TelegramFailureHandlerService class', () => {
  let service: TelegramFailureHandlerService;
  let mockTelegramConfigService: MockProxy<TelegramConfigService>;
  let mockErrorClassifier: MockProxy<ErrorMeaningClassifierService>;

  beforeEach(async () => {
    mockTelegramConfigService = mock<TelegramConfigService>();
    mockErrorClassifier = mock<ErrorMeaningClassifierService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramFailureHandlerService,
        {
          provide: TelegramConfigService,
          useValue: mockTelegramConfigService,
        },
        {
          provide: ErrorMeaningClassifierService,
          useValue: mockErrorClassifier,
        },
      ],
    }).compile();

    service = module.get<TelegramFailureHandlerService>(TelegramFailureHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The canHandle() method', () => {
    describe('When the error means the Telegram contact is gone', () => {
      it('should return true', async () => {
        const error = new Error('bot was blocked by the user');
        mockErrorClassifier.isTelegramContactGone.mockResolvedValue(true);

        await expect(service.canHandle(error)).resolves.toBe(true);

        expect(mockErrorClassifier.isTelegramContactGone).toHaveBeenCalledWith(error);
      });
    });

    describe('When the error is unrelated to the Telegram contact', () => {
      it('should return false', async () => {
        const error = new Error('network timeout');
        mockErrorClassifier.isTelegramContactGone.mockResolvedValue(false);

        await expect(service.canHandle(error)).resolves.toBe(false);
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