import { useState } from 'react';
import { Shield, Lock, Key, Trash2, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const { error } = await supabase.rpc('delete_user_account', {
        user_id: profile?.id
      });

      if (error) throw error;

      await supabase.auth.signOut();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Profile</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Security Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your account security and privacy</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Active Sessions</h2>
            </div>

            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Current Device</p>
                    <p className="text-sm text-gray-600">Active now</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              You're currently signed in on this device. Sign out to end your session.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 md:p-8 border border-red-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Trash2 className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">Delete Account</h2>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                <li>All your profile data will be permanently deleted</li>
                <li>Your ride history will be removed</li>
                <li>You will lose access to all messages and bookings</li>
                <li>This cannot be reversed</li>
              </ul>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Account?</h3>
            </div>

            <p className="text-gray-700 mb-6">
              Are you absolutely sure you want to delete your account? This action is permanent
              and cannot be undone. All your data will be lost forever.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
