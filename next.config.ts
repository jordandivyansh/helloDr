import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.CLINIC_HOSTED_BUILD === 'true'
    ? { output: 'export' as const, distDir: '.next-hosted', trailingSlash: true }
    : { async rewrites() { return [{ source: '/api/:path*', destination: `${process.env.API_URL || 'http://127.0.0.1:4000'}/api/:path*` }]; } }),
};
export default nextConfig;
