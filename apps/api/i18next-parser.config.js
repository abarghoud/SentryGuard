module.exports = {
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: 'src/**/*.{ts,tsx}',
  functions: ['t'],
  defaultNamespace: 'common',
  ns: ['common'],
  nsSeparator: '___NAMESPACE_SEPARATOR___',
  keySeparator: false,
  useKeysAsDefaultValue: true,
  resetDefaultValueLocale: 'en',
  sort: true,
  indentation: 2,
  locales: ['en', 'fr'],
  defaultValue: (locale, namespace, key) => {
    if (locale === 'en') {
      return key;
    }

    return '';
  },
  keepRemoved: false,
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JavascriptLexer'],
  },
};
