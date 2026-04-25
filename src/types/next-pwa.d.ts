declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  type PwaConfig = Record<string, unknown>;

  export default function withPWA(config: PwaConfig): (nextConfig: NextConfig) => NextConfig;
}