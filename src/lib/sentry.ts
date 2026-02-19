/**
 * Sentry Error Tracking
 *
 * Uses the official @sentry/react SDK.
 * DSN must be set via VITE_SENTRY_DSN environment variable.
 * Enabled in staging and production environments only.
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.MODE as string) ?? 'development';
const IS_PROD_LIKE = ENV === 'production' || ENV === 'staging';

export function initSentry() {
  if (!SENTRY_DSN || !IS_PROD_LIKE) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // Session Replay — record 1% of sessions, 100% on error
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,   // Mask PII in replays
        blockAllMedia: true,
      }),
    ],

    // Don't send errors from browser extensions or local dev
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /localhost/,
      /127\.0\.0\.1/,
    ],

    beforeSend(event) {
      // Strip personal data from breadcrumbs
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      return event;
    },
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN || !IS_PROD_LIKE) {
    console.error('[Error]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string) {
  if (!SENTRY_DSN || !IS_PROD_LIKE) {
    console.warn('[Message]', message);
    return;
  }
  Sentry.captureMessage(message);
}

export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export { Sentry };

