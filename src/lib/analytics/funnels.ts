/**
 * Funnel Definitions
 * 
 * Core user journeys with step definitions and expected drop-off points.
 * These funnels are used for cohort analysis, CRO optimization, and
 * identifying friction points in the user experience.
 */

import type { FlowStage } from './types';

// ============================================================================
// Funnel Types
// ============================================================================

export interface FunnelStep {
  /** Step identifier (used in event tracking) */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Step position in the funnel (1-indexed) */
  position: number;
  /** Routes associated with this step */
  routes: string[];
  /** Expected events that indicate step completion */
  completionEvents: string[];
  /** Common drop-off reasons for this step */
  dropOffReasons: string[];
  /** Corresponding flow stage */
  flowStage: FlowStage;
}

export interface FunnelDefinition {
  /** Funnel identifier */
  id: string;
  /** Human-readable funnel name */
  name: string;
  /** Funnel description */
  description: string;
  /** Ordered list of steps */
  steps: FunnelStep[];
  /** Target conversion rate (for benchmarking) */
  targetConversionRate?: number;
}

// ============================================================================
// Core Funnels
// ============================================================================

/**
 * Onboarding Funnel
 * Tracks new users from first visit through profile completion.
 */
export const ONBOARDING_FUNNEL: FunnelDefinition = {
  id: 'onboarding',
  name: 'User Onboarding',
  description: 'New user journey from landing to profile completion',
  targetConversionRate: 0.35, // 35% of visitors who start signup should complete profile
  steps: [
    {
      id: 'landing',
      name: 'Landing Page Visit',
      position: 1,
      routes: ['/', '/home', '/welcome'],
      completionEvents: ['page_view'],
      dropOffReasons: ['bounce', 'unclear_value_prop', 'slow_load'],
      flowStage: 'visit',
    },
    {
      id: 'signup_start',
      name: 'Signup Started',
      position: 2,
      routes: ['/signup', '/auth/signup', '/register'],
      completionEvents: ['signup_form_started'],
      dropOffReasons: ['form_too_long', 'social_auth_failure', 'email_issues'],
      flowStage: 'signup_started',
    },
    {
      id: 'signup_complete',
      name: 'Signup Complete',
      position: 3,
      routes: ['/verify-email', '/email-verification'],
      completionEvents: ['sign_up_complete'],
      dropOffReasons: ['verification_email_not_received', 'abandoned_verification'],
      flowStage: 'signup_complete',
    },
    {
      id: 'profile_start',
      name: 'Profile Started',
      position: 4,
      routes: ['/profile', '/profile/edit', '/onboarding'],
      completionEvents: ['profile_form_started'],
      dropOffReasons: ['too_many_fields', 'photo_upload_issues', 'unclear_requirements'],
      flowStage: 'profile_started',
    },
    {
      id: 'profile_complete',
      name: 'Profile Complete',
      position: 5,
      routes: ['/profile', '/dashboard'],
      completionEvents: ['profile_completed'],
      dropOffReasons: ['required_fields_unclear', 'verification_pending'],
      flowStage: 'profile_complete',
    },
  ],
};

/**
 * Driver Funnel
 * Tracks drivers from profile completion through ride posting and booking acceptance.
 */
export const DRIVER_FUNNEL: FunnelDefinition = {
  id: 'driver_journey',
  name: 'Driver Journey',
  description: 'Driver path from profile to accepting their first booking',
  targetConversionRate: 0.25, // 25% of completed profiles should post rides
  steps: [
    {
      id: 'profile_complete',
      name: 'Profile Complete',
      position: 1,
      routes: ['/profile', '/dashboard'],
      completionEvents: ['profile_completed'],
      dropOffReasons: [],
      flowStage: 'profile_complete',
    },
    {
      id: 'ride_create_start',
      name: 'Started Creating Ride',
      position: 2,
      routes: ['/post-ride', '/rides/new', '/create-ride'],
      completionEvents: ['ride_form_started'],
      dropOffReasons: ['unclear_form', 'location_selection_difficult', 'pricing_confusion'],
      flowStage: 'ride_create',
    },
    {
      id: 'ride_created',
      name: 'Ride Posted',
      position: 3,
      routes: ['/my-rides', '/rides/:id'],
      completionEvents: ['ride_created'],
      dropOffReasons: ['form_validation_errors', 'map_issues', 'time_picker_confusion'],
      flowStage: 'ride_create',
    },
    {
      id: 'booking_received',
      name: 'Booking Request Received',
      position: 4,
      routes: ['/bookings', '/my-rides'],
      completionEvents: ['booking_request_received'],
      dropOffReasons: ['no_requests', 'notification_missed'],
      flowStage: 'ride_accept',
    },
    {
      id: 'booking_accepted',
      name: 'Booking Accepted',
      position: 5,
      routes: ['/bookings/:id'],
      completionEvents: ['ride_accepted'],
      dropOffReasons: ['passenger_profile_concerns', 'schedule_changed', 'communication_issues'],
      flowStage: 'ride_accept',
    },
    {
      id: 'message_sent',
      name: 'Message Sent',
      position: 6,
      routes: ['/messages', '/chat/:id'],
      completionEvents: ['message_sent'],
      dropOffReasons: ['chat_not_found', 'message_delivery_failure'],
      flowStage: 'messaging',
    },
    {
      id: 'handoff',
      name: 'WhatsApp Handoff',
      position: 7,
      routes: ['/bookings/:id', '/chat/:id'],
      completionEvents: ['whatsapp_handoff'],
      dropOffReasons: ['phone_not_available', 'prefer_in_app'],
      flowStage: 'handoff',
    },
  ],
};

/**
 * Rider Funnel
 * Tracks riders from profile completion through booking request and messaging.
 */
export const RIDER_FUNNEL: FunnelDefinition = {
  id: 'rider_journey',
  name: 'Rider Journey',
  description: 'Rider path from profile to requesting their first ride',
  targetConversionRate: 0.40, // 40% of completed profiles should search for rides
  steps: [
    {
      id: 'profile_complete',
      name: 'Profile Complete',
      position: 1,
      routes: ['/profile', '/dashboard'],
      completionEvents: ['profile_completed'],
      dropOffReasons: [],
      flowStage: 'profile_complete',
    },
    {
      id: 'ride_search',
      name: 'Searched for Rides',
      position: 2,
      routes: ['/search', '/find-ride', '/rides'],
      completionEvents: ['ride_search_performed'],
      dropOffReasons: ['no_search_filters', 'location_detection_failed'],
      flowStage: 'ride_search',
    },
    {
      id: 'ride_viewed',
      name: 'Viewed Ride Details',
      position: 3,
      routes: ['/rides/:id'],
      completionEvents: ['ride_details_viewed'],
      dropOffReasons: ['no_results', 'results_not_relevant', 'poor_timing'],
      flowStage: 'ride_search',
    },
    {
      id: 'ride_requested',
      name: 'Ride Requested',
      position: 4,
      routes: ['/rides/:id', '/book/:id'],
      completionEvents: ['ride_requested'],
      dropOffReasons: ['no_seats_available', 'driver_profile_concerns', 'price_too_high'],
      flowStage: 'ride_request',
    },
    {
      id: 'booking_confirmed',
      name: 'Booking Confirmed',
      position: 5,
      routes: ['/bookings/:id'],
      completionEvents: ['booking_confirmed'],
      dropOffReasons: ['driver_declined', 'driver_no_response', 'rider_cancelled'],
      flowStage: 'ride_request',
    },
    {
      id: 'message_sent',
      name: 'Message Sent',
      position: 6,
      routes: ['/messages', '/chat/:id'],
      completionEvents: ['message_sent'],
      dropOffReasons: ['chat_not_found', 'message_delivery_failure'],
      flowStage: 'messaging',
    },
    {
      id: 'handoff',
      name: 'WhatsApp Handoff',
      position: 7,
      routes: ['/bookings/:id', '/chat/:id'],
      completionEvents: ['whatsapp_handoff'],
      dropOffReasons: ['phone_not_available', 'prefer_in_app'],
      flowStage: 'handoff',
    },
  ],
};

// ============================================================================
// Funnel Registry
// ============================================================================

export const FUNNELS = {
  onboarding: ONBOARDING_FUNNEL,
  driver: DRIVER_FUNNEL,
  rider: RIDER_FUNNEL,
} as const;

export type FunnelId = keyof typeof FUNNELS;

// ============================================================================
// Funnel Utilities
// ============================================================================

/**
 * Get the current funnel step based on route and user role
 */
export function getCurrentFunnelStep(
  funnelId: FunnelId,
  currentRoute: string
): FunnelStep | null {
  const funnel = FUNNELS[funnelId];
  if (!funnel) return null;

  // Normalize route (remove query params, trailing slashes)
  const normalizedRoute = currentRoute.split('?')[0].replace(/\/$/, '');

  // Find step by matching routes (handles :id params)
  for (const step of funnel.steps) {
    for (const route of step.routes) {
      const routeRegex = new RegExp(
        '^' + route.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '$'
      );
      if (routeRegex.test(normalizedRoute)) {
        return step;
      }
    }
  }

  return null;
}

/**
 * Get all steps before the current step (for tracking drop-off)
 */
export function getPreviousSteps(
  funnelId: FunnelId,
  currentStepId: string
): FunnelStep[] {
  const funnel = FUNNELS[funnelId];
  if (!funnel) return [];

  const currentStepIndex = funnel.steps.findIndex(s => s.id === currentStepId);
  if (currentStepIndex === -1) return [];

  return funnel.steps.slice(0, currentStepIndex);
}

/**
 * Get the next step in the funnel
 */
export function getNextStep(
  funnelId: FunnelId,
  currentStepId: string
): FunnelStep | null {
  const funnel = FUNNELS[funnelId];
  if (!funnel) return null;

  const currentStepIndex = funnel.steps.findIndex(s => s.id === currentStepId);
  if (currentStepIndex === -1 || currentStepIndex === funnel.steps.length - 1) {
    return null;
  }

  return funnel.steps[currentStepIndex + 1];
}

/**
 * Calculate funnel progress as a percentage
 */
export function getFunnelProgress(
  funnelId: FunnelId,
  currentStepId: string
): number {
  const funnel = FUNNELS[funnelId];
  if (!funnel) return 0;

  const currentStep = funnel.steps.find(s => s.id === currentStepId);
  if (!currentStep) return 0;

  return Math.round((currentStep.position / funnel.steps.length) * 100);
}
