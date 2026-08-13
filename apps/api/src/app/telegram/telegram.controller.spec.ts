import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { TelegramController } from './telegram.controller';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramContextService } from './telegram-context.service';
import {
  ITelegramFailureHandler,
  telegramFailureHandler,
} from './interfaces/telegram-failure-handler.interface';
import { TelegramConfig } from '../../entities/telegram-config.entity';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';

describe('The TelegramController class', () => {
  const fakeChatId = '123456789';
  const fakeUser = { userId: 'user-1', email: 'test@example.com' } as User;
  const blockedBotError = new Error('403: Forbidden: bot was blocked by the user');

  let controller: TelegramController;
  let mockTelegramBotService: MockProxy<TelegramBotService>;
  let mockTelegramContextService: MockProxy<TelegramContextService>;
  let mockFailureHandler: MockProxy<ITelegramFailureHandler>;
  let mockTelegramConfigRepository: MockProxy<Repository<TelegramConfig>>;

  beforeEach(async () => {
    mockTelegramBotService = mock<TelegramBotService>();
    mockTelegramContextService = mock<TelegramContextService>();
    mockFailureHandler = mock<ITelegramFailureHandler>();
    mockTelegramConfigRepository = mock<Repository<TelegramConfig>>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        { provide: getRepositoryToken(TelegramConfig), useValue: mockTelegramConfigRepository },
        { provide: TelegramBotService, useValue: mockTelegramBotService },
        { provide: TelegramContextService, useValue: mockTelegramContextService },
        { provide: telegramFailureHandler, useValue: mockFailureHandler },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<TelegramController>(TelegramController);
    mockTelegramContextService.getChatIdFromUserId.mockResolvedValue(fakeChatId);
  });

  describe('The sendTestMessage() method', () => {
    describe('When the account is not linked', () => {
      let result: { success: boolean; message: string };

      beforeEach(async () => {
        mockTelegramContextService.getChatIdFromUserId.mockResolvedValue(null);

        result = await controller.sendTestMessage(fakeUser);
      });

      it('should report a failure', () => {
        expect(result.success).toBe(false);
      });

      it('should not attempt to send a message', () => {
        expect(mockTelegramBotService.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('When the message is sent', () => {
      let result: { success: boolean; message: string };

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockResolvedValue(true);

        result = await controller.sendTestMessage(fakeUser);
      });

      it('should report a success', () => {
        expect(result).toEqual({ success: true, message: 'Message sent successfully' });
      });

      it('should not invoke the failure handler', () => {
        expect(mockFailureHandler.handleFailure).not.toHaveBeenCalled();
      });
    });

    describe('When the user has blocked the bot', () => {
      let result: { success: boolean; message: string };

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(blockedBotError);
        mockFailureHandler.canHandle.mockReturnValue(true);
        mockFailureHandler.handleFailure.mockResolvedValue(undefined);

        result = await controller.sendTestMessage(fakeUser);
      });

      it('should not let the error escape the controller', () => {
        expect(result.success).toBe(false);
      });

      it('should delegate to the failure handler', () => {
        expect(mockFailureHandler.handleFailure).toHaveBeenCalledWith(
          blockedBotError,
          fakeUser.userId
        );
      });
    });

    describe('When disabling Telegram also fails', () => {
      let result: { success: boolean; message: string };

      beforeEach(async () => {
        mockTelegramBotService.sendMessage.mockRejectedValue(blockedBotError);
        mockFailureHandler.canHandle.mockReturnValue(true);
        mockFailureHandler.handleFailure.mockRejectedValue(new Error('Database connection failed'));

        result = await controller.sendTestMessage(fakeUser);
      });

      it('should still report a failure instead of throwing', () => {
        expect(result.success).toBe(false);
      });
    });

    describe('When the rejection is not an Error instance', () => {
      let result: { success: boolean; message: string };
      let errorSpy: jest.SpyInstance;

      beforeEach(async () => {
        errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();
        mockTelegramBotService.sendMessage.mockRejectedValue('403: Forbidden');

        result = await controller.sendTestMessage(fakeUser);
      });

      afterEach(() => {
        errorSpy.mockRestore();
      });

      it('should report a failure instead of throwing', () => {
        expect(result.success).toBe(false);
      });

      it('should not ask the failure handler to inspect it', () => {
        expect(mockFailureHandler.canHandle).not.toHaveBeenCalled();
      });
    });

    describe('When the failure is unrelated to a blocked bot', () => {
      let result: { success: boolean; message: string };
      let errorSpy: jest.SpyInstance;

      beforeEach(async () => {
        errorSpy = jest.spyOn(controller['logger'], 'error').mockImplementation();
        mockTelegramBotService.sendMessage.mockRejectedValue(new Error('network timeout'));
        mockFailureHandler.canHandle.mockReturnValue(false);

        result = await controller.sendTestMessage(fakeUser);
      });

      afterEach(() => {
        errorSpy.mockRestore();
      });

      it('should report a failure', () => {
        expect(result.success).toBe(false);
      });

      it('should not disable the Telegram integration', () => {
        expect(mockFailureHandler.handleFailure).not.toHaveBeenCalled();
      });

      it('should log the unexpected failure', () => {
        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });
});
