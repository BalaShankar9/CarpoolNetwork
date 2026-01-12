/**
 * Analytics Core Module
 * 
 * WHY: This is the SINGLE ENTRY POINT for all analytics in the app.
 * Components should ONLY import from this file, never from individual modules.
 * 
 * This ensures:
 * 1. Consistent API across the app
 * 2. Single place to disable/modify analytics
 * 3. Proper initialization order
 * 4. Easy testing and debugging
 * 
 * USAGE:
 * ```ts
 * import { analytics } from '@/lib/analytics';
 * 
 * // Track an event
 * analytics.track.signUpComplete({ signup_method: 'email' });
 * 
 * // Track a page view
 * analytics.pageView('/find-rides');
 * ```
 */

import type {
  AnalyticsEvent,
  BaseEventProperties,
  FlowStage,
  UserContext,
  SignUpCompleteEvent,
  ProfileCompletedEvent,
  RideCreatedEvent,
  RideRequestedEvent,
  RideAcceptedEvent,
  MessageSentEvent,
  WhatsappHandoffEvent,
  ErrorStateShownEvent,
  FunnelStepEvent,
  FormAbandonedEvent,
  EmptyStateShownEvent,
  WebVitalsEvent,
  ToolInteractionEvent,
} from './types';

import { getAnalyticsConfig, validateAnalyticsConfig } from './config';
import { initializeGA4, sendGA4Event, sendPageView, setUserProperties, sendWebVital } from './ga4';
import { loadGTMScript, pushToDataLayer, pushUserProperties, clearUserProperties } from './dataLayer';
import {
  getSessionId,
  detectDeviceType,
  createAnonymousId,
  buckets,
  determineUserRole,
  sanitizePagePath,
} from './utils';

// ============================================================================
// SINGLETON STATE
// ============================================================================

let isInitialized = false;
let userContext: UserContext | null = null;
let currentFlowStage: FlowStage = 'visit';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the analytics system.
 * Call this once at app startup (in main.tsx).
 * 
 * WHY: Initialization must happen early but after DOM is ready.
 * We load GA4 and GTM scripts and validate configuration.
 */
function initialize(): void {
  if (isInitialized) {
    return;
  }

  const config = getAnalyticsConfig();

  // Log any configuration warnings
  const warnings = validateAnalyticsConfig();
  if (warnings.length > 0 && config.debug) {
    console.warn('[Analytics] Configuration warnings:', warnings);
  }

  if (config.disabled) {
    if (config.debug) {
      console.log('[Analytics] Disabled via configuration');
    }
    isInitialized = true;
    return;
  }

  // Initialize GA4
  initializeGA4();

  // Load GTM if configured
  if (config.gtmContainerId) {
    loadGTMScript(config.gtmContainerId);
  }

  // Set initial user context
  userContext = {
    anonymousId: createAnonymousId(),
    userRole: 'unknown',
    deviceType: detectDeviceType(),
    isAuthenticated: false,
    profileCompletionBucket: 0,
  };

  // Push initial user properties
  pushUserProperties({
    user_role: userContext.userRole,
    device_type: userContext.deviceType,
    is_authenticated: false,
    environment: config.environment,
  });

  isInitialized = true;

  if (config.debug) {
    console.log('[Analytics] Initialized', { config, userContext });
    
    // Initialize debug tools in development
    import('./debug').then(({ initDebugTools }) => {
      initDebugTools();
    });
  }
}

// ============================================================================
// BASE EVENT PROPERTIES
// ============================================================================

/**
 * Creates base event properties that are included with every event.
 * 
 * WHY: Consistent properties across all events enable:
 * 1. Reliable funnel analysis
 * 2. Device/role segmentation
 * 3. Session tracking
 */
function getBaseProperties(): BaseEventProperties {
  const config = getAnalyticsConfig();
  
  return {
    page_path: typeof window !== 'undefined' ? sanitizePagePath(window.location.pathname) : '/',
    flow_stage: currentFlowStage,
    user_role: userContext?.userRole || 'unknown',
    device_type: userContext?.deviceType || detectDeviceType(),
    environment: config.environment,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
  };
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

/**
 * Updates user context when user signs in/out or profile changes.
 * 
 * WHY: Keeping user context up to date ensures accurate segmentation
 * and helps track the user journey across sessions.
 */
function updateUserContext(updates: Partial<UserContext>): void {
  userContext = {
    ...userContext!,
    ...updates,
  };

  // Sync with GA4 and dataLayer
  setUserProperties({
    anonymousId: userContext.anonymousId,
    userRole: userContext.userRole,
    deviceType: userContext.deviceType,
    isAuthenticated: userContext.isAuthenticated,
    profileCompletionBucket: userContext.profileCompletionBucket,
  });

  const config = getAnalyticsConfig();
  if (config.debug) {
    console.log('[Analytics] User context updated:', userContext);
  }
}

/**
 * Sets the current flow stage.
 * 
 * WHY: Flow stage tracking enables funnel analysis to understand
 * where users drop off in their journey.
 */
function setFlowStage(stage: FlowStage): void {
  currentFlowStage = stage;
  
  const config = getAnalyticsConfig();
  if (config.debug) {
    console.log('[Analytics] Flow stage updated:', stage);
  }
}

// ============================================================================
// EVENT TRACKING API
// ============================================================================

/**
 * Core event trackers.
 * 
 * WHY: Strongly typed functions ensure events are always sent with
 * correct properties and prevent typos in event names.
 */
const track = {
  /**
   * Track successful sign up completion.
   */
  signUpComplete(params: { signup_method: SignUpCompleteEvent['signup_method'] }): void {
    setFlowStage('signup_complete');
    
    const event: SignUpCompleteEvent = {
      event_name: 'sign_up_complete',
      ...getBaseProperties(),
      flow_stage: 'signup_complete',
      signup_method: params.signup_method,
    };
    
    sendGA4Event(event);
  },

  /**
   * Track profile completion.
   */
  profileCompleted(params: {
    fields_completed: string[];
    time_to_complete_seconds?: number;
  }): void {
    setFlowStage('profile_complete');
    
    const event: ProfileCompletedEvent = {
      event_name: 'profile_completed',
      ...getBaseProperties(),
      flow_stage: 'profile_complete',
      fields_completed: params.fields_completed,
      time_to_complete_bucket: params.time_to_complete_seconds 
        ? buckets.timeSeconds(params.time_to_complete_seconds) 
        : 'unknown',
    };
    
    sendGA4Event(event);
  },

  /**
   * Track ride creation by driver.
   */
  rideCreated(params: {
    seats: number;
    is_recurring: boolean;
    distance_km?: number;
  }): void {
    setFlowStage('ride_create');
    
    const event: RideCreatedEvent = {
      event_name: 'ride_created',
      ...getBaseProperties(),
      flow_stage: 'ride_create',
      seats_bucket: buckets.seats(params.seats),
      is_recurring: params.is_recurring,
      distance_bucket: params.distance_km ? buckets.distance(params.distance_km) : 'unknown',
    };
    
    sendGA4Event(event);
  },

  /**
   * Track ride request by rider.
   */
  rideRequested(params: {
    seats_requested: number;
    has_target_ride: boolean;
  }): void {
    setFlowStage('ride_request');
    
    const event: RideRequestedEvent = {
      event_name: 'ride_requested',
      ...getBaseProperties(),
      flow_stage: 'ride_request',
      seats_requested: params.seats_requested,
      has_target_ride: params.has_target_ride,
    };
    
    sendGA4Event(event);
  },

  /**
   * Track ride acceptance by driver.
   */
  rideAccepted(params: {
    time_to_accept_hours?: number;
    acceptance_rate?: number;
  }): void {
    setFlowStage('ride_accept');
    
    const event: RideAcceptedEvent = {
      event_name: 'ride_accepted',
      ...getBaseProperties(),
      flow_stage: 'ride_accept',
      time_to_accept_bucket: params.time_to_accept_hours 
        ? buckets.timeHours(params.time_to_accept_hours) 
        : 'unknown',
      acceptance_rate_bucket: params.acceptance_rate 
        ? buckets.rate(params.acceptance_rate) 
        : 'unknown',
    };
    
    sendGA4Event(event);
  },

  /**
   * Track message sent in chat.
   */
  messageSent(params: {
    message_context: MessageSentEvent['message_context'];
    is_first_message: boolean;
  }): void {
    setFlowStage('messaging');
    
    const event: MessageSentEvent = {
      event_name: 'message_sent',
      ...getBaseProperties(),
      flow_stage: 'messaging',
      message_context: params.message_context,
      is_first_message: params.is_first_message,
    };
    
    sendGA4Event(event);
  },

  /**
   * Track WhatsApp handoff click.
   */
  whatsappHandoff(params: {
    handoff_context: WhatsappHandoffEvent['handoff_context'];
  }): void {
    setFlowStage('handoff');
    
    const event: WhatsappHandoffEvent = {
      event_name: 'whatsapp_handoff',
      ...getBaseProperties(),
      flow_stage: 'handoff',
      handoff_context: params.handoff_context,
    };
    
    sendGA4Event(event);
  },

  /**
   * Track error state shown to user.
   * 
   * WHY: Error tracking helps identify UX friction points
   * and technical issues affecting users.
   */
  errorStateShown(params: {
    error_type: ErrorStateShownEvent['error_type'];
    error_source: string;
    error_code?: string;
  }): void {
    const event: ErrorStateShownEvent = {
      event_name: 'error_state_shown',
      ...getBaseProperties(),
      error_type: params.error_type,
      error_source: params.error_source,
      error_code: params.error_code,
    };
    
    sendGA4Event(event);
  },
};

// ============================================================================
// FUNNEL & DROP-OFF TRACKING
// ============================================================================

const funnel = {
  /**
   * Track a funnel step.
   * 
   * WHY: Explicit step tracking enables precise funnel analysis
   * to identify where users drop off.
   */
  step(params: {
    funnel_name: string;
    step_name: string;
    step_number: number;
    total_steps: number;
    custom_properties?: Record<string, unknown>;
  }): void {
    const event: FunnelStepEvent = {
      event_name: 'funnel_step',
      ...getBaseProperties(),
      funnel_name: params.funnel_name,
      step_name: params.step_name,
      step_number: params.step_number,
      total_steps: params.total_steps,
      custom_properties: params.custom_properties,
    };
    
    sendGA4Event(event);
  },

  /**
   * Track form abandonment.
   * 
   * WHY: Understanding why forms are abandoned helps improve UX.
   */
  formAbandoned(params: {
    form_name: string;
    fields_filled: string[];
    fields_with_errors: string[];
    time_spent_seconds?: number;
  }): void {
    const event: FormAbandonedEvent = {
      event_name: 'form_abandoned',
      ...getBaseProperties(),
      form_name: params.form_name,
      fields_filled: params.fields_filled,
      fields_with_errors: params.fields_with_errors,
      time_spent_bucket: params.time_spent_seconds 
        ? buckets.timeSeconds(params.time_spent_seconds) 
        : 'unknown',
    };
    
    sendGA4Event(event);
  },

  /**
   * Track empty state shown.
   * 
   * WHY: Empty states often indicate UX issues or user confusion.
   */
  emptyStateShown(params: {
    empty_state_context: string;
    cta_shown?: string;
  }): void {
    const event: EmptyStateShownEvent = {
      event_name: 'empty_state_shown',
      ...getBaseProperties(),
      empty_state_context: params.empty_state_context,
      cta_shown: params.cta_shown,
    };
    
    sendGA4Event(event);
  },
};

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

const performance = {
  /**
   * Track a Web Vital metric.
   */
  webVital(params: {
    metric_name: WebVitalsEvent['metric_name'];
    metric_value: number;
    metric_rating: WebVitalsEvent['metric_rating'];
  }): void {
    const event: WebVitalsEvent = {
      event_name: 'web_vitals',
      ...getBaseProperties(),
      metric_name: params.metric_name,
      metric_value: params.metric_value,
      metric_rating: params.metric_rating,
    };
    
    sendWebVital(event);
  },
};

// ============================================================================
// INTERACTIVE TOOL TRACKING (Future-proofed)
// ============================================================================

const tools = {
  /**
   * Track interactive tool usage.
   * 
   * WHY: Pre-built patterns for future calculators/widgets
   * ensure consistent tracking when they're added.
   */
  interaction(params: {
    tool_name: string;
    interaction_type: ToolInteractionEvent['interaction_type'];
    step_name?: string;
    result_bucket?: string;
  }): void {
    const event: ToolInteractionEvent = {
      event_name: 'tool_interaction',
      ...getBaseProperties(),
      tool_name: params.tool_name,
      interaction_type: params.interaction_type,
      step_name: params.step_name,
      result_bucket: params.result_bucket,
    };
    
    sendGA4Event(event);
  },
};

// ============================================================================
// PAGE VIEW TRACKING
// ============================================================================

/**
 * Track a page view (for SPA navigation).
 */
function pageView(path?: string, title?: string): void {
  const pagePath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  sendPageView(sanitizePagePath(pagePath), title);
}

// ============================================================================
// USER LIFECYCLE
// ============================================================================

/**
 * Call when user signs in.
 */
function identify(userId: string, profile?: {
  total_rides_offered?: number;
  total_rides_taken?: number;
  profile_completion_percentage?: number;
}): void {
  updateUserContext({
    anonymousId: createAnonymousId(userId),
    userRole: determineUserRole(profile),
    isAuthenticated: true,
    profileCompletionBucket: profile?.profile_completion_percentage 
      ? buckets.percentage(profile.profile_completion_percentage)
      : 0,
  });
}

/**
 * Call when user signs out.
 */
function reset(): void {
  updateUserContext({
    anonymousId: createAnonymousId(),
    userRole: 'unknown',
    isAuthenticated: false,
    profileCompletionBucket: 0,
  });
  clearUserProperties();
  currentFlowStage = 'visit';
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

/**
 * Get current analytics state (for debugging).
 */
function getDebugState() {
  return {
    isInitialized,
    userContext,
    currentFlowStage,
    config: getAnalyticsConfig(),
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const analytics = {
  // Initialization
  initialize,
  
  // Event tracking
  track,
  funnel,
  performance,
  tools,
  
  // Page views
  pageView,
  
  // User lifecycle
  identify,
  reset,
  
  // Context management
  setFlowStage,
  updateUserContext,
  
  // Debugging
  getDebugState,
};

// Also export individual functions for tree-shaking if needed
export {
  initialize,
  track,
  funnel,
  performance,
  tools,
  pageView,
  identify,
  reset,
  setFlowStage,
  getDebugState,
};

// Export types
export * from './types';

// Export funnels and drop-off tracking
export * from './funnels';
export { dropOffTracking } from './dropoff';
export {
  startFormTracking,
  trackFieldInteraction,
  trackFieldError,
  clearFieldError,
  markFormSubmitted,
  trackFormAbandonment,
  trackAllFormAbandonments,
  trackValidationError,
  trackValidationErrors,
  trackEmptyState,
  resetEmptyStateTracking,
  trackPermission,
  trackNetworkFailure,
  trackSessionExpired,
  trackAuthRedirect,
  trackDropOff,
} from './dropoff';

// Export experiment framework
export {
  experiments,
  getExperiment,
  trackExperimentConversion,
  isFeatureEnabled,
  getActiveExperiments,
  forceVariant,
  clearExperiments,
  useExperiment,
  useFeatureFlag,
} from './experiments';
export type {
  ExperimentId,
  VariantId,
  ExperimentConfig,
  VariantConfig,
  ExperimentAssignment,
} from './experiments';

// Export web vitals and performance utilities
export {
  webVitals,
  initWebVitals,
  trackTiming,
  startMeasure,
  measureAsync,
  trackSlowResources,
  trackLongTasks,
} from './webVitals';

// Export interactive tool tracking hooks
export {
  toolTracking,
  useCalculatorTracking,
  useWizardTracking,
  useFilterTracking,
  useMapTracking,
  trackToolStart,
  trackToolComplete,
  trackToolShare,
} from './toolTracking';

// Export flow and form tracking hooks
export {
  useFlowStage,
  useSearchTracking,
  useEmptyStateTracking,
} from './hooks';

// Export for browser console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { analytics: typeof analytics }).analytics = analytics;
}
