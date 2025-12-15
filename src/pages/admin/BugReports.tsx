import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug,
  ArrowLeft,
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_EMAIL = 'balashankarbollineni4@gmail.com';

interface BugReport {
  id: string;
  user_id: string;
  text: string;
  page: string;
  created_at: string;
  user_email?: string;
}

export default function BugReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchReports();
  }, [isAdmin, navigate]);

  const fetchReports = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bug report?')) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting bug report:', error);
    } finally {
      setDeleting(null);
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Bug className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bug Reports</h1>
                <p className="text-gray-500">{reports.length} reports</p>
              </div>
            </div>
            <button
              onClick={fetchReports}
              disabled={refreshing}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        <ExternalLink className="w-3 h-3" />
                        {report.page || '/'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.created_at)}
                      </span>
                    </div>

                    <p className="text-gray-900 whitespace-pre-wrap">{report.text}</p>

                    <div className="mt-3 text-xs text-gray-400">
                      ID: {report.id.slice(0, 8)}...
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deleting === report.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete report"
                  >
                    {deleting === report.id ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Admin-only access</p>
              <p>
                Bug reports are only visible to and can only be created by the admin account.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
