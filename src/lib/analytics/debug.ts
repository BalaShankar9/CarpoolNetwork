/**
 * Analytics Debug Utilities
 * 
 * Console commands and utilities for debugging analytics in development.
 * These are automatically available in the browser console when analytics
 * is initialized.
 * 
 * WHY: Making debugging easy ensures issues are caught early
 * and developers can verify their tracking implementations.
 */

import { analytics } from './index';
import { getAnalyticsConfig } from './config';

// ============================================================================
// Debug Functions (exposed to window in development)
// ============================================================================

/**
 * Test GA4 connection by sending a test event
 */
export function testGA4Connection(): void {
  console.log('[Analytics Debug] Sending test event...');
  
  analytics.funnel.step({
    funnel_name: 'debug',
    step_name: 'test_event',
    step_number: 1,
    total_steps: 1,
  });
  
  console.log('[Analytics Debug] Test event sent. Check GA4 DebugView.');
}

/**
 * Enable verbose dataLayer logging
 */
export function enableDataLayerDebug(): void {
  if (typeof window === 'undefined') return;

  const originalPush = window.dataLayer?.push;
  if (!originalPush) {
    console.warn('[Analytics Debug] dataLayer not found');
    return;
  }

  window.dataLayer.push = function(...args: unknown[]) {
    console.log('[dataLayer]', ...args);
    return originalPush.apply(window.dataLayer, args);
  };

  console.log('[Analytics Debug] dataLayer debug enabled');
}

/**
 * Get a summary of all tracked events (from dataLayer)
 */
export function getEventSummary(): Array<{ event: string; count: number }> {
  if (typeof window === 'undefined' || !window.dataLayer) {
    return [];
  }

  const events: Record<string, number> = {};
  
  for (const item of window.dataLayer) {
    const event = (item as Record<string, unknown>)?.event;
    if (typeof event === 'string') {
      events[event] = (events[event] || 0) + 1;
    }
  }

  return Object.entries(events)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get current analytics configuration
 */
export function getConfig(): ReturnType<typeof getAnalyticsConfig> {
  return getAnalyticsConfig();
}

/**
 * Simulate a funnel flow for testing
 */
export function simulateFunnel(funnelName: string, steps: string[]): void {
  console.log(`[Analytics Debug] Simulating funnel: ${funnelName}`);
  
  steps.forEach((step, index) => {
    setTimeout(() => {
      analytics.funnel.step({
        funnel_name: funnelName,
        step_name: step,
        step_number: index + 1,
        total_steps: steps.length,
      });
      console.log(`[Analytics Debug] Step ${index + 1}/${steps.length}: ${step}`);
    }, index * 500);
  });
}

/**
 * Clear all analytics state (for testing)
 */
export function resetAnalytics(): void {
  analytics.reset();
  console.log('[Analytics Debug] Analytics state reset');
}

/**
 * Get current user context
 */
export function getUserContext(): ReturnType<typeof analytics.getDebugState>['userContext'] {
  return analytics.getDebugState().userContext;
}

/**
 * Test all core events
 */
export function testAllEvents(): void {
  console.log('[Analytics Debug] Testing all core events...');

  // Page view
  analytics.pageView('/test-page');
  console.log('✓ page_view');

  // Signup
  analytics.track.signUpComplete({ signup_method: 'email' });
  console.log('✓ sign_up_complete');

  // Profile
  analytics.track.profileCompleted({ 
    fields_completed: ['name', 'photo'],
    time_to_complete_seconds: 60,
  });
  console.log('✓ profile_completed');

  // Ride created
  analytics.track.rideCreated({
    seats: 3,
    is_recurring: false,
    distance_km: 25,
  });
  console.log('✓ ride_created');

  // Ride requested
  analytics.track.rideRequested({
    seats_requested: 2,
    has_target_ride: true,
  });
  console.log('✓ ride_requested');

  // Message sent
  analytics.track.messageSent({
    message_context: 'ride_inquiry',
    is_first_message: true,
  });
  console.log('✓ message_sent');

  // Error state
  analytics.track.errorStateShown({
    error_type: 'network',
    error_source: 'test',
    error_code: 'TEST_ERROR',
  });
  console.log('✓ error_state_shown');

  console.log('[Analytics Debug] All core events tested');
}

// ============================================================================
// Expose to Window (Development Only)
// ============================================================================

export function initDebugTools(): void {
  if (typeof window === 'undefined') return;
  
  const config = getAnalyticsConfig();
  if (!config.debug) return;

  // Expose debug utilities globally
  const debugTools = {
    testGA4Connection,
    enableDataLayerDebug,
    getEventSummary,
    getConfig,
    simulateFunnel,
    resetAnalytics,
    getUserContext,
    testAllEvents,
  };

  (window as unknown as { analyticsDebug: typeof debugTools }).analyticsDebug = debugTools;

  console.log('[Analytics Debug] Debug tools available as window.analyticsDebug');
  console.log('Available commands:');
  console.log('  analyticsDebug.testGA4Connection()');
  console.log('  analyticsDebug.enableDataLayerDebug()');
  console.log('  analyticsDebug.getEventSummary()');
  console.log('  analyticsDebug.getConfig()');
  console.log('  analyticsDebug.simulateFunnel("test", ["step1", "step2"])');
  console.log('  analyticsDebug.resetAnalytics()');
  console.log('  analyticsDebug.getUserContext()');
  console.log('  analyticsDebug.testAllEvents()');
}
