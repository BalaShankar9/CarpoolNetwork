/**
 * Drop-off Tracking
 * 
 * Instruments key friction points where users abandon flows.
 * Provides utilities for tracking form abandonment, error states,
 * empty states, and permission issues.
 */

import { analytics } from './index';
import type { FunnelId } from './funnels';
import { getCurrentFunnelStep } from './funnels';

// ============================================================================
// Drop-off Categories
// ============================================================================

export type DropOffCategory =
  | 'form_validation'
  | 'form_abandonment'
  | 'empty_state'
  | 'error_state'
  | 'permission_denied'
  | 'network_failure'
  | 'timeout'
  | 'user_cancelled'
  | 'external_redirect'
  | 'session_expired';

export interface DropOffEvent {
  category: DropOffCategory;
  context: string;
  funnel?: FunnelId;
  step?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Form Tracking
// ============================================================================

interface FormTrackingState {
  formName: string;
  startTime: number;
  fieldsInteracted: Set<string>;
  fieldsWithErrors: Set<string>;
  lastFieldFocused: string | null;
  submitted: boolean;
}

const activeFormsMap = new Map<string, FormTrackingState>();

/**
 * Start tracking a form for abandonment
 */
export function startFormTracking(formName: string): void {
  activeFormsMap.set(formName, {
    formName,
    startTime: Date.now(),
    fieldsInteracted: new Set(),
    fieldsWithErrors: new Set(),
    lastFieldFocused: null,
    submitted: false,
  });
}

/**
 * Track field interaction
 */
export function trackFieldInteraction(formName: string, fieldName: string): void {
  const state = activeFormsMap.get(formName);
  if (state) {
    state.fieldsInteracted.add(fieldName);
    state.lastFieldFocused = fieldName;
  }
}

/**
 * Track field validation error
 */
export function trackFieldError(formName: string, fieldName: string): void {
  const state = activeFormsMap.get(formName);
  if (state) {
    state.fieldsWithErrors.add(fieldName);
  }
}

/**
 * Clear field error (when user fixes it)
 */
export function clearFieldError(formName: string, fieldName: string): void {
  const state = activeFormsMap.get(formName);
  if (state) {
    state.fieldsWithErrors.delete(fieldName);
  }
}

/**
 * Mark form as submitted (no abandonment tracking)
 */
export function markFormSubmitted(formName: string): void {
  const state = activeFormsMap.get(formName);
  if (state) {
    state.submitted = true;
    activeFormsMap.delete(formName);
  }
}

/**
 * Track form abandonment
 */
export function trackFormAbandonment(formName: string): void {
  const state = activeFormsMap.get(formName);
  if (!state || state.submitted) return;

  const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

  analytics.funnel.formAbandoned({
    form_name: formName,
    fields_filled: Array.from(state.fieldsInteracted),
    fields_with_errors: Array.from(state.fieldsWithErrors),
    time_spent_seconds: timeSpent,
  });

  activeFormsMap.delete(formName);
}

/**
 * Cleanup: track abandonment for all active forms
 * Call this on page unload or navigation
 */
export function trackAllFormAbandonments(): void {
  for (const [formName, state] of activeFormsMap) {
    if (!state.submitted && state.fieldsInteracted.size > 0) {
      trackFormAbandonment(formName);
    }
  }
  activeFormsMap.clear();
}

// ============================================================================
// Validation Error Tracking
// ============================================================================

interface ValidationErrorContext {
  formName: string;
  fieldName: string;
  errorType: 'required' | 'format' | 'range' | 'custom';
  errorMessage?: string;
}

/**
 * Track form validation errors (important for CRO)
 */
export function trackValidationError(context: ValidationErrorContext): void {
  analytics.track.errorStateShown({
    error_type: 'validation',
    error_source: `${context.formName}/${context.fieldName}`,
    error_code: context.errorType,
  });
}

/**
 * Track multiple validation errors at once
 */
export function trackValidationErrors(
  formName: string,
  errors: Record<string, string>
): void {
  const errorCount = Object.keys(errors).length;
  
  // Track summary event
  analytics.funnel.step({
    funnel_name: 'form_validation',
    step_name: 'validation_failed',
    step_number: 1,
    total_steps: 1,
    custom_properties: {
      form_name: formName,
      error_count: errorCount,
      error_fields: Object.keys(errors),
    },
  });

  // Track individual errors (limit to first 5 to avoid event spam)
  Object.entries(errors).slice(0, 5).forEach(([fieldName, message]) => {
    trackFieldError(formName, fieldName);
  });
}

// ============================================================================
// Empty State Tracking
// ============================================================================

interface EmptyStateContext {
  location: string;
  reason: 'no_data' | 'filtered_out' | 'search_no_results' | 'no_permissions';
  searchQuery?: string;
  filters?: Record<string, unknown>;
  ctaShown?: string;
}

const trackedEmptyStates = new Set<string>();

/**
 * Track empty state (only once per session per location)
 */
export function trackEmptyState(context: EmptyStateContext): void {
  const key = `${context.location}:${context.reason}`;
  if (trackedEmptyStates.has(key)) return;

  trackedEmptyStates.add(key);

  analytics.funnel.emptyStateShown({
    empty_state_context: context.location,
    cta_shown: context.ctaShown,
  });
}

/**
 * Reset empty state tracking (call on significant navigation)
 */
export function resetEmptyStateTracking(): void {
  trackedEmptyStates.clear();
}

// ============================================================================
// Permission Tracking
// ============================================================================

type PermissionType = 'location' | 'notifications' | 'camera' | 'microphone' | 'contacts';

interface PermissionEvent {
  permission: PermissionType;
  action: 'requested' | 'granted' | 'denied' | 'dismissed';
  context: string;
}

/**
 * Track permission request outcomes
 */
export function trackPermission(event: PermissionEvent): void {
  if (event.action === 'denied' || event.action === 'dismissed') {
    analytics.track.errorStateShown({
      error_type: 'permission',
      error_source: event.context,
      error_code: `${event.permission}_${event.action}`,
    });
  }

  // Also track as funnel event for analysis
  analytics.funnel.step({
    funnel_name: 'permission_flow',
    step_name: `${event.permission}_${event.action}`,
    step_number: event.action === 'requested' ? 1 : 2,
    total_steps: 2,
    custom_properties: {
      permission_type: event.permission,
      context: event.context,
    },
  });
}

// ============================================================================
// Network Failure Tracking
// ============================================================================

interface NetworkFailureContext {
  operation: string;
  endpoint?: string;
  statusCode?: number;
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Track network failures (API errors, timeouts)
 */
export function trackNetworkFailure(context: NetworkFailureContext): void {
  const errorCode = context.statusCode 
    ? `HTTP_${context.statusCode}` 
    : 'NETWORK_ERROR';

  analytics.track.errorStateShown({
    error_type: 'network',
    error_source: context.operation,
    error_code: errorCode,
  });

  // Track retry attempts separately
  if (context.retryCount && context.retryCount > 0) {
    analytics.funnel.step({
      funnel_name: 'error_recovery',
      step_name: 'retry_attempted',
      step_number: context.retryCount,
      total_steps: 3, // Max retries typically
      custom_properties: {
        operation: context.operation,
        endpoint: context.endpoint,
      },
    });
  }
}

// ============================================================================
// Session & Auth Tracking
// ============================================================================

/**
 * Track session expiration
 */
export function trackSessionExpired(context: string): void {
  analytics.track.errorStateShown({
    error_type: 'auth',
    error_source: context,
    error_code: 'SESSION_EXPIRED',
  });
}

/**
 * Track auth redirect (when user is sent to login)
 */
export function trackAuthRedirect(intendedDestination: string): void {
  analytics.funnel.step({
    funnel_name: 'auth_interrupt',
    step_name: 'redirect_to_login',
    step_number: 1,
    total_steps: 2,
    custom_properties: {
      intended_destination: intendedDestination,
    },
  });
}

// ============================================================================
// Drop-off Summary
// ============================================================================

/**
 * Track a generic drop-off event
 */
export function trackDropOff(event: DropOffEvent): void {
  const currentStep = event.funnel && event.step
    ? getCurrentFunnelStep(event.funnel, event.step)
    : null;

  analytics.funnel.step({
    funnel_name: event.funnel || 'general',
    step_name: `dropoff_${event.category}`,
    step_number: currentStep?.position || 0,
    total_steps: 0, // Indicates drop-off, not completion
    custom_properties: {
      category: event.category,
      context: event.context,
      ...(event.details || {}),
    },
  });
}

// ============================================================================
// Exports for Hooks Integration
// ============================================================================

export const dropOffTracking = {
  // Form tracking
  startFormTracking,
  trackFieldInteraction,
  trackFieldError,
  clearFieldError,
  markFormSubmitted,
  trackFormAbandonment,
  trackAllFormAbandonments,

  // Validation
  trackValidationError,
  trackValidationErrors,

  // Empty states
  trackEmptyState,
  resetEmptyStateTracking,

  // Permissions
  trackPermission,

  // Network
  trackNetworkFailure,

  // Auth/Session
  trackSessionExpired,
  trackAuthRedirect,

  // Generic
  trackDropOff,
};
