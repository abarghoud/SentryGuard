//@ts-check

 
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.buymeacoffee.com',
      },
    ],
  },
  productionBrowserSourceMaps: false,
};

const plugins = [
  withNx,
];

const composedConfig = composePlugins(...plugins)(nextConfig);
delete composedConfig.eslint;

module.exports = composedConfig;
