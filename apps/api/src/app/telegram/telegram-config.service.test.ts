import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { TelegramConfigService } from './telegram-config.service';

describe('The TelegramConfigService class', () => {
  let service: TelegramConfigService;
  let mockRepository: MockProxy<Repository<TelegramConfig>>;

  beforeEach(async () => {
    mockRepository = mock<Repository<TelegramConfig>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramConfigService,
        {
          provide: getRepositoryToken(TelegramConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TelegramConfigService>(TelegramConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('The removeTelegramConfig() method', () => {
    describe('When configuration is successfully removed', () => {
      it('should delete the config and log success', async () => {
        const userId = 'user-123';

        mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

        await expect(service.removeTelegramConfig(userId)).resolves.not.toThrow();

        expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
        expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      });
    });

    describe('When no configuration is found', () => {
      it('should attempt deletion and log warning', async () => {
        const userId = 'user-456';

        mockRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

        await expect(service.removeTelegramConfig(userId)).resolves.not.toThrow();

        expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
        expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      });
    });

    describe('When database operation fails', () => {
      it('should throw the error', async () => {
        const userId = 'user-789';
        const testError = new Error('Database connection failed');

        mockRepository.delete.mockRejectedValue(testError);

        await expect(service.removeTelegramConfig(userId)).rejects.toThrow(testError);

        expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
        expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      });
    });
  });
});