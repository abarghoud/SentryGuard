export interface AlertSoundItem {
  asset: number | null;
  id: string;
  labelKey: string;
}

export const PHONE_DEFAULT_ALERT_SOUND_ID = 'default';

export const PHONE_DEFAULT_ALERT_SOUND: AlertSoundItem = {
  asset: null,
  id: PHONE_DEFAULT_ALERT_SOUND_ID,
  labelKey: 'settings.soundPhoneDefault',
};

export const ALERT_SOUNDS: readonly AlertSoundItem[] = [
  {
    asset: require('../../../../assets/sounds/sentry_siren.wav'),
    id: 'sentry_siren.wav',
    labelKey: 'settings.soundSentrySiren',
  },
  {
    asset: require('../../../../assets/sounds/cyber_pulse.wav'),
    id: 'cyber_pulse.wav',
    labelKey: 'settings.soundCyberPulse',
  },
  {
    asset: require('../../../../assets/sounds/tesla_horn.wav'),
    id: 'tesla_horn.wav',
    labelKey: 'settings.soundTeslaHorn',
  },
  {
    asset: require('../../../../assets/sounds/danger_sonar.wav'),
    id: 'danger_sonar.wav',
    labelKey: 'settings.soundDangerSonar',
  },
  {
    asset: require('../../../../assets/sounds/klaxon_alarm.wav'),
    id: 'klaxon_alarm.wav',
    labelKey: 'settings.soundKlaxonAlarm',
  },
] as const;

export const SELECTABLE_ALERT_SOUNDS: readonly AlertSoundItem[] = [
  PHONE_DEFAULT_ALERT_SOUND,
  ...ALERT_SOUNDS,
] as const;

export function resolveAlertSound(id?: string): AlertSoundItem {
  const found = SELECTABLE_ALERT_SOUNDS.find((sound) => sound.id === id);
  return found ?? PHONE_DEFAULT_ALERT_SOUND;
}
