/**
 * Schema Health Check Module
 *
 * Verifies that required database objects (tables, views, functions) exist
 * before the app attempts to use them. This prevents cryptic PGRST202/PGRST204
 * errors and provides clear guidance for missing migrations.
 */

import { supabase } from './supabase';

export interface SchemaCheckResult {
  object: string;
  type: 'table' | 'view' | 'function';
  exists: boolean;
  error?: string;
}

export interface SchemaHealthReport {
  timestamp: string;
  healthy: boolean;
  checks: SchemaCheckResult[];
  missingItems: string[];
  guidance: string | null;
}

// Required database objects that must exist for the app to function
const REQUIRED_OBJECTS = {
  tables: [
    'profiles',
    'rides',
    'ride_bookings',
    'vehicles',
    'chat_conversations',
    'chat_messages',
    'notifications',
    'user_preferences',
  ],
  views: [
    'profile_public_v',
  ],
  functions: [
    'get_conversations_overview',
    'sync_expired_ride_state',
    'delete_ride_for_driver',
  ],
  // Optional: recurring patterns table (may not exist in all deployments)
  optionalTables: [
    'recurring_ride_patterns',
  ],
};

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName: string): Promise<SchemaCheckResult> {
  try {
    // Try to select 0 rows - this will fail if table doesn't exist
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);

    if (error) {
      // PGRST204 = Table doesn't exist, 42P01 = relation does not exist
      if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return { object: tableName, type: 'table', exists: false, error: error.message };
      }
      // Other errors (like RLS) mean the table exists
      return { object: tableName, type: 'table', exists: true };
    }

    return { object: tableName, type: 'table', exists: true };
  } catch (err: any) {
    return { object: tableName, type: 'table', exists: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Check if a view exists in the database
 */
async function checkViewExists(viewName: string): Promise<SchemaCheckResult> {
  try {
    const { error } = await supabase
      .from(viewName)
      .select('*', { count: 'exact', head: true })
      .limit(0);

    if (error) {
      // PGRST204 = View doesn't exist, 42P01 = relation does not exist
      if (error.code === 'PGRST204' || error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')) {
        return { object: viewName, type: 'view', exists: false, error: error.message };
      }
      // Other errors mean the view exists
      return { object: viewName, type: 'view', exists: true };
    }

    return { object: viewName, type: 'view', exists: true };
  } catch (err: any) {
    return { object: viewName, type: 'view', exists: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Check if an RPC function exists in the database
 */
async function checkFunctionExists(functionName: string): Promise<SchemaCheckResult> {
  try {
    // Call the RPC with minimal/no parameters - we just want to see if it exists
    const result = await (supabase.rpc as any)(functionName);

    if (result?.error) {
      const error = result.error as any;
      // PGRST202 = Function not found in schema cache
      // 42883 = Function does not exist
      if (error.code === 'PGRST202' || error.code === '42883' ||
          error.message?.includes('Could not find') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')) {
        return { object: functionName, type: 'function', exists: false, error: error.message };
      }
      // Other errors (like missing parameters) mean the function exists
      return { object: functionName, type: 'function', exists: true };
    }

    return { object: functionName, type: 'function', exists: true };
  } catch (err: any) {
    // Network errors or other issues - assume function might exist
    if (err?.code === 'PGRST202' || err?.code === '42883') {
      return { object: functionName, type: 'function', exists: false, error: err?.message };
    }
    // For other errors, we can't determine - mark as potentially missing
    return { object: functionName, type: 'function', exists: false, error: err?.message || 'Check failed' };
  }
}

/**
 * Generate guidance message for missing items
 */
function generateGuidance(missingItems: string[]): string | null {
  if (missingItems.length === 0) return null;

  const guidance = [
    'Database schema is incomplete. Missing objects:',
    '',
    ...missingItems.map(item => `  - ${item}`),
    '',
    'To fix this:',
    '1. Check supabase/migrations/ for the required migration files',
    '2. Apply any pending migrations to your Supabase project',
    '3. If using Supabase dashboard, reload the schema cache:',
    '   Settings -> API -> Reload schema cache',
    '4. Restart the PostgREST API if errors persist',
    '',
    'See docs/PROD_MIGRATION_CHECKLIST.md for detailed verification steps.',
  ];

  return guidance.join('\n');
}

/**
 * Run a full schema health check
 * Returns a report of all checked objects and their status
 */
export async function runSchemaHealthCheck(): Promise<SchemaHealthReport> {
  const checks: SchemaCheckResult[] = [];

  // Check required tables
  for (const table of REQUIRED_OBJECTS.tables) {
    const result = await checkTableExists(table);
    checks.push(result);
  }

  // Check required views
  for (const view of REQUIRED_OBJECTS.views) {
    const result = await checkViewExists(view);
    checks.push(result);
  }

  // Check required functions
  for (const func of REQUIRED_OBJECTS.functions) {
    const result = await checkFunctionExists(func);
    checks.push(result);
  }

  // Check optional tables (don't fail health check if missing)
  for (const table of REQUIRED_OBJECTS.optionalTables) {
    const result = await checkTableExists(table);
    // Mark optional tables specially
    checks.push({ ...result, object: `${table} (optional)` });
  }

  // Filter out optional items for the health determination
  const requiredChecks = checks.filter(c => !c.object.includes('(optional)'));
  const missingRequired = requiredChecks.filter(c => !c.exists);
  const missingItems = missingRequired.map(c => `${c.type}: ${c.object}`);

  return {
    timestamp: new Date().toISOString(),
    healthy: missingRequired.length === 0,
    checks,
    missingItems,
    guidance: generateGuidance(missingItems),
  };
}

/**
 * Quick check for critical messaging functions
 * Returns true if messaging should work, false if schema cache needs refresh
 */
export async function checkMessagingReady(): Promise<{ ready: boolean; error?: string }> {
  const result = await checkFunctionExists('get_conversations_overview');
  if (!result.exists) {
    return {
      ready: false,
      error: 'Messaging RPC not found. The database schema cache may need to be refreshed.',
    };
  }
  return { ready: true };
}

/**
 * Quick check for ride management functions
 */
export async function checkRideManagementReady(): Promise<{ ready: boolean; error?: string }> {
  const checks = await Promise.all([
    checkFunctionExists('sync_expired_ride_state'),
    checkFunctionExists('delete_ride_for_driver'),
  ]);

  const missing = checks.filter(c => !c.exists);
  if (missing.length > 0) {
    return {
      ready: false,
      error: `Ride management functions missing: ${missing.map(m => m.object).join(', ')}`,
    };
  }
  return { ready: true };
}

/**
 * Log schema health status (for debugging)
 */
export function logSchemaHealth(report: SchemaHealthReport): void {
  if (report.healthy) {
    console.log('[SchemaHealth] All required database objects present');
  } else {
    console.warn('[SchemaHealth] Database schema incomplete!');
    console.warn('[SchemaHealth] Missing items:', report.missingItems);
    if (report.guidance) {
      console.info('[SchemaHealth] Guidance:\n', report.guidance);
    }
  }

  if (import.meta.env.DEV) {
    console.table(report.checks.map(c => ({
      Object: c.object,
      Type: c.type,
      Exists: c.exists ? 'Yes' : 'NO',
      Error: c.error || '-',
    })));
  }
}

/**
 * Format error message for PGRST202 schema cache errors
 */
export function formatSchemaErrorMessage(error: any): string {
  const code = error?.code || 'UNKNOWN';

  if (code === 'PGRST202' || error?.message?.includes('schema cache')) {
    return [
      'Database function not found (PGRST202).',
      '',
      'This usually means:',
      '1. A migration has not been applied, OR',
      '2. The API schema cache needs to be refreshed.',
      '',
      'To fix: Go to Supabase Dashboard -> Settings -> API -> Click "Reload schema cache"',
    ].join('\n');
  }

  if (code === 'PGRST204' || code === '42P01') {
    return [
      'Database table or view not found.',
      '',
      'Required migrations may be missing.',
      'Check supabase/migrations/ and apply pending migrations.',
    ].join('\n');
  }

  return error?.message || 'An unexpected database error occurred.';
}

export default {
  runSchemaHealthCheck,
  checkMessagingReady,
  checkRideManagementReady,
  logSchemaHealth,
  formatSchemaErrorMessage,
};
