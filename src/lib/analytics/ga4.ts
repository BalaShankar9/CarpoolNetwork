/**
 * GA4 Integration Module
 * 
 * WHY: Centralized GA4 integration ensures:
 * 1. Single point of configuration
 * 2. Environment-aware tracking
 * 3. Debug mode support
 * 4. Type-safe event sending
 * 
 * PRIVACY: This module NEVER sends PII. All user identifiers are anonymized.
 */

import type { AnalyticsEvent, WebVitalsEvent } from './types';
import { getAnalyticsConfig } from './config';
import { pushToDataLayer, eventToDataLayer } from './dataLayer';

// ============================================================================
// GA4 INITIALIZATION
// ============================================================================

let ga4Initialized = false;

/**
 * Initializes GA4 by loading the gtag.js script.
 * 
 * WHY: We load GA4 dynamically to:
 * 1. Control initialization timing
 * 2. Support SSR/SSG (no script in head)
 * 3. Handle consent before loading
 */
export function initializeGA4(): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled || !config.ga4MeasurementId) {
    if (config.debug) {
      console.log('[Analytics:GA4] Skipping initialization - disabled or no measurement ID');
    }
    return;
  }

  if (ga4Initialized) {
    if (config.debug) {
      console.log('[Analytics:GA4] Already initialized');
    }
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  // Check if gtag already exists (might be loaded by GTM)
  if (!window.gtag) {
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`;
    document.head.appendChild(script);

    // Initialize gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: unknown[]) {
      // gtag pushes arrays of arguments to dataLayer
      window.dataLayer?.push(args as unknown as DataLayerEvent);
    };
    window.gtag('js', new Date());
  }

  // Configure GA4
  window.gtag('config', config.ga4MeasurementId, {
    // Debug mode - enables GA4 debug view
    debug_mode: config.debug,
    // Don't send page views automatically - we handle SPAs ourselves
    send_page_view: false,
    // Custom dimensions for environment tracking
    custom_map: {
      dimension1: 'environment',
      dimension2: 'user_role',
      dimension3: 'device_type',
    },
    // Flag staging data
    ...(config.environment !== 'production' && {
      traffic_type: 'internal',
    }),
  });

  ga4Initialized = true;

  if (config.debug) {
    console.log('[Analytics:GA4] Initialized with measurement ID:', config.ga4MeasurementId);
  }
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Sends an event to GA4.
 * 
 * WHY: Single entry point for all GA4 events ensures:
 * 1. Consistent event format
 * 2. Automatic dataLayer sync for GTM
 * 3. Debug logging
 * 4. Error handling that won't break the app
 */
export function sendGA4Event(event: AnalyticsEvent): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled) {
    return;
  }

  // Debug logging
  if (config.debug) {
    console.group(`[Analytics:GA4] ${event.event_name}`);
    console.log('Payload:', event);
    console.groupEnd();
  }

  // Also push to dataLayer for GTM
  pushToDataLayer(eventToDataLayer(event));

  // Send to GA4 directly
  if (typeof window !== 'undefined' && window.gtag && config.ga4MeasurementId) {
    // Extract event name and properties
    const { event_name, ...properties } = event;
    
    // GA4 gtag event signature: gtag('event', eventName, params)
    window.gtag('event', event_name, {
      ...properties,
      // Add environment flag
      environment: config.environment,
    });
  }
}

// ============================================================================
// PAGE VIEW TRACKING
// ============================================================================

/**
 * Sends a page view event to GA4.
 * 
 * WHY: SPAs need manual page view tracking since the browser doesn't
 * actually navigate. We track route changes as page views.
 */
export function sendPageView(pagePath: string, pageTitle?: string): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled) {
    return;
  }

  if (config.debug) {
    console.log('[Analytics:GA4] Page view:', pagePath);
  }

  // Push to dataLayer for GTM
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  });

  // Send to GA4
  if (typeof window !== 'undefined' && window.gtag && config.ga4MeasurementId) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: window.location.href,
    });
  }
}

// ============================================================================
// USER IDENTIFICATION (ANONYMIZED)
// ============================================================================

/**
 * Sets user properties in GA4.
 * 
 * WHY: User properties help segment analytics without tracking PII.
 * We only set anonymized, non-identifying properties.
 */
export function setUserProperties(properties: {
  anonymousId?: string;
  userRole?: string;
  deviceType?: string;
  isAuthenticated?: boolean;
  profileCompletionBucket?: number;
}): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled) {
    return;
  }

  if (config.debug) {
    console.log('[Analytics:GA4] Setting user properties:', properties);
  }

  // Push to dataLayer
  pushToDataLayer({
    event: 'user_properties_set',
    user_id: properties.anonymousId, // Anonymized
    user_role: properties.userRole,
    device_type: properties.deviceType,
    is_authenticated: properties.isAuthenticated,
    profile_completion_bucket: properties.profileCompletionBucket,
  });

  // Set in GA4
  if (typeof window !== 'undefined' && window.gtag && config.ga4MeasurementId) {
    // Set user ID (anonymized)
    if (properties.anonymousId) {
      window.gtag('config', config.ga4MeasurementId, {
        user_id: properties.anonymousId,
      });
    }

    // Set user properties
    window.gtag('set', 'user_properties', {
      user_role: properties.userRole,
      device_type: properties.deviceType,
      is_authenticated: properties.isAuthenticated,
      profile_completion_bucket: properties.profileCompletionBucket,
    });
  }
}

// ============================================================================
// WEB VITALS INTEGRATION
// ============================================================================

/**
 * Sends a Web Vital metric to GA4.
 * 
 * WHY: Performance metrics help identify UX issues.
 * We send them as events to correlate with user behavior.
 */
export function sendWebVital(event: WebVitalsEvent): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled) {
    return;
  }

  if (config.debug) {
    console.log('[Analytics:GA4] Web Vital:', event.metric_name, event.metric_value, event.metric_rating);
  }

  // Send to GA4 with specific parameter names
  if (typeof window !== 'undefined' && window.gtag && config.ga4MeasurementId) {
    window.gtag('event', event.metric_name, {
      value: Math.round(event.metric_name === 'CLS' ? event.metric_value * 1000 : event.metric_value),
      metric_rating: event.metric_rating,
      metric_value: event.metric_value,
      // Non-interaction event - doesn't affect bounce rate
      non_interaction: true,
    });
  }

  // Also send as custom event for easier reporting
  sendGA4Event(event);
}

// ============================================================================
// CONVERSION TRACKING
// ============================================================================

/**
 * Marks an event as a conversion.
 * 
 * WHY: Conversions need special handling in GA4 for goal tracking.
 * We only mark conversions in production to avoid polluting data.
 */
export function markConversion(eventName: string): void {
  const config = getAnalyticsConfig();
  
  // Only mark conversions in production
  if (config.environment !== 'production') {
    if (config.debug) {
      console.log('[Analytics:GA4] Skipping conversion marking in non-production:', eventName);
    }
    return;
  }

  if (config.debug) {
    console.log('[Analytics:GA4] Marking conversion:', eventName);
  }

  // GA4 conversions are configured in the GA4 interface, not in code
  // But we can send a specific event for conversion tracking
  if (typeof window !== 'undefined' && window.gtag && config.ga4MeasurementId) {
    window.gtag('event', 'conversion', {
      event_category: 'conversion',
      event_label: eventName,
    });
  }
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

/**
 * Validates GA4 is working by sending a test event.
 * Use this in browser console for debugging.
 */
export function testGA4Connection(): void {
  const config = getAnalyticsConfig();
  
  console.group('[Analytics:GA4] Connection Test');
  console.log('Config:', config);
  console.log('gtag available:', typeof window !== 'undefined' && !!window.gtag);
  console.log('dataLayer length:', typeof window !== 'undefined' ? window.dataLayer?.length : 0);

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'analytics_test', {
      test_timestamp: new Date().toISOString(),
    });
    console.log('Test event sent. Check GA4 DebugView to verify.');
  } else {
    console.log('gtag not available. GA4 may not be initialized.');
  }

  console.groupEnd();
}

// Export for browser console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { testGA4Connection: typeof testGA4Connection }).testGA4Connection = testGA4Connection;
}
