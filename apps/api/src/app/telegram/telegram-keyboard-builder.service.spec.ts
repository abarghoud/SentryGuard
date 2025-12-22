import { Test, TestingModule } from '@nestjs/testing';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';

type TelegramKeyboard = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
};

describe('The TelegramKeyboardBuilderService class', () => {
  let service: TelegramKeyboardBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramKeyboardBuilderService],
    }).compile();

    service = module.get<TelegramKeyboardBuilderService>(TelegramKeyboardBuilderService);
  });

  describe('The buildSentryAlertKeyboard() method', () => {
    const alertInfo = { vin: 'TEST123' };
    const userId = 'user-123';
    const baseUrl = 'http://localhost:3000';

    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_BASE = baseUrl;
    });

    afterEach(() => {
      delete process.env.TELEGRAM_WEBHOOK_BASE;
    });

    describe('When called with valid parameters', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        result = service.buildSentryAlertKeyboard(alertInfo, userId, 'en');
      });

      it('should return keyboard with inline_keyboard structure', () => {
        expect(result).toHaveProperty('inline_keyboard');
        expect(Array.isArray(result.inline_keyboard)).toBe(true);
        expect(result.inline_keyboard).toHaveLength(1);
      });

      it('should contain one button row', () => {
        expect(result.inline_keyboard[0]).toHaveLength(1);
      });

      it('should have button with correct text and URL', () => {
        const button = result.inline_keyboard[0][0];
        expect(button).toHaveProperty('text');
        expect(button).toHaveProperty('url');
        expect(button.text).toContain('Check');
        expect(button.url).toContain(`${baseUrl}/redirect/tesla-app`);
      });

      it('should include userId and lang in URL', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.url).toContain('userId=user-123');
        expect(button.url).toContain('lang=en');
      });
    });

    describe('When called with French language', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        result = service.buildSentryAlertKeyboard(alertInfo, userId, 'fr');
      });

      it('should use French button text', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.text).toContain('Vérifier');
        expect(button.url).toContain('lang=fr');
      });
    });

    describe('When TELEGRAM_WEBHOOK_BASE is not set', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        delete process.env.TELEGRAM_WEBHOOK_BASE;
        result = service.buildSentryAlertKeyboard(alertInfo, userId, 'en');
      });

      it('should use localhost fallback', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.url).toContain('http://localhost:3000/redirect/tesla-app');
      });
    });
  });
});
