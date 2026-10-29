import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal workspace packages ship TypeScript source (no build step).
  transpilePackages: [
    '@matriq/api-client',
    '@matriq/core',
    '@matriq/demo-content',
    '@matriq/i18n',
    '@matriq/types',
    '@matriq/ui',
    '@matriq/validation',
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
