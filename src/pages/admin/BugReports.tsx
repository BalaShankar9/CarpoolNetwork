import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, RefreshCw, ExternalLink, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';
import { logApiError } from '../../services/errorTracking';
import AdminLayout from '../../components/admin/AdminLayout';

interface BugReport {
  id: string;
  summary: string;
  details: string;
  status: string;
  route: string | null;
  error_id: string | null;
  ai_analysis?: string | null;
  ai_fix_suggestion?: string | null;
  metadata?: any;
  created_at: string;
}

export default function BugReports() {
  const { isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triaging, setTriaging] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin && !hasRole('moderator')) {
      navigate('/');
      return;
    }
    fetchReports();
  }, [isAdmin, hasRole, navigate]);

  const fetchReports = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id,summary,details,status,route,error_id,ai_analysis,ai_fix_suggestion,metadata,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      await logApiError('bug-reports-fetch', error, {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    try {
      const { error } = await supabase.from('bug_reports').update({ status }).eq('id', id);
      if (error) throw error;
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (error) {
      console.error('Failed to update status', error);
      await logApiError('bug-reports-status', error, {});
    } finally {
      setUpdatingStatus(null);
    }
  };

  const triggerAiAnalysis = async (bugId: string) => {
    setTriaging(bugId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('No auth token');
      const res = await fetch('/.netlify/functions/ai-bug-triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bugId }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || 'AI triage failed');
      }
      setReports((prev) =>
        prev.map((r) =>
          r.id === bugId
            ? { ...r, ai_analysis: body.ai_analysis, ai_fix_suggestion: body.ai_fix_suggestion, status: r.status === 'new' ? 'triaged' : r.status }
            : r
        )
      );
    } catch (error) {
      console.error('AI triage failed', error);
      await logApiError('ai-bug-triage-client', error, { extra: { bugId } });
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setTriaging(null);
    }
  };

  if (!isAdmin && !hasRole('moderator')) return null;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-red-100 text-red-700',
      triaged: 'bg-amber-100 text-amber-800',
      fixed: 'bg-green-100 text-green-700',
      wont_fix: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout
      title="Bug Reports"
      subtitle={`${reports.length} reports`}
      actions={
        <button
          onClick={fetchReports}
          disabled={refreshing}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bug className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bug reports</h3>
            <p className="text-gray-500">No problems have been reported yet.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      <ExternalLink className="w-3 h-3" />
                      {report.route || '/'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(report.created_at)}
                    </span>
                    {report.error_id && (
                      <span className="text-xs text-gray-500">Error ID: {report.error_id}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.summary}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{report.details}</p>
                  {report.metadata && (
                    <details className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <summary className="cursor-pointer">Metadata</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(report.metadata, null, 2)}</pre>
                    </details>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={report.status}
                    onChange={(e) => updateStatus(report.id, e.target.value)}
                    disabled={updatingStatus === report.id}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="fixed">Fixed</option>
                    <option value="wont_fix">Won't fix</option>
                  </select>
                  <button
                    onClick={() => triggerAiAnalysis(report.id)}
                    disabled={triaging === report.id}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Sparkles className="w-4 h-4" />
                    {triaging === report.id ? 'Analyzing...' : 'AI analysis'}
                  </button>
                </div>
              </div>

              {(report.ai_analysis || report.ai_fix_suggestion) && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-900 mb-2">AI Analysis</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{report.ai_analysis}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    <p className="text-xs font-semibold text-green-900 mb-2">Suggested Fix</p>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">
                      {report.ai_fix_suggestion || 'No fix suggestion provided.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400">ID: {report.id}</div>
            </div>
          ))
        )}

        {reports.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Admin-only access</p>
              <p>Bug reports are visible to admins. Use AI triage to speed up investigations.</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
