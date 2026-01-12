/**
 * Analytics React Hooks
 * 
 * WHY: Custom hooks provide React-idiomatic access to analytics
 * with automatic lifecycle management and TypeScript support.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from './index';
import type { FlowStage, UserRole } from './types';
import { buckets } from './utils';

// ============================================================================
// PAGE VIEW TRACKING HOOK
// ============================================================================

/**
 * Automatically tracks page views on route changes.
 * 
 * WHY: SPA navigation doesn't trigger traditional page views.
 * This hook ensures every route change is tracked.
 * 
 * USAGE:
 * ```tsx
 * function App() {
 *   usePageViewTracking();
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function usePageViewTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analytics.pageView(location.pathname);
  }, [location.pathname]);
}

// ============================================================================
// USER CONTEXT HOOK
// ============================================================================

/**
 * Updates analytics user context when auth state changes.
 * 
 * WHY: Keeping analytics in sync with auth ensures accurate
 * user segmentation and journey tracking.
 * 
 * USAGE:
 * ```tsx
 * function AuthProvider({ children }) {
 *   const { user, profile } = useAuth();
 *   useAnalyticsUser(user?.id, profile);
 *   return <>{children}</>;
 * }
 * ```
 */
export function useAnalyticsUser(
  userId?: string | null,
  profile?: {
    total_rides_offered?: number;
    total_rides_taken?: number;
    profile_completion_percentage?: number;
  } | null
): void {
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    // User signed in
    if (userId && userId !== prevUserId.current) {
      analytics.identify(userId, profile || undefined);
      prevUserId.current = userId;
    }
    
    // User signed out
    if (!userId && prevUserId.current) {
      analytics.reset();
      prevUserId.current = null;
    }
  }, [userId, profile]);
}

// ============================================================================
// FORM TRACKING HOOK
// ============================================================================

interface FormTrackingOptions {
  /** Form name for analytics */
  formName: string;
  /** Current step in multi-step form (1-indexed) */
  currentStep?: number;
  /** Total steps in multi-step form */
  totalSteps?: number;
}

interface FormTrackingReturn {
  /** Call when user starts filling the form */
  trackFormStart: () => void;
  /** Call when a field is interacted with */
  trackFieldInteraction: (fieldName: string) => void;
  /** Call when form is successfully submitted */
  trackFormSubmit: () => void;
  /** Call when form has validation errors */
  trackFormError: (fieldErrors: string[]) => void;
}

/**
 * Hook for tracking form interactions and abandonment.
 * 
 * WHY: Form tracking helps identify UX friction:
 * - Which fields cause drop-offs
 * - How long users spend
 * - What errors they encounter
 * 
 * USAGE:
 * ```tsx
 * function SignUpForm() {
 *   const { trackFormStart, trackFieldInteraction, trackFormSubmit, trackFormError } = 
 *     useFormTracking({ formName: 'signup' });
 *   
 *   useEffect(() => trackFormStart(), []);
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input onFocus={() => trackFieldInteraction('email')} />
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormTracking(options: FormTrackingOptions): FormTrackingReturn {
  const { formName, currentStep = 1, totalSteps = 1 } = options;
  
  const startTime = useRef<number | null>(null);
  const fieldsInteracted = useRef<Set<string>>(new Set());
  const fieldErrors = useRef<Set<string>>(new Set());

  // Track form abandonment on unmount
  useEffect(() => {
    return () => {
      if (startTime.current && fieldsInteracted.current.size > 0) {
        const timeSpent = (Date.now() - startTime.current) / 1000;
        analytics.funnel.formAbandoned({
          form_name: formName,
          fields_filled: Array.from(fieldsInteracted.current),
          fields_with_errors: Array.from(fieldErrors.current),
          time_spent_seconds: timeSpent,
        });
      }
    };
  }, [formName]);

  const trackFormStart = useCallback(() => {
    startTime.current = Date.now();
    fieldsInteracted.current.clear();
    fieldErrors.current.clear();
    
    if (totalSteps > 1) {
      analytics.funnel.step({
        funnel_name: formName,
        step_name: `step_${currentStep}`,
        step_number: currentStep,
        total_steps: totalSteps,
      });
    }
  }, [formName, currentStep, totalSteps]);

  const trackFieldInteraction = useCallback((fieldName: string) => {
    fieldsInteracted.current.add(fieldName);
  }, []);

  const trackFormSubmit = useCallback(() => {
    // Clear the start time so abandonment doesn't fire
    startTime.current = null;
    
    if (totalSteps > 1 && currentStep === totalSteps) {
      analytics.funnel.step({
        funnel_name: formName,
        step_name: 'complete',
        step_number: totalSteps + 1,
        total_steps: totalSteps,
      });
    }
  }, [formName, currentStep, totalSteps]);

  const trackFormError = useCallback((errors: string[]) => {
    errors.forEach(e => fieldErrors.current.add(e));
    analytics.track.errorStateShown({
      error_type: 'validation',
      error_source: formName,
    });
  }, [formName]);

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmit,
    trackFormError,
  };
}

// ============================================================================
// FLOW STAGE HOOK
// ============================================================================

/**
 * Hook for managing flow stage in a component.
 * 
 * WHY: Ensures flow stage is properly set and cleaned up
 * when components mount/unmount.
 * 
 * USAGE:
 * ```tsx
 * function PostRidePage() {
 *   useFlowStage('ride_create');
 *   return <PostRideForm />;
 * }
 * ```
 */
export function useFlowStage(stage: FlowStage): void {
  useEffect(() => {
    analytics.setFlowStage(stage);
  }, [stage]);
}

// ============================================================================
// EMPTY STATE TRACKING HOOK
// ============================================================================

/**
 * Hook for tracking empty states.
 * 
 * WHY: Empty states often indicate UX issues. Tracking them
 * helps identify where users get stuck.
 * 
 * USAGE:
 * ```tsx
 * function RidesList({ rides }) {
 *   useEmptyStateTracking(rides.length === 0, 'no_rides_found', 'Search again');
 *   
 *   if (rides.length === 0) {
 *     return <EmptyState />;
 *   }
 *   return <ul>...</ul>;
 * }
 * ```
 */
export function useEmptyStateTracking(
  isEmpty: boolean,
  context: string,
  ctaShown?: string
): void {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (isEmpty && !hasTracked.current) {
      analytics.funnel.emptyStateShown({
        empty_state_context: context,
        cta_shown: ctaShown,
      });
      hasTracked.current = true;
    }
    
    if (!isEmpty) {
      hasTracked.current = false;
    }
  }, [isEmpty, context, ctaShown]);
}

// ============================================================================
// ERROR TRACKING HOOK
// ============================================================================

interface ErrorTrackingOptions {
  /** The component/source showing the error */
  source: string;
}

/**
 * Hook for tracking error states.
 * 
 * WHY: Understanding where errors occur helps prioritize fixes.
 * 
 * USAGE:
 * ```tsx
 * function DataLoader({ error }) {
 *   const { trackError } = useErrorTracking({ source: 'DataLoader' });
 *   
 *   useEffect(() => {
 *     if (error) trackError('network', error.code);
 *   }, [error]);
 * }
 * ```
 */
export function useErrorTracking(options: ErrorTrackingOptions) {
  const { source } = options;
  const trackedErrors = useRef<Set<string>>(new Set());

  const trackError = useCallback((
    errorType: 'auth' | 'network' | 'validation' | 'permission' | 'not_found' | 'server' | 'unknown',
    errorCode?: string
  ) => {
    // Prevent duplicate tracking of the same error
    const errorKey = `${errorType}-${errorCode || 'none'}`;
    if (trackedErrors.current.has(errorKey)) {
      return;
    }
    
    trackedErrors.current.add(errorKey);
    analytics.track.errorStateShown({
      error_type: errorType,
      error_source: source,
      error_code: errorCode,
    });
  }, [source]);

  // Clear tracked errors when component unmounts
  useEffect(() => {
    return () => {
      trackedErrors.current.clear();
    };
  }, []);

  return { trackError };
}

// ============================================================================
// TIMING HOOK
// ============================================================================

/**
 * Hook for tracking time-based metrics.
 * 
 * WHY: Understanding how long actions take helps identify slow flows.
 * 
 * USAGE:
 * ```tsx
 * function ProfileForm() {
 *   const { startTimer, getElapsedBucket } = useTiming();
 *   
 *   useEffect(() => startTimer(), []);
 *   
 *   const onSubmit = () => {
 *     analytics.track.profileCompleted({
 *       time_to_complete_bucket: getElapsedBucket(),
 *     });
 *   };
 * }
 * ```
 */
export function useTiming() {
  const startTime = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    startTime.current = Date.now();
  }, []);

  const getElapsedSeconds = useCallback((): number | null => {
    if (!startTime.current) return null;
    return Math.round((Date.now() - startTime.current) / 1000);
  }, []);

  const getElapsedBucket = useCallback((): string => {
    const seconds = getElapsedSeconds();
    if (seconds === null) return 'unknown';
    return buckets.timeSeconds(seconds);
  }, [getElapsedSeconds]);

  return {
    startTimer,
    getElapsedSeconds,
    getElapsedBucket,
  };
}

// ============================================================================
// FUNNEL TRACKING HOOK
// ============================================================================

import type { FunnelId } from './funnels';
import { FUNNELS, getCurrentFunnelStep, getFunnelProgress } from './funnels';

interface FunnelTrackingOptions {
  /** Funnel to track */
  funnelId: FunnelId;
  /** Auto-track based on route changes */
  autoTrack?: boolean;
}

/**
 * Hook for tracking user progress through a defined funnel.
 * 
 * WHY: Funnel tracking enables CRO analysis by tracking
 * where users are in their journey and where they drop off.
 * 
 * USAGE:
 * ```tsx
 * function OnboardingWizard() {
 *   const { progress, currentStep, trackStepComplete } = useFunnelTracking({
 *     funnelId: 'onboarding',
 *   });
 *   
 *   return (
 *     <div>
 *       <ProgressBar value={progress} />
 *       <StepContent step={currentStep} onComplete={trackStepComplete} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useFunnelTracking(options: FunnelTrackingOptions) {
  const { funnelId, autoTrack = false } = options;
  const location = useLocation();
  const lastTrackedStep = useRef<string | null>(null);

  // Get current step based on route
  const currentStep = getCurrentFunnelStep(funnelId, location.pathname);
  const progress = currentStep ? getFunnelProgress(funnelId, currentStep.id) : 0;
  const funnel = FUNNELS[funnelId];

  // Auto-track step on route change
  useEffect(() => {
    if (!autoTrack || !currentStep) return;
    if (lastTrackedStep.current === currentStep.id) return;

    analytics.funnel.step({
      funnel_name: funnelId,
      step_name: currentStep.id,
      step_number: currentStep.position,
      total_steps: funnel.steps.length,
    });

    lastTrackedStep.current = currentStep.id;
  }, [autoTrack, currentStep, funnelId, funnel.steps.length]);

  // Manually track step completion
  const trackStepComplete = useCallback((stepId?: string) => {
    const stepToTrack = stepId 
      ? funnel.steps.find(s => s.id === stepId)
      : currentStep;

    if (!stepToTrack) return;

    analytics.funnel.step({
      funnel_name: funnelId,
      step_name: `${stepToTrack.id}_complete`,
      step_number: stepToTrack.position,
      total_steps: funnel.steps.length,
    });
  }, [funnelId, funnel.steps, currentStep]);

  // Track drop-off for this funnel
  const trackDropOff = useCallback((reason: string) => {
    if (!currentStep) return;

    analytics.funnel.step({
      funnel_name: funnelId,
      step_name: `dropoff_${currentStep.id}`,
      step_number: currentStep.position,
      total_steps: 0, // 0 indicates drop-off
      custom_properties: {
        drop_off_reason: reason,
      },
    });
  }, [funnelId, currentStep]);

  return {
    funnel,
    currentStep,
    progress,
    trackStepComplete,
    trackDropOff,
  };
}

// ============================================================================
// NAVIGATION ABANDONMENT HOOK
// ============================================================================

import { trackAllFormAbandonments, resetEmptyStateTracking } from './dropoff';

/**
 * Hook that tracks form abandonments when user navigates away.
 * Place this at the top level of your app (e.g., in AnalyticsProvider).
 * 
 * WHY: Users often navigate away from forms without submitting.
 * This hook ensures those abandonments are captured.
 */
export function useNavigationTracking(): void {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    // Only track on actual navigation (not initial mount)
    if (prevPath.current && prevPath.current !== location.pathname) {
      // Track any abandoned forms
      trackAllFormAbandonments();
      // Reset empty state tracking for new page
      resetEmptyStateTracking();
    }
    prevPath.current = location.pathname;
  }, [location.pathname]);

  // Also track on page unload
  useEffect(() => {
    const handleUnload = () => {
      trackAllFormAbandonments();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}

// ============================================================================
// SEARCH TRACKING HOOK
// ============================================================================

interface SearchTrackingOptions {
  /** Context of the search (e.g., 'rides', 'users') */
  searchContext: string;
}

/**
 * Hook for tracking search behavior.
 * 
 * WHY: Understanding search patterns helps optimize the search experience.
 * 
 * USAGE:
 * ```tsx
 * function RideSearch() {
 *   const { trackSearch, trackEmptyResults } = useSearchTracking({ 
 *     searchContext: 'rides' 
 *   });
 *   
 *   const onSearch = async (query) => {
 *     const results = await search(query);
 *     if (results.length === 0) {
 *       trackEmptyResults(query);
 *     } else {
 *       trackSearch(results.length);
 *     }
 *   };
 * }
 * ```
 */
export function useSearchTracking(options: SearchTrackingOptions) {
  const { searchContext } = options;
  const searchCount = useRef(0);

  const trackSearch = useCallback((resultCount: number) => {
    searchCount.current++;
    
    analytics.funnel.step({
      funnel_name: 'search',
      step_name: 'search_performed',
      step_number: searchCount.current,
      total_steps: 3, // search -> view -> action
      custom_properties: {
        search_context: searchContext,
        result_count_bucket: resultCount === 0 ? '0' 
          : resultCount <= 5 ? '1-5'
          : resultCount <= 20 ? '6-20'
          : '20+',
      },
    });
  }, [searchContext]);

  const trackEmptyResults = useCallback((queryLength?: number) => {
    analytics.funnel.emptyStateShown({
      empty_state_context: `${searchContext}_no_results`,
      cta_shown: 'Modify search',
    });

    analytics.track.errorStateShown({
      error_type: 'not_found',
      error_source: searchContext,
      error_code: queryLength ? `query_${queryLength}_chars` : undefined,
    });
  }, [searchContext]);

  const trackResultClicked = useCallback((position: number) => {
    analytics.funnel.step({
      funnel_name: 'search',
      step_name: 'result_clicked',
      step_number: 2,
      total_steps: 3,
      custom_properties: {
        search_context: searchContext,
        result_position: position,
      },
    });
  }, [searchContext]);

  return {
    trackSearch,
    trackEmptyResults,
    trackResultClicked,
  };
}
