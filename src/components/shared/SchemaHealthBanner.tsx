/**
 * Schema Health Banner
 *
 * Displays a clear warning banner when database schema issues are detected.
 * Shows guidance for fixing PGRST202/PGRST204 errors.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { runSchemaHealthCheck, SchemaHealthReport } from '../../lib/schemaHealthCheck';

interface SchemaHealthBannerProps {
  /** Run check on mount (default: only in dev mode) */
  checkOnMount?: boolean;
  /** Show detailed info (default: collapsed) */
  defaultExpanded?: boolean;
}

export default function SchemaHealthBanner({
  checkOnMount = import.meta.env.DEV,
  defaultExpanded = false,
}: SchemaHealthBannerProps) {
  const [report, setReport] = useState<SchemaHealthReport | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (checkOnMount) {
      runCheck();
    }
  }, [checkOnMount]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const result = await runSchemaHealthCheck();
      setReport(result);
      setDismissed(false);
    } catch (err) {
      console.error('Schema health check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  // Don't render if healthy or dismissed
  if (!report || report.healthy || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-amber-800">
                Database Schema Issues Detected
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-amber-700 hover:text-amber-900 p-1"
                  aria-label={expanded ? 'Collapse details' : 'Expand details'}
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={runCheck}
                  disabled={checking}
                  className="text-amber-700 hover:text-amber-900 p-1 disabled:opacity-50"
                  aria-label="Recheck schema"
                >
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-amber-700 hover:text-amber-900 p-1"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-amber-700 mt-1">
              Some features may not work correctly.{' '}
              {report.missingItems.length > 0 && (
                <span className="font-medium">
                  Missing: {report.missingItems.slice(0, 3).join(', ')}
                  {report.missingItems.length > 3 && ` (+${report.missingItems.length - 3} more)`}
                </span>
              )}
            </p>

            {expanded && (
              <div className="mt-3 p-3 bg-amber-100 rounded-lg text-xs text-amber-800 font-mono">
                <p className="font-semibold mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Apply pending migrations to your Supabase project</li>
                  <li>
                    Go to Supabase Dashboard &rarr; Settings &rarr; API &rarr; Reload schema cache
                  </li>
                  <li>Refresh this page</li>
                </ol>

                {report.missingItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="font-semibold mb-1">Missing objects:</p>
                    <ul className="list-disc list-inside">
                      {report.missingItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-3 text-amber-600">
                  See <code>docs/PROD_MIGRATION_CHECKLIST.md</code> for detailed verification steps.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline schema error message for use within components
 */
export function SchemaErrorMessage({
  error,
  onRetry,
  retrying = false,
}: {
  error: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const isPGRST202 = error.includes('PGRST202') || error.includes('schema cache');
  const isPGRST204 = error.includes('PGRST204') || error.includes('does not exist');

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            {isPGRST202 && 'Database function not found'}
            {isPGRST204 && 'Database table or view not found'}
            {!isPGRST202 && !isPGRST204 && 'Database connection issue'}
          </p>

          <p className="text-sm text-amber-700">
            {isPGRST202 && (
              <>
                The API schema cache may need to be refreshed. Go to Supabase Dashboard &rarr;
                Settings &rarr; API &rarr; Reload schema cache.
              </>
            )}
            {isPGRST204 && (
              <>
                A required database migration may be missing. Contact your administrator.
              </>
            )}
            {!isPGRST202 && !isPGRST204 && (
              <>Please try again. If the problem persists, contact support.</>
            )}
          </p>

          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Try again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
