import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwist from '@serwist/next';

const nextConfig: NextConfig = {
  /* config options here */
};

const withPWA = withSerwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // Disable service worker in development to avoid caching issues
  disable: process.env.NODE_ENV === 'development',
});

export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress Sentry CLI output unless in CI
  silent: !process.env.CI,

  // Upload source maps for readable stack traces in Sentry
  widenClientFileUpload: true,
});
