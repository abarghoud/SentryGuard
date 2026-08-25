const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de', 'nl', 'no', 'es', 'it', 'sv', 'da'],
  },
  localePath: path.resolve('./src/locales'),
};
