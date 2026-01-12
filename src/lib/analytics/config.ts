/**
 * Analytics Configuration
 * 
 * WHY: Centralized configuration ensures consistent environment handling
 * and makes it easy to modify analytics settings without code changes.
 * 
 * ENVIRONMENT HANDLING:
 * - Production: Full tracking enabled
 * - Staging: Tracking enabled but flagged (conversions excluded)
 * - Development: Debug mode, no actual tracking
 */

import type { AnalyticsConfig, AnalyticsEnvironment } from './types';

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detects the current environment based on hostname and env variables.
 * 
 * WHY: We need to know the environment to:
 * 1. Enable/disable tracking appropriately
 * 2. Flag staging data to exclude from conversion reports
 * 3. Enable debug mode in development
 */
export function detectEnvironment(): AnalyticsEnvironment {
  // Check for explicit environment variable first
  const envVar = import.meta.env.VITE_ANALYTICS_ENV;
  if (envVar === 'production' || envVar === 'staging' || envVar === 'development') {
    return envVar;
  }

  // Fallback to hostname detection
  if (typeof window === 'undefined') {
    return 'development';
  }

  const hostname = window.location.hostname;

  // Production domains
  if (
    hostname === 'carpoolnetwork.co.uk' ||
    hostname === 'www.carpoolnetwork.co.uk' ||
    hostname.endsWith('.carpoolnetwork.co.uk')
  ) {
    return 'production';
  }

  // Staging domains (Netlify preview deploys)
  if (
    hostname.includes('netlify.app') ||
    hostname.includes('--carpoolnetwork') ||
    hostname.includes('staging')
  ) {
    return 'staging';
  }

  // Everything else is development
  return 'development';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Creates the analytics configuration based on environment.
 * 
 * WHY: Configuration is environment-aware to ensure:
 * 1. No tracking in development (unless explicitly enabled)
 * 2. Staging data is properly flagged
 * 3. Debug mode helps during development
 */
export function createAnalyticsConfig(): AnalyticsConfig {
  const environment = detectEnvironment();

  // GA4 Measurement ID - set via environment variable
  // WHY: Allows different GA4 properties for staging vs production if needed
  const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

  // GTM Container ID - optional, for advanced tag management
  const gtmContainerId = import.meta.env.VITE_GTM_CONTAINER_ID || undefined;

  // Debug mode - enabled in development or via explicit flag
  const debug = 
    environment === 'development' || 
    import.meta.env.VITE_ANALYTICS_DEBUG === 'true' ||
    (typeof window !== 'undefined' && window.location.search.includes('analytics_debug=true'));

  // Disabled - no tracking at all
  // WHY: Useful for testing, CI/CD, or when user opts out
  const disabled = 
    import.meta.env.VITE_ANALYTICS_DISABLED === 'true' ||
    (typeof window !== 'undefined' && window.location.search.includes('analytics_disabled=true'));

  return {
    ga4MeasurementId,
    gtmContainerId,
    environment,
    debug,
    disabled,
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let configInstance: AnalyticsConfig | null = null;

/**
 * Gets the analytics configuration singleton.
 * 
 * WHY: Single source of truth for analytics config
 * prevents inconsistent behavior across the app.
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  if (!configInstance) {
    configInstance = createAnalyticsConfig();
  }
  return configInstance;
}

/**
 * Resets the configuration (useful for testing).
 */
export function resetAnalyticsConfig(): void {
  configInstance = null;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates that analytics is properly configured.
 * Returns warnings for any issues found.
 */
export function validateAnalyticsConfig(): string[] {
  const config = getAnalyticsConfig();
  const warnings: string[] = [];

  if (!config.ga4MeasurementId && config.environment === 'production') {
    warnings.push('GA4 Measurement ID is not set. Set VITE_GA4_MEASUREMENT_ID in your environment.');
  }

  if (config.ga4MeasurementId && !config.ga4MeasurementId.startsWith('G-')) {
    warnings.push('GA4 Measurement ID should start with "G-". Current value may be invalid.');
  }

  if (config.gtmContainerId && !config.gtmContainerId.startsWith('GTM-')) {
    warnings.push('GTM Container ID should start with "GTM-". Current value may be invalid.');
  }

  return warnings;
}
