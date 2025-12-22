import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { TeslaAppRedirectController } from './tesla-app-redirect.controller';
import { mock, MockProxy } from 'jest-mock-extended';


describe('The TeslaAppRedirectController class', () => {
  let controller: TeslaAppRedirectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeslaAppRedirectController],
    }).compile();

    controller = module.get<TeslaAppRedirectController>(TeslaAppRedirectController);
  });

  describe('The teslaRedirect() method', () => {
    let mockResponse: MockProxy<Response>;

    beforeEach(() => {
      mockResponse = mock<Response>();
      mockResponse.req = {
        headers: {},
        ip: '127.0.0.1',
      } as any;
    });

    describe('When called without parameters', () => {
      beforeEach(() => {
        controller.teslaRedirect(mockResponse);
      });

      it('should set correct content type header', () => {
        expect((mockResponse.setHeader as jest.Mock)).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      });

      it('should return HTML content', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
      });

      it('should include Tesla app redirect page structure', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('Ouverture App Tesla')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('Télécharger l\'app Tesla')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('Choisissez votre plateforme')
        );
      });

      it('should include iOS and Android buttons', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('App Store iOS')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('Play Store Android')
        );
      });
    });

    describe('When called with userId parameter', () => {
      beforeEach(() => {
        controller.teslaRedirect(mockResponse, 'user-123');
      });

      it('should return HTML without errors', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
      });
    });

    describe('When called with lang parameter', () => {
      describe('When lang is "fr"', () => {
        beforeEach(() => {
          controller.teslaRedirect(mockResponse, undefined, 'fr');
        });

        it('should use French translations', () => {
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('lang="fr"')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Ouverture App Tesla')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Télécharger l\'app Tesla')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('App Store iOS')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Play Store Android')
          );
        });
      });

      describe('When lang is "en"', () => {
        beforeEach(() => {
          controller.teslaRedirect(mockResponse, undefined, 'en');
        });

        it('should use English translations', () => {
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('lang="en"')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Tesla App Redirect')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Download Tesla App')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('iOS App Store')
          );
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
            expect.stringContaining('Android Play Store')
          );
        });
      });
    });

    describe('The HTML structure', () => {
      beforeEach(() => {
        controller.teslaRedirect(mockResponse);
      });

      it('should include Tesla deep link', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('tesla://')
        );
      });

      it('should include App Store links', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('https://apps.apple.com/app/tesla/id582007913')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('https://play.google.com/store/apps/details?id=com.teslamotors.tesla')
        );
      });

      it('should include JavaScript for app detection', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('visibilitychange')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('window.location.href = \'tesla://\'')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('setTimeout')
        );
      });

      it('should include proper CSS styling', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('background: linear-gradient(135deg, #000 0%, #333 100%)')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('.tesla-logo')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('.button:hover')
        );
      });
    });
  });
});
