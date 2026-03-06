import { useState, useEffect } from 'react';
import { Download, Trash2, Database, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function DataSettings() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleExportData = async () => {
    if (!profile?.id) {
      setError('Unable to verify your account. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      const { data: ridesData } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', profile.id);

      const { data: bookingsData } = await supabase
        .from('ride_bookings')
        .select('*')
        .eq('passenger_id', profile.id);

      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', profile.id);

      const { data: preferencesData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      const exportData = {
        profile: profileData,
        rides: ridesData,
        bookings: bookingsData,
        vehicles: vehiclesData,
        preferences: preferencesData,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carpool-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Your data has been exported successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    if (!profile?.id) {
      setError('Unable to verify your account. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error: deleteError } = await supabase.rpc('delete_user_account', {
        user_id: profile.id
      });

      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-6 h-6" />
          Export Your Data
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Download a copy of all your data including profile, rides, bookings, and preferences in JSON format.
        </p>

        <button
          onClick={handleExportData}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {loading ? 'Exporting...' : 'Export All Data'}
        </button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>GDPR Compliance:</strong> You have the right to access and download your personal data at any time.
            This export includes all data associated with your account.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Local Storage
        </h2>

        <p className="text-gray-500 text-sm">
          Clear locally cached data from your browser. This will not affect your account data stored on our servers.
        </p>

        <button
          onClick={() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              setSuccess('Local cache cleared successfully');
            } catch {
              setError('Failed to clear cache');
            }
          }}
          className="w-full mt-4 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <HardDrive className="w-5 h-5" />
          Clear Cache
        </button>
      </div>

      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
          <Trash2 className="w-6 h-6" />
          Delete Account
        </h2>

        {!showDeleteConfirm ? (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete My Account
            </button>
          </>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Export your data first</h3>
                  <p className="text-sm text-amber-800">
                    We recommend downloading a copy of your data before deleting your account.
                    Once deleted, your data cannot be recovered.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={loading}
                    className="mt-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {loading ? 'Exporting...' : 'Export My Data'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Warning: This action is permanent!</h3>
                  <p className="text-sm text-red-800">
                    Deleting your account will:
                  </p>
                  <ul className="text-sm text-red-800 list-disc list-inside mt-2 space-y-1">
                    <li>Permanently delete your profile and personal information</li>
                    <li>Cancel all active bookings and rides</li>
                    <li>Remove your reviews and ratings</li>
                    <li>Delete your chat history</li>
                    <li>Remove you from all challenges and leaderboards</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3 font-medium">
              Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">DELETE MY ACCOUNT</span> to confirm:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type here..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Deleting...' : 'Confirm Delete Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
