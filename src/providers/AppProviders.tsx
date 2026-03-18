/**
 * App Providers
 *
 * The provider tree that wraps the entire application.
 * Trimmed for V1: PremiumProvider removed (out-of-scope subscription feature).
 * SocialProvider is only used inside deferred social routes — not global.
 *
 * Provider order (outermost → innermost):
 *   HelmetProvider → LoadingProvider → AuthProvider → RealtimeProvider → Router → children
 */

import { ReactNode } from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../contexts/AuthContext';
import { RealtimeProvider } from '../contexts/RealtimeContext';
import { LoadingProvider } from '../components/shared/LoadingStateManager';

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <LoadingProvider>
        <AuthProvider>
          <RealtimeProvider>
            <Router>
              {children}
            </Router>
          </RealtimeProvider>
        </AuthProvider>
      </LoadingProvider>
    </HelmetProvider>
  );
}
