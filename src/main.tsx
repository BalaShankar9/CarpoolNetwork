import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { GlobalErrorBoundary } from './components/shared/GlobalErrorBoundary.tsx';
import { supabaseInitError, isSupabaseInitialized } from './lib/supabase.ts';
import { initSentry } from './lib/sentry.ts';
import { analytics } from './lib/analytics';
import { initWebVitals } from './lib/analytics/webVitals';
import './index.css';

// =============================================================================
// Boot-time Error Checking
// =============================================================================

// Check for critical initialization errors before proceeding
if (supabaseInitError) {
  console.error('[Boot] Supabase initialization failed:', supabaseInitError.message);
  // Continue rendering - GlobalErrorBoundary will catch and display the error
}

if (!isSupabaseInitialized()) {
  console.warn('[Boot] Supabase is not properly initialized. Some features may not work.');
}

// =============================================================================
// Initialize Services (only if Supabase is available)
// =============================================================================

// Initialize error tracking first (safe to call even without Supabase)
initSentry();

// Initialize analytics (GA4 + GTM) - safe to call without Supabase
// WHY: Analytics must initialize early but after DOM is ready
// to capture the full user journey including initial page load
analytics.initialize();

// Initialize Core Web Vitals tracking
// WHY: Web Vitals measurement should start after analytics
// to ensure metrics are reported correctly
initWebVitals();

// =============================================================================
// Render Application
// =============================================================================

// Create a wrapper component that throws if there's an init error
// This allows GlobalErrorBoundary to catch it
function AppWithInitCheck() {
  // If there was an initialization error, throw it so ErrorBoundary can catch
  if (supabaseInitError) {
    throw supabaseInitError;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AppWithInitCheck />
    </GlobalErrorBoundary>
  </StrictMode>
);
