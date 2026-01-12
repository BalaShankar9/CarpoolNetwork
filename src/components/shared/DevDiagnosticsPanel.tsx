import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SchemaStatus {
  name: string;
  exists: boolean;
  type: 'function' | 'table' | 'view';
}

interface DiagnosticsState {
  projectUrl: string;
  projectRef: string;
  schemaChecks: SchemaStatus[];
  loading: boolean;
  lastChecked: Date | null;
  overallHealthy: boolean;
}

/**
 * DevDiagnosticsPanel - Shows Supabase project info and schema health in dev mode only
 * Renders nothing in production builds
 */
export default function DevDiagnosticsPanel() {
  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<DiagnosticsState>({
    projectUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
    projectRef: '',
    schemaChecks: [],
    loading: false,
    lastChecked: null,
    overallHealthy: true,
  });

  // Extract project ref from URL
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      setState(prev => ({ ...prev, projectRef: match[1] }));
    }
  }, []);

  const checkSchemaHealth = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    const checks: SchemaStatus[] = [];

    // Check critical functions
    const functionsToCheck = [
      'get_conversations_overview',
      'get_or_create_dm_conversation',
      'mark_conversation_read',
      'user_can_view_ride',
      'request_booking',
    ];

    for (const funcName of functionsToCheck) {
      try {
        // Try calling the function with invalid params - if it exists, we'll get a different error
        const { error } = await supabase.rpc(funcName as any, {});
        
        // PGRST202 means function doesn't exist
        // Other errors (like invalid params) mean it exists
        const exists = !error || error.code !== 'PGRST202';
        
        checks.push({
          name: funcName,
          exists,
          type: 'function',
        });
      } catch (err) {
        checks.push({
          name: funcName,
          exists: false,
          type: 'function',
        });
      }
    }

    // Check critical tables by trying to query them
    const tablesToCheck = ['conversations', 'conversation_members', 'chat_messages', 'message_reads'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        // 42P01 = table doesn't exist
        const exists = !error || !['42P01', 'PGRST116'].includes(error.code || '');
        
        checks.push({
          name: tableName,
          exists,
          type: 'table',
        });
      } catch (err) {
        checks.push({
          name: tableName,
          exists: false,
          type: 'table',
        });
      }
    }

    // Check views
    try {
      const { error } = await supabase
        .from('profile_public_v')
        .select('id')
        .limit(1);
      
      checks.push({
        name: 'profile_public_v',
        exists: !error || !['42P01', 'PGRST116'].includes(error.code || ''),
        type: 'view',
      });
    } catch (err) {
      checks.push({
        name: 'profile_public_v',
        exists: false,
        type: 'view',
      });
    }

    const overallHealthy = checks.every(c => c.exists);

    setState(prev => ({
      ...prev,
      schemaChecks: checks,
      loading: false,
      lastChecked: new Date(),
      overallHealthy,
    }));
  };

  // Auto-check on mount
  useEffect(() => {
    checkSchemaHealth();
  }, []);

  const getStatusIcon = (exists: boolean) => {
    return exists 
      ? <CheckCircle className="w-4 h-4 text-green-500" />
      : <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="fixed bottom-20 left-4 z-50">
      {/* Collapsed Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium transition-all ${
          state.overallHealthy 
            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
            : 'bg-red-100 text-red-800 hover:bg-red-200 animate-pulse'
        }`}
      >
        {state.overallHealthy ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
        <span>DEV</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Dev Diagnostics</h3>
              <button
                onClick={checkSchemaHealth}
                disabled={state.loading}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
            {/* Project Info */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Supabase Project</p>
              <p className="text-xs font-mono text-gray-700 truncate" title={state.projectUrl}>
                {state.projectRef || 'Unknown'}
              </p>
              <a
                href={`https://supabase.com/dashboard/project/${state.projectRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Open Dashboard →
              </a>
            </div>

            {/* Schema Health */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Schema Health</p>
              <div className="space-y-1">
                {state.schemaChecks.map((check) => (
                  <div 
                    key={check.name}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                      check.exists ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <span className="font-mono text-gray-700">{check.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">{check.type}</span>
                      {getStatusIcon(check.exists)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Checked */}
            {state.lastChecked && (
              <p className="text-xs text-gray-400">
                Last checked: {state.lastChecked.toLocaleTimeString()}
              </p>
            )}

            {/* Warning if unhealthy */}
            {!state.overallHealthy && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <p className="font-medium mb-1">Missing DB objects detected!</p>
                <p>Run migrations in Supabase SQL Editor:</p>
                <code className="block mt-1 p-1 bg-amber-100 rounded font-mono text-[10px]">
                  scripts/verify_prod_schema.sql
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
