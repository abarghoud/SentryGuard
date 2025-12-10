import { Test, TestingModule } from '@nestjs/testing';
import { CallbackController } from './callback.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';

describe('CallbackController', () => {
  let controller: CallbackController;
  let authService: AuthService;

  const mockAuthService = {
    exchangeCodeForTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallbackController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<CallbackController>(CallbackController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('handleTeslaCallback', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        redirect: jest.fn(),
      };
    });

    it('should process a valid callback and display success page', async () => {
      const mockUserId = 'test-user-id';
      const mockAccessToken = 'test-access-token';
      const mockJwt = 'test-jwt';

      mockAuthService.exchangeCodeForTokens.mockResolvedValue({
        userId: mockUserId,
        access_token: mockAccessToken,
        jwt: mockJwt,
      });

      await controller.handleTeslaCallback(
        'test-code',
        'test-state',
        'en-US',
        'https://auth.tesla.com',
        mockResponse as Response
      );

      expect(authService.exchangeCodeForTokens).toHaveBeenCalledWith(
        'test-code',
        'test-state'
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining(`/callback#token=${encodeURIComponent(mockJwt)}`)
      );
    });

    it('should handle callback without code or state', async () => {
      await controller.handleTeslaCallback(
        '',
        '',
        'en-US',
        'https://auth.tesla.com',
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Authentication error')
      );
      expect(authService.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('should handle authentication error', async () => {
      mockAuthService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Authentication failed')
      );

      await controller.handleTeslaCallback(
        'test-code',
        'test-state',
        'en-US',
        'https://auth.tesla.com',
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/callback?error=Authentication%20failed')
      );
    });
  });
});
