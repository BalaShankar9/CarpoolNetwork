/**
 * Analytics Type Definitions
 * 
 * WHY: Centralized type definitions ensure type safety across all analytics code
 * and provide clear documentation of the event schema for developers.
 * 
 * PRIVACY: All types are designed to exclude PII. User identifiers are anonymous.
 */

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================

export type AnalyticsEnvironment = 'production' | 'staging' | 'development';

export interface AnalyticsConfig {
  /** GA4 Measurement ID (G-XXXXXXXXXX) */
  ga4MeasurementId: string;
  /** GTM Container ID (GTM-XXXXXXX) - optional */
  gtmContainerId?: string;
  /** Current environment */
  environment: AnalyticsEnvironment;
  /** Enable debug mode (logs events to console) */
  debug: boolean;
  /** Disable all tracking (useful for testing) */
  disabled: boolean;
}

// ============================================================================
// USER CONTEXT (NON-PII)
// ============================================================================

export type UserRole = 'driver' | 'rider' | 'both' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface UserContext {
  /** Anonymous user identifier (hashed) - NEVER use email/phone/name */
  anonymousId: string;
  /** User role in the platform */
  userRole: UserRole;
  /** Device type */
  deviceType: DeviceType;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Profile completion percentage (bucketed: 0, 25, 50, 75, 100) */
  profileCompletionBucket: number;
}

// ============================================================================
// EVENT SCHEMA
// ============================================================================

/**
 * Flow stages represent where the user is in their journey.
 * Used for funnel analysis and drop-off tracking.
 */
export type FlowStage = 
  | 'visit'
  | 'signup_started'
  | 'signup_complete'
  | 'profile_started'
  | 'profile_complete'
  | 'ride_search'
  | 'ride_create'
  | 'ride_request'
  | 'ride_accept'
  | 'messaging'
  | 'handoff'
  | 'conversion';

/**
 * Base properties included with every event.
 * These provide consistent context for all analytics.
 */
export interface BaseEventProperties {
  /** Current page path (e.g., /find-rides) */
  page_path: string;
  /** Current flow stage */
  flow_stage: FlowStage;
  /** User role */
  user_role: UserRole;
  /** Device type */
  device_type: DeviceType;
  /** Environment */
  environment: AnalyticsEnvironment;
  /** Timestamp in ISO format */
  timestamp: string;
  /** Session ID (anonymous, generated per session) */
  session_id: string;
}

// ============================================================================
// CORE EVENTS - These are the minimum required events
// ============================================================================

export interface SignUpCompleteEvent extends BaseEventProperties {
  event_name: 'sign_up_complete';
  /** Sign up method used */
  signup_method: 'email' | 'google' | 'facebook' | 'github' | 'otp';
}

export interface ProfileCompletedEvent extends BaseEventProperties {
  event_name: 'profile_completed';
  /** Which fields were completed */
  fields_completed: string[];
  /** Time to complete in seconds (bucketed) */
  time_to_complete_bucket: string;
}

export interface RideCreatedEvent extends BaseEventProperties {
  event_name: 'ride_created';
  /** Number of seats offered (bucketed: 1-2, 3-4, 5+) */
  seats_bucket: string;
  /** Is this a recurring ride */
  is_recurring: boolean;
  /** Distance bucket in km */
  distance_bucket: string;
}

export interface RideRequestedEvent extends BaseEventProperties {
  event_name: 'ride_requested';
  /** Number of seats requested */
  seats_requested: number;
  /** Was there a specific ride targeted */
  has_target_ride: boolean;
}

export interface RideAcceptedEvent extends BaseEventProperties {
  event_name: 'ride_accepted';
  /** Time to accept in hours (bucketed) */
  time_to_accept_bucket: string;
  /** Acceptance rate bucket of driver */
  acceptance_rate_bucket: string;
}

export interface MessageSentEvent extends BaseEventProperties {
  event_name: 'message_sent';
  /** Message context */
  message_context: 'ride_inquiry' | 'booking_chat' | 'general';
  /** Is this the first message in conversation */
  is_first_message: boolean;
}

export interface WhatsappHandoffEvent extends BaseEventProperties {
  event_name: 'whatsapp_handoff';
  /** Context of handoff */
  handoff_context: 'ride_details' | 'booking_confirmed' | 'profile';
}

export interface ErrorStateShownEvent extends BaseEventProperties {
  event_name: 'error_state_shown';
  /** Error type category */
  error_type: 'auth' | 'network' | 'validation' | 'permission' | 'not_found' | 'server' | 'unknown';
  /** Error code if available */
  error_code?: string;
  /** Component that showed the error */
  error_source: string;
}

// ============================================================================
// FUNNEL & DROP-OFF EVENTS
// ============================================================================

export interface FunnelStepEvent extends BaseEventProperties {
  event_name: 'funnel_step';
  /** Funnel name */
  funnel_name: string;
  /** Step name */
  step_name: string;
  /** Step number */
  step_number: number;
  /** Total steps in funnel */
  total_steps: number;
  /** Additional custom properties for CRO analysis */
  custom_properties?: Record<string, unknown>;
}

export interface FormAbandonedEvent extends BaseEventProperties {
  event_name: 'form_abandoned';
  /** Form name */
  form_name: string;
  /** Fields that were filled */
  fields_filled: string[];
  /** Fields that had errors */
  fields_with_errors: string[];
  /** Time spent on form (bucketed) */
  time_spent_bucket: string;
}

export interface EmptyStateShownEvent extends BaseEventProperties {
  event_name: 'empty_state_shown';
  /** Empty state context */
  empty_state_context: string;
  /** CTA shown */
  cta_shown?: string;
}

// ============================================================================
// PERFORMANCE EVENTS
// ============================================================================

export interface WebVitalsEvent extends BaseEventProperties {
  event_name: 'web_vitals';
  /** Metric name */
  metric_name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
  /** Metric value */
  metric_value: number;
  /** Rating based on thresholds */
  metric_rating: 'good' | 'needs-improvement' | 'poor';
}

// ============================================================================
// INTERACTIVE TOOL EVENTS (Future-proofed)
// ============================================================================

export interface ToolInteractionEvent extends BaseEventProperties {
  event_name: 'tool_interaction';
  /** Tool name */
  tool_name: string;
  /** Interaction type */
  interaction_type: 'start' | 'step' | 'complete' | 'abandon' | 'tool_started' | 'step_changed' | 'result_calculated' | 'result_shared';
  /** Step name if applicable */
  step_name?: string;
  /** Result value (bucketed) */
  result_bucket?: string;
}

// ============================================================================
// UNION TYPE FOR ALL EVENTS
// ============================================================================

export type AnalyticsEvent = 
  | SignUpCompleteEvent
  | ProfileCompletedEvent
  | RideCreatedEvent
  | RideRequestedEvent
  | RideAcceptedEvent
  | MessageSentEvent
  | WhatsappHandoffEvent
  | ErrorStateShownEvent
  | FunnelStepEvent
  | FormAbandonedEvent
  | EmptyStateShownEvent
  | WebVitalsEvent
  | ToolInteractionEvent;

// ============================================================================
// DATALAYER TYPES (GTM)
// ============================================================================

export interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

// Extend Window interface for GTM dataLayer
declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    gtag?: (...args: unknown[]) => void;
  }
}
