import { Shield, Lock, Smartphone, History, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PrivacyControls from '../profile/PrivacyControls';
import TwoFactorAuth from '../security/TwoFactorAuth';

export default function PrivacySettings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          Password & Authentication
        </h2>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/security')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </div>
            <span className="text-blue-600">→</span>
          </button>
        </div>
      </div>

      <TwoFactorAuth />

      <PrivacyControls />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-6 h-6" />
          Account Activity
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Monitor your account activity and manage active sessions
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Current Device</p>
                <p className="text-sm text-gray-500">Last active: Just now</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Security Recommendation</h3>
            <p className="text-sm text-red-800">
              Enable two-factor authentication and keep your recovery options up to date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
