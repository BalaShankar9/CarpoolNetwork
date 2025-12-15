const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

let sentryInitialized = false;

interface SentryContext {
  componentStack?: string | null;
  [key: string]: unknown;
}

export function initSentry() {
  if (!SENTRY_DSN || sentryInitialized) return;

  try {
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/7.120.0/bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Sentry) {
        window.Sentry.init({
          dsn: SENTRY_DSN,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
        });
        sentryInitialized = true;
      }
    };
    document.head.appendChild(script);
  } catch (e) {
    console.warn('Failed to initialize Sentry:', e);
  }
}

export function captureException(error: Error, context?: SentryContext) {
  if (window.Sentry && sentryInitialized) {
    window.Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string) {
  if (window.Sentry && sentryInitialized) {
    window.Sentry.captureMessage(message);
  }
}

declare global {
  interface Window {
    Sentry?: {
      init: (config: { dsn: string; environment: string; tracesSampleRate: number }) => void;
      captureException: (error: Error, context?: { extra?: SentryContext }) => void;
      captureMessage: (message: string) => void;
    };
  }
}
