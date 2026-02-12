//@ts-check

 
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
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
  // Add more Next.js plugins to this list if needed.
  withNx,
];

// Next.js 16 removed eslint config support, but Nx still adds it. Remove it here.
const composedConfig = composePlugins(...plugins)(nextConfig);
delete composedConfig.eslint;

module.exports = composedConfig;
