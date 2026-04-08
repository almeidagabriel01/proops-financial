import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // No performance tracing in MVP (Error Monitoring only)
  tracesSampleRate: 0,
});
