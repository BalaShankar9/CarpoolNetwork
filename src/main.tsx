import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/shared/ErrorBoundary.tsx';
import { initSentry } from './lib/sentry.ts';
import { analytics } from './lib/analytics';
import { initWebVitals } from './lib/analytics/webVitals';
import './index.css';

// Initialize error tracking first
initSentry();

// Initialize analytics (GA4 + GTM)
// WHY: Analytics must initialize early but after DOM is ready
// to capture the full user journey including initial page load
analytics.initialize();

// Initialize Core Web Vitals tracking
// WHY: Web Vitals measurement should start after analytics
// to ensure metrics are reported correctly
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
