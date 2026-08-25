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
  de: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/de/common.json'), 'utf-8')
    ),
  },
  nl: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/nl/common.json'), 'utf-8')
    ),
  },
  no: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/no/common.json'), 'utf-8')
    ),
  },
  es: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/es/common.json'), 'utf-8')
    ),
  },
  it: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/it/common.json'), 'utf-8')
    ),
  },
  sv: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/sv/common.json'), 'utf-8')
    ),
  },
  da: {
    common: JSON.parse(
      readFileSync(join(__dirname, 'locales/da/common.json'), 'utf-8')
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
