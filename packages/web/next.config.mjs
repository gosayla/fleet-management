/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fleet/shared'],
  images: { remotePatterns: [] },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        // Serve uploaded document files — route through api/v1 controller
        source: '/documents/:path*',
        destination: `${backendUrl}/api/v1/documents/:path*`,
      },
      {
        // Serve uploaded photos — served directly by static-assets middleware
        source: '/photos/:path*',
        destination: `${backendUrl}/photos/:path*`,
      },
    ];
  },
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
