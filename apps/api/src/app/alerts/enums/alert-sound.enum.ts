export enum AlertSound {
  CyberPulse = 'cyber_pulse.wav',
  DangerSonar = 'danger_sonar.wav',
  KlaxonAlarm = 'klaxon_alarm.wav',
  PhoneDefault = 'default',
  SentrySiren = 'sentry_siren.wav',
  TeslaHorn = 'tesla_horn.wav',
}

export const DEFAULT_ALERT_SOUND = AlertSound.PhoneDefault;

export function resolveAlertSound(value?: string | null): AlertSound {
  const isKnownSound = Object.values(AlertSound).includes(value as AlertSound);
  return isKnownSound ? (value as AlertSound) : DEFAULT_ALERT_SOUND;
}
