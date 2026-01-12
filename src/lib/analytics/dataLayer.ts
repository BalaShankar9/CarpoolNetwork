/**
 * DataLayer Abstraction for GTM
 * 
 * WHY: This module provides a clean abstraction over GTM's dataLayer.
 * App logic should NEVER depend on GTM directly - this layer ensures:
 * 1. Graceful fallback if GTM is disabled
 * 2. Consistent event structure
 * 3. Easy debugging
 * 4. Type safety
 */

import type { DataLayerEvent, AnalyticsEvent } from './types';
import { getAnalyticsConfig } from './config';

// ============================================================================
// DATALAYER INITIALIZATION
// ============================================================================

/**
 * Ensures the dataLayer array exists on window.
 * 
 * WHY: GTM expects window.dataLayer to exist. If GTM script hasn't loaded yet,
 * we need to create it so events aren't lost.
 */
function ensureDataLayer(): DataLayerEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

// ============================================================================
// DATALAYER PUSH
// ============================================================================

/**
 * Pushes an event to the GTM dataLayer.
 * 
 * WHY: Single point of entry for all dataLayer pushes ensures:
 * 1. Consistent structure
 * 2. Debug logging
 * 3. Error handling
 * 4. Graceful degradation
 */
export function pushToDataLayer(event: DataLayerEvent): void {
  const config = getAnalyticsConfig();
  
  if (config.disabled) {
    return;
  }

  // Debug logging
  if (config.debug) {
    console.group(`[Analytics:DataLayer] ${event.event}`);
    console.log('Payload:', event);
    console.groupEnd();
  }

  // Only push if we're in browser
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const dataLayer = ensureDataLayer();
    dataLayer.push(event);
  } catch (error) {
    // Log but don't throw - analytics should never break the app
    console.warn('[Analytics:DataLayer] Failed to push event:', error);
  }
}

// ============================================================================
// CONVERSION TO DATALAYER FORMAT
// ============================================================================

/**
 * Converts an analytics event to dataLayer format.
 * 
 * WHY: Our event schema is more structured than GTM's flat format.
 * This function flattens our events while maintaining all properties.
 */
export function eventToDataLayer(event: AnalyticsEvent): DataLayerEvent {
  // Start with the event name
  const dataLayerEvent: DataLayerEvent = {
    event: event.event_name,
  };

  // Add all properties, prefixed to avoid conflicts
  for (const [key, value] of Object.entries(event)) {
    if (key === 'event_name') continue;
    dataLayerEvent[`analytics_${key}`] = value;
  }

  return dataLayerEvent;
}

// ============================================================================
// SPECIALIZED DATALAYER PUSHES
// ============================================================================

/**
 * Pushes a page view event to dataLayer.
 * 
 * WHY: Page views need special handling in SPAs since the page
 * doesn't actually reload.
 */
export function pushPageView(pagePath: string, pageTitle?: string): void {
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Pushes user properties to dataLayer.
 * 
 * WHY: User properties like role and device type should be available
 * for all events. Pushing them separately ensures they're set once
 * and inherited by subsequent events.
 */
export function pushUserProperties(properties: {
  user_role?: string;
  device_type?: string;
  is_authenticated?: boolean;
  profile_completion_bucket?: number;
  environment?: string;
}): void {
  pushToDataLayer({
    event: 'user_properties_set',
    ...properties,
  });
}

/**
 * Clears dataLayer state (useful on logout).
 * 
 * WHY: When a user logs out, we need to clear any user-specific
 * properties to ensure clean state for the next user.
 */
export function clearUserProperties(): void {
  pushToDataLayer({
    event: 'user_properties_clear',
    user_role: undefined,
    is_authenticated: false,
    profile_completion_bucket: undefined,
  });
}

// ============================================================================
// GTM SCRIPT LOADING
// ============================================================================

/**
 * Dynamically loads the GTM script.
 * 
 * WHY: Loading GTM dynamically allows us to:
 * 1. Control when it loads
 * 2. Only load in production if desired
 * 3. Handle consent management before loading
 */
export function loadGTMScript(containerId: string): void {
  if (typeof window === 'undefined' || !containerId) {
    return;
  }

  // Check if already loaded
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${containerId}"]`)) {
    return;
  }

  // Initialize dataLayer before GTM loads
  ensureDataLayer();
  pushToDataLayer({
    event: 'gtm.js',
    'gtm.start': new Date().getTime(),
  });

  // Create and insert script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  
  // Add noscript fallback is handled in index.html
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);

  const config = getAnalyticsConfig();
  if (config.debug) {
    console.log('[Analytics:GTM] Loaded GTM script with container:', containerId);
  }
}

// ============================================================================
// DATALAYER DEBUGGING
// ============================================================================

/**
 * Gets all events currently in the dataLayer.
 * Useful for debugging.
 */
export function getDataLayerEvents(): DataLayerEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }
  return [...(window.dataLayer || [])];
}

/**
 * Enables verbose dataLayer logging.
 * Call this in browser console for debugging.
 */
export function enableDataLayerDebug(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Proxy the dataLayer push method to log all events
  const originalDataLayer = window.dataLayer || [];
  window.dataLayer = new Proxy(originalDataLayer, {
    get(target, prop) {
      if (prop === 'push') {
        return (...args: unknown[]) => {
          console.log('[DataLayer Push]', ...args);
          return Array.prototype.push.apply(target, args as DataLayerEvent[]);
        };
      }
      return Reflect.get(target, prop);
    },
  });

  console.log('[Analytics:DataLayer] Debug mode enabled. All dataLayer pushes will be logged.');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { enableDataLayerDebug: typeof enableDataLayerDebug }).enableDataLayerDebug = enableDataLayerDebug;
}
