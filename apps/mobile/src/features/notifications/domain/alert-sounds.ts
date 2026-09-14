export interface AlertSoundItem {
  id: string;
  labelKey: string;
  asset: number;
}

export const DEFAULT_ALERT_SOUND_ID = 'sentry_siren.wav';

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

export function resolveAlertSound(id?: string): AlertSoundItem {
  const found = ALERT_SOUNDS.find((sound) => sound.id === id);
  return found ?? ALERT_SOUNDS[0];
}
