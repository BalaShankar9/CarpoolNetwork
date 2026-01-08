import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Trash2, Users, Shield, LayoutDashboard } from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AllowlistEntry {
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

  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleRemoveEmail = async (email: string) => {
    setDeleteConfirmEmail(email);
  };

  const confirmRemoveEmail = async () => {
    if (!deleteConfirmEmail) return;
    setDeleting(true);
    const { error } = await supabase
      .from('beta_allowlist')
      .delete()
      .eq('email', deleteConfirmEmail);

    if (error) {
      setError('Failed to remove email: ' + error.message);
    } else {
      setSuccess(`${deleteConfirmEmail} removed from allowlist`);
      fetchAllowlist();
    }
    setDeleting(false);
    setDeleteConfirmEmail(null);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Beta Access Management"
      subtitle="Manage who can sign up during private beta"
    >
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmEmail}
        onClose={() => setDeleteConfirmEmail(null)}
        onConfirm={confirmRemoveEmail}
        title="Remove from Allowlist"
        message={`Are you sure you want to remove ${deleteConfirmEmail} from the beta allowlist?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}
