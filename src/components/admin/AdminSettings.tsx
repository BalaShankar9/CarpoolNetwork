import React, { useState } from 'react';
import {
  Shield,
  Bell,
  Zap,
  Save,
  AlertCircle
} from 'lucide-react';

interface PlatformSettings {
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  ridesEnabled: boolean;
  verificationRequired: boolean;
  minTrustScore: number;
  maxCancellationRate: number;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    signupsEnabled: true,
    ridesEnabled: true,
    verificationRequired: true,
    minTrustScore: 50,
    maxCancellationRate: 20
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
          <p className="text-gray-600">Configure platform-wide settings and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            saved
              ? 'bg-green-600 text-white'
              : saving
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? (
            <>
              <AlertCircle className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Platform Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-600">Disable platform access for maintenance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">New Signups</p>
                <p className="text-sm text-gray-600">Allow new user registrations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.signupsEnabled}
                  onChange={(e) => setSettings({ ...settings, signupsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Ride Posting</p>
                <p className="text-sm text-gray-600">Allow users to post new rides</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ridesEnabled}
                  onChange={(e) => setSettings({ ...settings, ridesEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Security & Trust</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Verification Required</p>
                <p className="text-sm text-gray-600">Require ID verification for drivers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.verificationRequired}
                  onChange={(e) => setSettings({ ...settings, verificationRequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Minimum Trust Score
              </label>
              <input
                type="number"
                value={settings.minTrustScore}
                onChange={(e) => setSettings({ ...settings, minTrustScore: parseInt(e.target.value) })}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-sm text-gray-600 mt-1">
                Minimum trust score required to post rides (0-100)
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Max Cancellation Rate (%)
              </label>
              <input
                type="number"
                value={settings.maxCancellationRate}
                onChange={(e) => setSettings({ ...settings, maxCancellationRate: parseInt(e.target.value) })}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-sm text-gray-600 mt-1">
                Maximum allowed cancellation rate before restrictions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                Configure notification preferences and channels in the Communication Center
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Important Notice</h4>
            <p className="text-sm text-yellow-800">
              Changes to these settings take effect immediately. Use caution when modifying platform-wide
              settings as they affect all users. Consider notifying users before enabling maintenance mode
              or disabling critical features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
