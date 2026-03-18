/**
 * App.tsx — Thin shell
 *
 * Composes providers, error boundary, analytics, and routes.
 * Route definitions live in src/routes/appRoutes.tsx (V1) and
 * src/routes/deferredRoutes.tsx (Phase 2+, behind feature flag).
 *
 * Previously 770 lines — now delegates to focused modules.
 */

import { AppProviders } from './providers/AppProviders';
import { AppErrorBoundary } from './components/shared/ProductionErrorBoundary';
import { AnalyticsProvider } from './lib/analytics/AnalyticsProvider';
import CookieConsent from './components/shared/CookieConsent';
import AppRoutes from './routes/appRoutes';

function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        {/* Analytics must be inside Router for useLocation */}
        <AnalyticsProvider>
          <AppRoutes />
        </AnalyticsProvider>
        {/* Cookie consent — must be inside Router for Link to work */}
        <CookieConsent />
      </AppErrorBoundary>
    </AppProviders>
  );
}

export default App;