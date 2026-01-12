/**
 * Core Web Vitals Module
 * 
 * Measures and reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB)
 * using the official web-vitals library.
 * 
 * WHY: Core Web Vitals are Google's key metrics for user experience.
 * Tracking them helps identify performance issues and optimize UX.
 * 
 * USAGE:
 * ```ts
 * // Initialize once at app startup (after analytics.initialize())
 * initWebVitals();
 * ```
 */

import { analytics } from './index';
import type { WebVitalsEvent } from './types';

// ============================================================================
// Types
// ============================================================================

type MetricName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
type MetricRating = 'good' | 'needs-improvement' | 'poor';

interface Metric {
  name: MetricName;
  value: number;
  rating: MetricRating;
  delta: number;
  id: string;
  entries: PerformanceEntry[];
  navigationType: string;
}

// ============================================================================
// Thresholds (based on Google's recommendations)
// ============================================================================

const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Determine rating based on thresholds
 */
function getRating(name: MetricName, value: number): MetricRating {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Metric Handlers
// ============================================================================

/**
 * Report a single metric to analytics
 */
function reportMetric(metric: Metric): void {
  const rating = getRating(metric.name, metric.value);
  
  analytics.performance.webVital({
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: rating,
  });

  // Also log in debug mode
  if (import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
    console.log(`[WebVitals] ${metric.name}:`, {
      value: metric.value,
      rating,
      delta: metric.delta,
      entries: metric.entries,
    });
  }
}

// ============================================================================
// Web Vitals Initialization
// ============================================================================

let isInitialized = false;

/**
 * Initialize Core Web Vitals tracking.
 * 
 * WHY: We dynamically import web-vitals to avoid bundling it
 * if analytics is disabled, and to ensure it loads after the page.
 */
export async function initWebVitals(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Skip in SSR or if analytics is disabled
  if (typeof window === 'undefined') {
    return;
  }

  const disabled = import.meta.env.VITE_ANALYTICS_DISABLED === 'true';
  if (disabled) {
    return;
  }

  isInitialized = true;

  try {
    // Dynamically import web-vitals library
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Report each metric when it's available
    onCLS((metric) => reportMetric(metric as unknown as Metric));
    onFCP((metric) => reportMetric(metric as unknown as Metric));
    onLCP((metric) => reportMetric(metric as unknown as Metric));
    onTTFB((metric) => reportMetric(metric as unknown as Metric));
    onINP((metric) => reportMetric(metric as unknown as Metric));

    if (import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
      console.log('[WebVitals] Initialized');
    }
  } catch (error) {
    // web-vitals library not installed - that's okay
    console.warn('[WebVitals] Could not initialize:', error);
  }
}

// ============================================================================
// Manual Performance Tracking
// ============================================================================

/**
 * Track a custom timing metric
 */
export function trackTiming(
  category: string,
  name: string,
  durationMs: number
): void {
  analytics.funnel.step({
    funnel_name: 'performance',
    step_name: `timing_${category}_${name}`,
    step_number: 1,
    total_steps: 1,
    custom_properties: {
      category,
      metric_name: name,
      duration_ms: durationMs,
      duration_bucket: durationMs < 100 ? '<100ms'
        : durationMs < 500 ? '100-500ms'
        : durationMs < 1000 ? '500ms-1s'
        : durationMs < 3000 ? '1-3s'
        : '>3s',
    },
  });
}

/**
 * Create a performance mark and return a function to measure from it
 */
export function startMeasure(name: string): () => number {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    return duration;
  };
}

/**
 * Measure time for an async operation
 */
export async function measureAsync<T>(
  name: string,
  category: string,
  operation: () => Promise<T>
): Promise<T> {
  const end = startMeasure(name);
  try {
    const result = await operation();
    trackTiming(category, name, end());
    return result;
  } catch (error) {
    trackTiming(category, `${name}_error`, end());
    throw error;
  }
}

// ============================================================================
// Resource Timing
// ============================================================================

/**
 * Get resource loading times for analysis
 */
export function getResourceTimings(): Array<{
  name: string;
  duration: number;
  type: string;
}> {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return entries.map(entry => ({
    name: entry.name,
    duration: entry.duration,
    type: entry.initiatorType,
  })).filter(e => e.duration > 100); // Only significant resources
}

/**
 * Track slow resources (useful for identifying performance bottlenecks)
 */
export function trackSlowResources(thresholdMs: number = 1000): void {
  const slowResources = getResourceTimings().filter(r => r.duration > thresholdMs);
  
  if (slowResources.length > 0) {
    analytics.funnel.step({
      funnel_name: 'performance',
      step_name: 'slow_resources',
      step_number: 1,
      total_steps: 1,
      custom_properties: {
        count: slowResources.length,
        slowest: slowResources.slice(0, 5).map(r => ({
          name: r.name.split('/').pop(), // Just filename
          duration: Math.round(r.duration),
          type: r.type,
        })),
      },
    });
  }
}

// ============================================================================
// Long Task Tracking
// ============================================================================

let longTaskObserver: PerformanceObserver | null = null;

/**
 * Track long tasks (tasks > 50ms that block the main thread)
 */
export function trackLongTasks(): void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) {
    return;
  }

  if (longTaskObserver) {
    return; // Already tracking
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) { // Only track tasks > 100ms
          analytics.funnel.step({
            funnel_name: 'performance',
            step_name: 'long_task',
            step_number: 1,
            total_steps: 1,
            custom_properties: {
              duration_ms: Math.round(entry.duration),
              start_time: Math.round(entry.startTime),
            },
          });
        }
      }
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task tracking not supported
  }
}

// ============================================================================
// Exports
// ============================================================================

export const webVitals = {
  init: initWebVitals,
  trackTiming,
  startMeasure,
  measureAsync,
  getResourceTimings,
  trackSlowResources,
  trackLongTasks,
};
