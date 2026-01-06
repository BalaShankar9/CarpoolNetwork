import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { MessageSquare, User, Calendar, ExternalLink, Trash2, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BugReport {
  id: string;
  text: string;
  page: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function FeedbackManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchReports();
  }, [isAdmin, navigate]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('bug_reports')
      .select(`
        id,
        text,
        page,
        created_at,
        user:profiles!bug_reports_user_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load feedback');
      console.error(error);
    } else {
      const formattedData = (data || []).map((report: any) => ({
        ...report,
        user: Array.isArray(report.user) ? report.user[0] : report.user
      }));
      setReports(formattedData);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;

    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', id);

    if (error) {
      setError('Failed to delete feedback');
    } else {
      fetchReports();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="User Feedback"
      subtitle="Bug reports and suggestions from users"
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Feedback</h2>
          <span className="text-sm text-gray-500">{reports.length} reports</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No feedback received yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-900 whitespace-pre-wrap">{report.text}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                      {report.user && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {report.user.full_name} ({report.user.email})
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(report.created_at)}
                      </span>
                      {report.page && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                          {report.page}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Delete feedback"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
