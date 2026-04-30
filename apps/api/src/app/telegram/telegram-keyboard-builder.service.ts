import { Injectable } from '@nestjs/common';
import i18n from '../../i18n';
import { TelegramMessageOptions } from './telegram.types';

@Injectable()
export class TelegramKeyboardBuilderService {
  buildSentryAlertKeyboard(
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

  buildBreakInAlertKeyboard(
    userId: string,
    userLanguage: 'en' | 'fr'
  ) {
    return this.buildSentryAlertKeyboard(userId, userLanguage);
  }

  buildMainMenuKeyboard(lng: 'en' | 'fr', mutedUntil: Date | null | undefined = null): TelegramMessageOptions {
    const isMuted = mutedUntil != null && new Date() < mutedUntil;
    const muteButtonKey = isMuted ? 'menuButtonMuteActive' : 'menuButtonMute';

    return {
      keyboard: {
        keyboard: [[
          { text: i18n.t('menuButtonStatus', { lng }) },
          { text: i18n.t(muteButtonKey, { lng }) },
        ]],
        resize_keyboard: true,
      },
    };
  }

  buildMuteActiveKeyboard(lng: 'en' | 'fr'): TelegramMessageOptions {
    return {
      keyboard: {
        inline_keyboard: [
          [{ text: i18n.t('muteReactivate', { lng }), callback_data: 'mute:reactivate' }],
          [{ text: i18n.t('muteChangeDuration', { lng }), callback_data: 'mute:change' }],
          [{ text: '❌', callback_data: 'mute:cancel' }],
        ],
      },
    };
  }

  buildMuteDurationKeyboard(): TelegramMessageOptions {
    return {
      keyboard: {
        inline_keyboard: this.buildMuteDurationRows(),
      },
    };
  }

  private buildMuteDurationRows(): Array<Array<{ text: string; callback_data: string }>> {
    return [
      [
        { text: '30 min', callback_data: 'mute:30' },
        { text: '1h', callback_data: 'mute:60' },
        { text: '2h', callback_data: 'mute:120' },
      ],
      [
        { text: '4h', callback_data: 'mute:240' },
        { text: '8h', callback_data: 'mute:480' },
        { text: '24h', callback_data: 'mute:1440' },
      ],
      [{ text: '❌', callback_data: 'mute:cancel' }],
    ];
  }
}