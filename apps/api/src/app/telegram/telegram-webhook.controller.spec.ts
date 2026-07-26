import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { Request, Response } from 'express';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramBotService } from './telegram-bot.service';

describe('The TelegramWebhookController class', () => {
  let controller: TelegramWebhookController;
  let mockTelegramBotService: MockProxy<TelegramBotService>;
  let mockRequest: MockProxy<Request>;
  let mockResponse: MockProxy<Response>;

  beforeEach(async () => {
    mockTelegramBotService = mock<TelegramBotService>();
    mockRequest = mock<Request>();
    mockResponse = mock<Response>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramWebhookController],
      providers: [
        { provide: TelegramBotService, useValue: mockTelegramBotService },
      ],
    }).compile();

    controller = module.get<TelegramWebhookController>(
      TelegramWebhookController
    );
  });

  describe('The handleWebhook() method', () => {
    describe('When the path secret is invalid', () => {
      it('should throw a NotFoundException', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );

        await expect(
          controller.handleWebhook('wrong--secret', mockRequest, mockResponse)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('When the path secret has a different length', () => {
      it('should throw a NotFoundException', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );

        await expect(
          controller.handleWebhook('short', mockRequest, mockResponse)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('When the path secret is valid and no header secret is configured', () => {
      it('should delegate the update to the bot service', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );
        mockTelegramBotService.getWebhookSecretToken.mockReturnValue(undefined);

        await controller.handleWebhook(
          'expected-secret',
          mockRequest,
          mockResponse
        );

        expect(mockTelegramBotService.handleUpdate).toHaveBeenCalledWith(
          mockRequest,
          mockResponse
        );
      });
    });

    describe('When the header secret is invalid', () => {
      it('should throw a ForbiddenException', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );
        mockTelegramBotService.getWebhookSecretToken.mockReturnValue(
          'header-secret'
        );
        mockRequest.headers = {
          'x-telegram-bot-api-secret-token': 'wrong--header',
        };

        await expect(
          controller.handleWebhook('expected-secret', mockRequest, mockResponse)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('When the header secret is missing', () => {
      it('should throw a ForbiddenException', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );
        mockTelegramBotService.getWebhookSecretToken.mockReturnValue(
          'header-secret'
        );
        mockRequest.headers = {};

        await expect(
          controller.handleWebhook('expected-secret', mockRequest, mockResponse)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('When both secrets are valid', () => {
      it('should delegate the update to the bot service', async () => {
        mockTelegramBotService.getWebhookSecretPath.mockReturnValue(
          'expected-secret'
        );
        mockTelegramBotService.getWebhookSecretToken.mockReturnValue(
          'header-secret'
        );
        mockRequest.headers = {
          'x-telegram-bot-api-secret-token': 'header-secret',
        };

        await controller.handleWebhook(
          'expected-secret',
          mockRequest,
          mockResponse
        );

        expect(mockTelegramBotService.handleUpdate).toHaveBeenCalledWith(
          mockRequest,
          mockResponse
        );
      });
    });
  });
});
