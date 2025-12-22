import { supabase } from '../lib/supabase';

interface PerformanceMetric {
  metricType: string;
  metricName: string;
  value: number;
  unit?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metricsBuffer: PerformanceMetric[] = [];
  private flushInterval = 30000;
  private maxBufferSize = 50;

  constructor() {
    this.startAutoFlush();
    this.setupPerformanceObserver();
  }

  track(metric: PerformanceMetric) {
    this.metricsBuffer.push(metric);

    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      for (const metric of metrics) {
        await supabase.rpc('track_performance_metric', {
          p_metric_type: metric.metricType,
          p_metric_name: metric.metricName,
          p_value: metric.value,
          p_unit: metric.unit || 'ms',
          p_endpoint: metric.endpoint || null,
          p_metadata: metric.metadata || {}
        });
      }
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  private startAutoFlush() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  private setupPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.track({
              metricType: 'page_load',
              metricName: 'dom_content_loaded',
              value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              endpoint: window.location.pathname
            });

            this.track({
              metricType: 'page_load',
              metricName: 'full_page_load',
              value: navEntry.loadEventEnd - navEntry.loadEventStart,
              endpoint: window.location.pathname
            });
          }

          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              this.track({
                metricType: 'network_latency',
                metricName: 'slow_resource',
                value: resourceEntry.duration,
                endpoint: resourceEntry.name,
                metadata: {
                  initiatorType: resourceEntry.initiatorType,
                  transferSize: resourceEntry.transferSize
                }
              });
            }
          }

          if (entry.entryType === 'measure') {
            this.track({
              metricType: 'render_time',
              metricName: entry.name,
              value: entry.duration,
              endpoint: window.location.pathname
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    } catch (error) {
      console.error('Failed to setup performance observer:', error);
    }
  }

  trackRender(componentName: string, duration: number) {
    this.track({
      metricType: 'render_time',
      metricName: componentName,
      value: duration,
      endpoint: window.location.pathname
    });
  }

  trackApiCall(endpoint: string, duration: number, success: boolean) {
    this.track({
      metricType: 'api_call',
      metricName: success ? 'api_success' : 'api_error',
      value: duration,
      endpoint,
      metadata: { success }
    });
  }

  trackDatabaseQuery(queryName: string, duration: number, rowCount?: number) {
    this.track({
      metricType: 'database_query',
      metricName: queryName,
      value: duration,
      metadata: { rowCount }
    });
  }

  async getSystemHealth() {
    try {
      const { data, error } = await supabase.rpc('get_system_health');

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return null;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function measureRender<T extends (...args: any[]) => any>(
  componentName: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    performanceMonitor.trackRender(componentName, duration);

    return result;
  }) as T;
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  type: 'api_call' | 'database_query' = 'api_call'
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (type === 'api_call') {
      performanceMonitor.trackApiCall(name, duration, true);
    } else {
      performanceMonitor.trackDatabaseQuery(name, duration);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    if (type === 'api_call') {
      performanceMonitor.trackApiCall(name, duration, false);
    }

    throw error;
  }
}

export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    performanceMonitor.trackRender(componentName, duration);
  };
}
