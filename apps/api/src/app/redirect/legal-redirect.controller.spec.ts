import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock, MockProxy } from 'jest-mock-extended';
import request from 'supertest';
import { LegalRedirectController } from './legal-redirect.controller';

describe('The LegalRedirectController class', () => {
  let controller: LegalRedirectController;
  let mockResponse: MockProxy<Response>;
  const originalEnv = process.env.WEBAPP_URL;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalRedirectController],
    }).compile();

    controller = module.get<LegalRedirectController>(LegalRedirectController);
    mockResponse = mock<Response>();
  });

  afterEach(() => {
    process.env.WEBAPP_URL = originalEnv;
    jest.clearAllMocks();
  });

  describe('The redirectLocalized() method', () => {
    describe('When locale is fr and page is privacy', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectLocalized('fr', 'privacy', mockResponse);
      });

      it('should redirect with status 302 to french privacy url', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/fr/legal/privacy');
      });
    });

    describe('When locale is en and page is terms', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectLocalized('en', 'terms', mockResponse);
      });

      it('should redirect with status 302 to english terms url', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/en/legal/terms');
      });
    });

    describe('When page is cgu', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectLocalized('fr', 'cgu', mockResponse);
      });

      it('should redirect to terms url', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/fr/legal/terms');
      });
    });

    describe('When locale is unknown', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectLocalized('de', 'privacy', mockResponse);
      });

      it('should fallback to english locale', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/en/legal/privacy');
      });
    });

    describe('When page is unknown', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectLocalized('fr', 'unknown-page', mockResponse);
      });

      it('should fallback to privacy page', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/fr/legal/privacy');
      });
    });

    describe('When WEBAPP_URL is custom configured', () => {
      beforeEach(() => {
        process.env.WEBAPP_URL = 'https://custom.sentryguard.org/';
        controller.redirectLocalized('fr', 'privacy', mockResponse);
      });

      it('should use configured webapp url without trailing slash', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://custom.sentryguard.org/fr/legal/privacy');
      });
    });
  });

  describe('The redirectDefault() method', () => {
    describe('When page is privacy', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectDefault('privacy', mockResponse);
      });

      it('should redirect with status 302 to default english privacy url', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/en/legal/privacy');
      });
    });

    describe('When page is terms', () => {
      beforeEach(() => {
        delete process.env.WEBAPP_URL;
        controller.redirectDefault('terms', mockResponse);
      });

      it('should redirect with status 302 to default english terms url', () => {
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://sentryguard.org/en/legal/terms');
      });
    });
  });

  describe('HTTP endpoint integration', () => {
    let app: INestApplication;

    beforeEach(async () => {
      delete process.env.WEBAPP_URL;
      const module: TestingModule = await Test.createTestingModule({
        controllers: [LegalRedirectController],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    describe('When requesting GET /en/legal/privacy', () => {
      it('should return HTTP 302 redirecting to sentryguard privacy page', async () => {
        const res = await request(app.getHttpServer()).get('/en/legal/privacy');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://sentryguard.org/en/legal/privacy');
      });
    });

    describe('When requesting GET /fr/legal/terms', () => {
      it('should return HTTP 302 redirecting to sentryguard terms page', async () => {
        const res = await request(app.getHttpServer()).get('/fr/legal/terms');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://sentryguard.org/fr/legal/terms');
      });
    });

    describe('When requesting GET /legal/privacy', () => {
      it('should return HTTP 302 redirecting to default english privacy page', async () => {
        const res = await request(app.getHttpServer()).get('/legal/privacy');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://sentryguard.org/en/legal/privacy');
      });
    });

    describe('When requesting GET /legal/terms', () => {
      it('should return HTTP 302 redirecting to default english terms page', async () => {
        const res = await request(app.getHttpServer()).get('/legal/terms');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://sentryguard.org/en/legal/terms');
      });
    });
  });
});
