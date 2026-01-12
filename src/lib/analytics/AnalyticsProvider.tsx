/**
 * Analytics Provider Component
 * 
 * WHY: This component handles all analytics-related side effects:
 * 1. Page view tracking on route changes
 * 2. User context syncing with auth state
 * 3. Performance monitoring integration
 * 4. Navigation tracking for form abandonments
 * 
 * USAGE: Wrap your app's main content inside the Router:
 * ```tsx
 * <Router>
 *   <AnalyticsProvider>
 *     <Routes>...</Routes>
 *   </AnalyticsProvider>
 * </Router>
 * ```
 */

import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from './index';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigationTracking } from './hooks';

interface AnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Analytics provider that handles automatic tracking.
 * 
 * WHY: Centralizing analytics side effects in one component:
 * 1. Ensures consistent tracking across all routes
 * 2. Automatically syncs user context with auth
 * 3. Easy to disable or modify tracking behavior
 * 4. Tracks form abandonments on navigation
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const { user, profile, isProfileComplete } = useAuth();

  // Track form abandonments and reset tracking state on navigation
  useNavigationTracking();

  // Track page views on route changes
  useEffect(() => {
    // WHY: Small delay ensures the new page has rendered
    // and document.title is updated
    const timeoutId = setTimeout(() => {
      analytics.pageView(location.pathname);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  // Sync user context with auth state
  useEffect(() => {
    if (user && profile) {
      // User is authenticated - identify them
      analytics.identify(user.id, {
        total_rides_offered: profile.total_rides_offered || 0,
        total_rides_taken: profile.total_rides_taken || 0,
        profile_completion_percentage: profile.profile_completion_percentage || 0,
      });
    } else if (!user) {
      // User signed out - reset analytics
      analytics.reset();
    }
  }, [user?.id, profile?.total_rides_offered, profile?.total_rides_taken, profile?.profile_completion_percentage]);

  // Update profile completion status
  useEffect(() => {
    if (isProfileComplete) {
      analytics.setFlowStage('profile_complete');
    }
  }, [isProfileComplete]);

  return <>{children}</>;
}

export default AnalyticsProvider;
