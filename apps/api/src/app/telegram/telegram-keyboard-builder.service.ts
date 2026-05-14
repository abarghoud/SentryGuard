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
          { text: i18n.t('menuButtonSentry', { lng }) },
          { text: i18n.t('menuButtonBreakIn', { lng }) },
        ]],
        resize_keyboard: true,
      },
    };
  }

  buildVehicleSelectionKeyboard(vehicles: Vehicle[], prefix: string): TelegramMessageOptions {
    const rows = vehicles.map((vehicle) => [{
      text: vehicle.display_name || vehicle.vin,
      callback_data: `o_sl:${prefix}:${vehicle.id}`,
    }]);

    return {
      keyboard: {
        inline_keyboard: rows,
      },
    };
  }

  buildOffensiveTypeKeyboard(vehicleId: string, alertType: 'sentry' | 'break_in', currentValue: OffensiveResponse, lng: 'en' | 'fr'): TelegramMessageOptions {
    const options: Array<{ key: OffensiveResponse; label: string }> = [
      { key: OffensiveResponse.DISABLED, label: i18n.t('offensiveDisabled', { lng }) },
      { key: OffensiveResponse.HONK, label: i18n.t('offensiveHonk', { lng }) },
    ];

    const prefix = alertType === 'sentry' ? 'o_ss' : 'o_sb';
    const rows = options.map(({ key, label }) => {
      const check = key === currentValue ? '✅ ' : '';
      return [{ text: `${check}${label}`, callback_data: `${prefix}:${vehicleId}:${key}` }];
    });

    rows.push([{ text: i18n.t('offensiveTest', { lng }), callback_data: `o_t${alertType === 'sentry' ? 's' : 'b'}:${vehicleId}` }]);

    return {
      keyboard: {
        inline_keyboard: rows,
      },
    };
  }

  buildDurationKeyboard(vehicleId: string, lng: 'en' | 'fr'): TelegramMessageOptions {
    return {
      keyboard: {
        inline_keyboard: [
          [
            { text: i18n.t('offensiveDuration30m', { lng }), callback_data: `od30:${vehicleId}` },
            { text: i18n.t('offensiveDuration1h', { lng }), callback_data: `od60:${vehicleId}` },
          ],
          [
            { text: i18n.t('offensiveDuration2h', { lng }), callback_data: `od120:${vehicleId}` },
            { text: i18n.t('offensiveDuration4h', { lng }), callback_data: `od240:${vehicleId}` },
          ],
          [
            { text: i18n.t('offensiveDuration8h', { lng }), callback_data: `od480:${vehicleId}` },
            { text: i18n.t('offensiveDuration24h', { lng }), callback_data: `od1440:${vehicleId}` },
          ],
          [{ text: '❌', callback_data: `od_cancel:${vehicleId}` }],
        ],
      },
    };
  }

  buildActiveSentryKeyboard(vehicleId: string, lng: 'en' | 'fr'): TelegramMessageOptions {
    return {
      keyboard: {
        inline_keyboard: [
          [{ text: i18n.t('offensiveProlong', { lng }), callback_data: `od_prolong:${vehicleId}` }],
          [{ text: i18n.t('offensiveCancel', { lng }), callback_data: `o_ss:${vehicleId}:${OffensiveResponse.DISABLED}` }],
        ],
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
      ],
      [
        { text: '2h', callback_data: 'mute:120' },
        { text: '4h', callback_data: 'mute:240' },
      ],
      [
        { text: '8h', callback_data: 'mute:480' },
        { text: '24h', callback_data: 'mute:1440' },
      ],
      [{ text: '❌', callback_data: 'mute:cancel' }],
    ];
  }
}