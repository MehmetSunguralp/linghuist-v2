//@ts-check

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { withNx } = require('@nx/next');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  // Allow loading `/_next/*` assets from local-network device testing in dev.
  allowedDevOrigins: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://192.168.0.21:8080', 'http://192.168.1.7:8080'],
  // Required in Next 16 when plugins add webpack config (e.g. next-pwa).
  turbopack: {},
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.SERVER_URL,
  },
};

/** @type {(cfg: any) => any} */
const withPwaPlugin = withPWA;
/** @type {(cfg: any) => any} */
const withNxPlugin = withNx;

module.exports = withNxPlugin(withPwaPlugin(nextConfig));
