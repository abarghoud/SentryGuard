const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const customConfig = {
  cacheVersion: 'mobile',
  transformer: {
    asyncRequireModulePath: require.resolve('expo/internal/async-require-module'),
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((extension) => extension !== 'svg'),
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);
