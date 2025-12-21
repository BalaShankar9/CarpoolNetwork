import { useState, useEffect } from 'react';
import { Fingerprint, Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { registerPasskey, getPasskeys, deletePasskey, isPasskeySupported } from '../../services/passkeyService';

interface Passkey {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string;
}

export default function PasskeyManagement() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isPasskeySupported());
    if (isPasskeySupported()) {
      loadPasskeys();
    } else {
      setLoading(false);
    }
  }, []);

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      const data = await getPasskeys();
      setPasskeys(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setError('');
    setSuccess('');
    setRegistering(true);

    try {
      await registerPasskey(deviceName);
      setSuccess('Passkey registered successfully!');
      setShowAddForm(false);
      setDeviceName('');
      await loadPasskeys();
    } catch (err: any) {
      setError(err.message || 'Failed to register passkey');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this passkey?')) {
      return;
    }

    try {
      await deletePasskey(id);
      setSuccess('Passkey removed successfully');
      await loadPasskeys();
    } catch (err: any) {
      setError(err.message || 'Failed to remove passkey');
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Passkeys Not Supported</h3>
            <p className="text-sm text-gray-600">
              Your browser doesn't support passkeys. Please use a modern browser like Chrome, Safari, or Edge to use this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Fingerprint className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Passkeys</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage your passkeys for quick and secure sign-in
            </p>
          </div>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Passkey
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleRegister} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Register New Passkey</h4>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., iPhone, MacBook, Work Laptop"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={registering}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={registering}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {registering ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </span>
              ) : (
                'Register Passkey'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setDeviceName('');
                setError('');
              }}
              disabled={registering}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {passkeys.length === 0 ? (
        <div className="text-center py-8">
          <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No passkeys registered</p>
          <p className="text-sm text-gray-500">
            Add a passkey to sign in quickly and securely without a password
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{passkey.device_name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Created {new Date(passkey.created_at).toLocaleDateString()}
                </p>
                {passkey.last_used_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last used {new Date(passkey.last_used_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(passkey.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What are passkeys?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sign in with your fingerprint, face, or device PIN</li>
          <li>• More secure than passwords - protected by your device</li>
          <li>• Works across all your devices that support passkeys</li>
          <li>• No passwords to remember or type</li>
        </ul>
      </div>
    </div>
  );
}
