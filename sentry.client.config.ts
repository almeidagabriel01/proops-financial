import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — avoids noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Capture 10% of transactions for performance monitoring (Error Monitoring only in MVP)
  tracesSampleRate: 0,

  // Session replay is out of scope for MVP
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  // Ignore known non-actionable errors
  ignoreErrors: [
    // Network errors from user's connection issues
    'NetworkError',
    'Failed to fetch',
    // Next.js navigation cancellations
    'AbortError',
  ],
});
