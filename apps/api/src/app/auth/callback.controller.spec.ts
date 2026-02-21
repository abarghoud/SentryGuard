import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { Response } from 'express';
import { CallbackController } from './callback.controller';
import { AuthService } from './auth.service';

describe('The CallbackController class', () => {
  let controller: CallbackController;
  let mockAuthService: MockProxy<AuthService>;
  let mockResponse: MockProxy<Response>;

  beforeEach(async () => {
    mockAuthService = mock<AuthService>();
    mockResponse = mock<Response>();
    mockResponse.redirect.mockReturnValue(undefined as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallbackController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<CallbackController>(CallbackController);
  });

  describe('The handleTeslaCallback() method', () => {
    describe('When Tesla returns an error param', () => {
      describe('When error is login_cancelled', () => {
        beforeEach(async () => {
          await controller.handleTeslaCallback(
            '',
            '',
            'fr-FR',
            '',
            'login_cancelled',
            'User cancelled login',
            mockResponse
          );
        });

        it('should redirect to the webapp callback with the error and description', () => {
          expect(mockResponse.redirect).toHaveBeenCalledWith(
            expect.stringContaining('error=login_cancelled')
          );
          expect(mockResponse.redirect).toHaveBeenCalledWith(
            expect.stringContaining('error_description=User+cancelled+login')
          );
        });

        it('should not call exchangeCodeForTokens', () => {
          expect(mockAuthService.exchangeCodeForTokens).not.toHaveBeenCalled();
        });
      });

      describe('When error has no description', () => {
        beforeEach(async () => {
          await controller.handleTeslaCallback(
            '',
            '',
            'en-US',
            '',
            'access_denied',
            '',
            mockResponse
          );
        });

        it('should redirect to the webapp callback with only the error', () => {
          expect(mockResponse.redirect).toHaveBeenCalledWith(
            expect.stringContaining('error=access_denied')
          );
        });
      });
    });

    describe('When code and state are missing and no error param', () => {
      beforeEach(async () => {
        await controller.handleTeslaCallback(
          '',
          '',
          'en-US',
          '',
          '',
          '',
          mockResponse
        );
      });

      it('should redirect to the webapp callback with missing_parameters error', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          expect.stringContaining('error=missing_parameters')
        );
      });

      it('should not call exchangeCodeForTokens', () => {
        expect(mockAuthService.exchangeCodeForTokens).not.toHaveBeenCalled();
      });
    });

    describe('When code and state are valid', () => {
      const mockJwt = 'test-jwt-token';

      beforeEach(async () => {
        mockAuthService.exchangeCodeForTokens.mockResolvedValue({
          userId: 'test-user-id',
          access_token: 'test-access-token',
          jwt: mockJwt,
        });

        await controller.handleTeslaCallback(
          'test-code',
          'test-state',
          'en-US',
          'https://auth.tesla.com',
          '',
          '',
          mockResponse
        );
      });

      it('should call exchangeCodeForTokens with code and state', () => {
        expect(mockAuthService.exchangeCodeForTokens).toHaveBeenCalledWith(
          'test-code',
          'test-state'
        );
      });

      it('should redirect to the webapp callback with the JWT token in the hash', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          expect.stringContaining(`/callback#token=${encodeURIComponent(mockJwt)}`)
        );
      });
    });

    describe('When exchangeCodeForTokens throws', () => {
      const expectedError = 'Authentication failed';

      beforeEach(async () => {
        mockAuthService.exchangeCodeForTokens.mockRejectedValue(
          new Error(expectedError)
        );

        await controller.handleTeslaCallback(
          'test-code',
          'test-state',
          'en-US',
          '',
          '',
          '',
          mockResponse
        );
      });

      it('should redirect to the webapp callback with the error message', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(
          expect.stringContaining(`/callback?error=${encodeURIComponent(expectedError)}`)
        );
      });
    });
  });
});