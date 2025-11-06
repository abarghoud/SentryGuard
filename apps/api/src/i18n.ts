import * as i18n from 'i18next';
import { join } from 'path';
import { readFileSync } from 'fs';

const resources = {
  en: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/en/common.json'), 'utf-8')
    ),
  },
  fr: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/fr/common.json'), 'utf-8')
    ),
  },
};

i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  resources,
});

export default i18n;
