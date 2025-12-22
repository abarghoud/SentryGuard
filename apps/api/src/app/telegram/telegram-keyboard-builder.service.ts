import { Injectable } from '@nestjs/common';
import i18n from '../../i18n';

@Injectable()
export class TelegramKeyboardBuilderService {
  buildSentryAlertKeyboard(
    alertInfo: { vin: string },
    userId: string,
    userLanguage: 'en' | 'fr'
  ) {
    const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/redirect/tesla-app?userId=${userId}&lang=${userLanguage}`;

    return {
      inline_keyboard: [
        [
          {
            text: `🔍 ${i18n.t('Open Tesla App', { lng: userLanguage })}`,
            url: redirectUrl
          }
        ]
      ]
    };
  }
}
