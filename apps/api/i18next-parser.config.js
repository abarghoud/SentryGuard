module.exports = {
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: 'src/**/*.{ts,tsx}',
  // Détecter t() et i18n.t() - le parser détecte automatiquement les appels de fonction
  functions: ['t'],
  // Forcer toutes les clés dans le namespace 'common' (harmonisé avec la webapp)
  defaultNamespace: 'common',
  // Spécifier explicitement les namespaces autorisés (seulement 'common')
  ns: ['common'],
  // Désactiver complètement le séparateur de namespace
  // Utiliser un caractère qui n'apparaît jamais dans les clés
  nsSeparator: '___NAMESPACE_SEPARATOR___',
  keySeparator: false,
  // Utiliser la clé comme valeur par défaut pour la locale anglaise
  useKeysAsDefaultValue: true,
  // Réinitialiser les valeurs par défaut pour la locale anglaise (force la mise à jour)
  resetDefaultValueLocale: 'en',
  sort: true,
  indentation: 2,
  locales: ['en', 'fr'],
  defaultValue: (locale, namespace, key) => {
    // Pour la locale anglaise (langue par défaut), utiliser la clé comme valeur par défaut
    if (locale === 'en') {
      return key;
    }
    // Pour les autres locales, laisser vide pour être rempli manuellement
    return '';
  },
  keepRemoved: false,
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JavascriptLexer'],
  },
};
