import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, Shield, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AllowlistEntry{
  email: string;
  added_at: string;
  added_by: string | null;
}

export default function BetaManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchAllowlist();
  }, [isAdmin, navigate]);

  const fetchAllowlist = async () => {
    const { data, error } = await supabase
      .from('beta_allowlist')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      setError('Failed to load allowlist');
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.from('beta_allowlist').insert({
      email: newEmail.toLowerCase().trim(),
      added_by: user?.email
    });

    if (error) {
      if (error.code === '23505') {
        setError('This email is already in the allowlist');
      } else {
        setError('Failed to add email: ' + error.message);
      }
    } else {
      setSuccess(`${newEmail} added to allowlist`);
      setNewEmail('');
      fetchAllowlist();
    }
    setAdding(false);
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from the allowlist?`)) return;

    const { error } = await supabase
      .from('beta_allowlist')
      .delete()
      .eq('email', email);

    if (error) {
      setError('Failed to remove email: ' + error.message);
    } else {
      setSuccess(`${email} removed from allowlist`);
      fetchAllowlist();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <Link
            to="/admin"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Beta Access Management</h1>
            <p className="text-gray-600">Manage who can sign up during private beta</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Email to Allowlist</h2>
          <form onSubmit={handleAddEmail} className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Allowlist</h2>
            </div>
            <span className="text-sm text-gray-500">{entries.length} emails</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No emails in allowlist yet. Add emails above to allow signups.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <div
                  key={entry.email}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{entry.email}</p>
                    <p className="text-sm text-gray-500">
                      Added {new Date(entry.added_at).toLocaleDateString()}
                      {entry.added_by && ` by ${entry.added_by}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(entry.email)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove from allowlist"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
