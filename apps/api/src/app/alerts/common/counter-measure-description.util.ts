import i18n from '../../../i18n';
import { CounterMeasure } from '../enums/counter-measure.enum';

const COUNTER_MEASURE_SENTENCES: Record<CounterMeasure, (lng: 'en' | 'fr') => string> = {
  [CounterMeasure.AutoSentry]: (lng) => i18n.t('Sentry Mode was turned on.', { lng }),
  [CounterMeasure.Fart]: (lng) => i18n.t('The fart sound played.', { lng }),
  [CounterMeasure.Honk]: (lng) => i18n.t('The horn sounded.', { lng }),
};

export const describeCounterMeasures = (counterMeasures: CounterMeasure[], lng: 'en' | 'fr'): string =>
  counterMeasures.map(counterMeasure => COUNTER_MEASURE_SENTENCES[counterMeasure](lng)).join(' ');
