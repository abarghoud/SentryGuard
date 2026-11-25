import i18n from '../../../i18n';

const lateDeliveryThresholdMs = 2 * 60_000;
const millisecondsPerMinute = 60_000;
const minutesPerHour = 60;

export function describeLateDelivery(detectedAt: Date | undefined, lng: 'en' | 'fr'): string | null {
  const delayMs = detectedAt ? Date.now() - detectedAt.getTime() : 0;

  if (delayMs < lateDeliveryThresholdMs) {
    return null;
  }

  return i18n.t('Delayed alert: detected {{delay}} ago.', { delay: formatDelay(delayMs), lng });
}

function formatDelay(delayMs: number): string {
  const totalMinutes = Math.floor(delayMs / millisecondsPerMinute);
  const hours = Math.floor(totalMinutes / minutesPerHour);
  const minutes = totalMinutes % minutesPerHour;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
