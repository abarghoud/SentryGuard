import { Injectable } from '@nestjs/common';
import i18n from '../../i18n';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
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
        ], [
          { text: i18n.t('menuButtonOffensive', { lng }) },
        ]],
        resize_keyboard: true,
      },
    };
  }

  buildVehicleSelectionKeyboard(vehicles: Vehicle[], prefix: string): TelegramMessageOptions {
    const shortPrefix = prefix === 'offensive' ? 'o_sl' : prefix;
    const rows = vehicles.map((vehicle) => [{
      text: vehicle.display_name || vehicle.vin,
      callback_data: `${shortPrefix}:${vehicle.id}`,
    }]);

    return {
      keyboard: {
        inline_keyboard: rows,
      },
    };
  }

  buildOffensiveResponseKeyboard(vehicleId: string, currentResponse: OffensiveResponse, lng: 'en' | 'fr'): TelegramMessageOptions {
    const options: Array<{ key: OffensiveResponse; label: string }> = [
      { key: OffensiveResponse.DISABLED, label: i18n.t('offensiveDisabled', { lng }) },
      { key: OffensiveResponse.FLASH, label: i18n.t('offensiveFlash', { lng }) },
      { key: OffensiveResponse.HONK, label: i18n.t('offensiveHonk', { lng }) },
      { key: OffensiveResponse.FLASH_AND_HONK, label: i18n.t('offensiveFlashAndHonk', { lng }) },
    ];

    const keyboard = options.map(({ key, label }) => {
      const prefix = key === currentResponse ? '✅ ' : '';
      return [{ text: `${prefix}${label}`, callback_data: `o_s:${vehicleId}:${key}` }];
    });

    keyboard.push([{ text: i18n.t('offensiveTest', { lng }), callback_data: `o_t:${vehicleId}` }]);

    return {
      keyboard: {
        inline_keyboard: keyboard,
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