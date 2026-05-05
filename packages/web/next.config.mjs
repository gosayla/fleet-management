/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fleet/shared'],
  images: { remotePatterns: [] },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent filesystem cache in dev to prevent stale chunk errors
      // (missing ./149.js, ./410.js etc. across hot recompiles on Windows)
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
