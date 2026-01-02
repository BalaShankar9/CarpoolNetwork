import { supabase } from '../lib/supabase';

export type ErrorContext = {
  errorId?: string;
  route?: string;
  userId?: string | null;
  role?: 'user' | 'admin' | 'guest';
  extra?: Record<string, unknown>;
};

type Severity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

type BufferedEntry = {
  errorType: string;
  errorMessage: string;
  errorStack?: string | null;
  severity: Severity;
  endpoint?: string | null;
  metadata?: Record<string, unknown>;
};

const buffer: BufferedEntry[] = [];
const FLUSH_INTERVAL = 10000;
const MAX_BUFFER = 20;

const currentRoute = () =>
  typeof window !== 'undefined' ? window.location.pathname : undefined;

const normalizeContext = (context?: ErrorContext) => ({
  errorId: context?.errorId,
  route: context?.route || currentRoute(),
  userId: context?.userId ?? null,
  role: context?.role || 'guest',
  extra: context?.extra || {},
});

const enqueue = async (entry: BufferedEntry) => {
  buffer.push(entry);
  if (buffer.length >= MAX_BUFFER || entry.severity === 'critical') {
    await flush();
  }
};

export async function logClientError(
  error: unknown,
  info?: { componentStack?: string },
  context?: ErrorContext
): Promise<string | undefined> {
  const ctx = normalizeContext(context);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const errorId = ctx.errorId || `err-${Date.now().toString(36)}`;
  await enqueue({
    errorType: 'client_error',
    errorMessage: message,
    errorStack: stack || null,
    severity: 'error',
    endpoint: ctx.route || null,
    metadata: {
      ...ctx.extra,
      errorId,
      componentStack: info?.componentStack,
      role: ctx.role,
      userId: ctx.userId,
    },
  });
  return errorId;
}

export async function logApiError(
  label: string,
  error: unknown,
  context?: ErrorContext
): Promise<void> {
  const ctx = normalizeContext(context);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  await enqueue({
    errorType: label,
    errorMessage: message,
    errorStack: stack || null,
    severity: 'error',
    endpoint: ctx.route || null,
    metadata: { ...ctx.extra, errorId: ctx.errorId, role: ctx.role, userId: ctx.userId },
  });
}

export async function reportUserBug(params: {
  summary: string;
  details: string;
  errorId?: string;
  route?: string;
  userId?: string | null;
  role?: 'user' | 'admin' | 'guest';
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; bugId?: string; message?: string }> {
  try {
    const meta = { ...(params.metadata || {}), role: params.role };
    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        summary: params.summary || 'Bug report',
        details: params.details,
        error_id: params.errorId || null,
        route: params.route || currentRoute() || null,
        user_id: params.userId || null,
        status: 'new',
        metadata: meta,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, bugId: data?.id, message: 'Bug reported' };
  } catch (err: any) {
    console.error('Failed to report user bug:', err);
    await logApiError('reportUserBug', err, {
      errorId: params.errorId,
      route: params.route,
      userId: params.userId,
      role: params.role,
      extra: params.metadata,
    });
    return { success: false, message: err?.message || 'Failed to report bug' };
  }
}

async function flush() {
  if (buffer.length === 0) return;
  const entries = [...buffer];
  buffer.length = 0;

  try {
    for (const entry of entries) {
      await supabase.rpc('log_error', {
        p_error_type: entry.errorType,
        p_error_message: entry.errorMessage,
        p_error_stack: entry.errorStack || null,
        p_severity: entry.severity || 'error',
        p_endpoint: entry.endpoint || currentRoute() || null,
        p_metadata: entry.metadata || {},
      });
    }
  } catch (err) {
    console.error('Failed to flush error logs:', err);
  }
}

if (typeof window !== 'undefined') {
  setInterval(() => {
    flush();
  }, FLUSH_INTERVAL);

  window.addEventListener('error', (event) => {
    enqueue({
      errorType: 'uncaught_error',
      errorMessage: event.message,
      errorStack: event.error?.stack || null,
      severity: 'error',
      endpoint: currentRoute() || null,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    enqueue({
      errorType: 'unhandled_promise_rejection',
      errorMessage: event.reason?.message || String(event.reason),
      errorStack: event.reason?.stack || null,
      severity: 'error',
      endpoint: currentRoute() || null,
      metadata: {
        reason: event.reason,
      },
    });
  });
}

// Utility wrapper to catch errors in arbitrary functions
export function wrapWithErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          logApiError('wrapped_fn_error', error, context);
          throw error;
        });
      }
      return result;
    } catch (error) {
      logApiError('wrapped_fn_error', error, context);
      throw error;
    }
  }) as T;
}
