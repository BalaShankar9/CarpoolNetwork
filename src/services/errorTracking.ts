import { supabase } from '../lib/supabase';

interface ErrorLog {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  endpoint?: string;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private errorBuffer: ErrorLog[] = [];
  private flushInterval = 10000;
  private maxBufferSize = 20;

  constructor() {
    this.startAutoFlush();
    this.setupGlobalErrorHandler();
  }

  async logError(error: ErrorLog) {
    this.errorBuffer.push(error);

    console.error('[ErrorTracker]', error.errorType, error.errorMessage);

    if (this.errorBuffer.length >= this.maxBufferSize || error.severity === 'critical') {
      await this.flush();
    }
  }

  async flush() {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      for (const error of errors) {
        await supabase.rpc('log_error', {
          p_error_type: error.errorType,
          p_error_message: error.errorMessage,
          p_error_stack: error.errorStack || null,
          p_severity: error.severity || 'error',
          p_endpoint: error.endpoint || window.location.pathname,
          p_metadata: error.metadata || {}
        });
      }
    } catch (err) {
      console.error('Failed to flush error logs:', err);
    }
  }

  private startAutoFlush() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  private setupGlobalErrorHandler() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.logError({
        errorType: 'uncaught_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        severity: 'error',
        endpoint: window.location.pathname,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        errorType: 'unhandled_promise_rejection',
        errorMessage: event.reason?.message || String(event.reason),
        errorStack: event.reason?.stack,
        severity: 'error',
        endpoint: window.location.pathname,
        metadata: {
          reason: event.reason
        }
      });
    });
  }

  captureException(error: Error, context?: Record<string, any>) {
    this.logError({
      errorType: error.name || 'Error',
      errorMessage: error.message,
      errorStack: error.stack,
      severity: 'error',
      endpoint: window.location.pathname,
      metadata: context
    });
  }

  async captureMessage(message: string, level: ErrorLog['severity'] = 'info', context?: Record<string, any>) {
    await this.logError({
      errorType: 'message',
      errorMessage: message,
      severity: level,
      endpoint: window.location.pathname,
      metadata: context
    });
  }

  async getRecentErrors(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }

  async getErrorPatterns() {
    try {
      const { data, error } = await supabase
        .from('error_patterns')
        .select('*')
        .order('occurrence_count', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get error patterns:', error);
      return [];
    }
  }
}

export const errorTracker = new ErrorTracker();

export function wrapWithErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result.catch((error) => {
          errorTracker.captureException(error, context);
          throw error;
        });
      }

      return result;
    } catch (error) {
      errorTracker.captureException(error as Error, context);
      throw error;
    }
  }) as T;
}
