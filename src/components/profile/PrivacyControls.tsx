import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone as PhoneIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface PrivacySettings {
  phone_visible: boolean;
  email_visible: boolean;
  profile_searchable: boolean;
  allow_messages_from: 'anyone' | 'verified' | 'connections';
}

export default function PrivacyControls() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    phone_visible: true,
    email_visible: false,
    profile_searchable: true,
    allow_messages_from: 'anyone'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile?.id) {
      loadPrivacySettings();
    }
  }, [profile?.id]);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('phone_visible, email_visible, profile_searchable, allow_messages_from')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          phone_visible: data.phone_visible ?? true,
          email_visible: data.email_visible ?? false,
          profile_searchable: data.profile_searchable ?? true,
          allow_messages_from: data.allow_messages_from || 'anyone'
        });
      }
    } catch (err) {
      console.error('Error loading privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean | string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile?.id,
          [key]: value
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      setSuccess('Privacy settings updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      console.error('Error updating privacy setting:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Privacy Controls
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage who can see your information
          </p>
        </div>
        {saving && (
          <span className="text-sm text-blue-600">Saving...</span>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 flex-1">
            <PhoneIcon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Show Phone Number</p>
              <p className="text-sm text-gray-600 mt-1">
                Allow other users to see your phone number on your profile
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.phone_visible}
              onChange={(e) => updateSetting('phone_visible', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 flex-1">
            <Mail className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Show Email Address</p>
              <p className="text-sm text-gray-600 mt-1">
                Display your email address on your public profile
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.email_visible}
              onChange={(e) => updateSetting('email_visible', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3 flex-1">
            <Eye className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Profile Searchable</p>
              <p className="text-sm text-gray-600 mt-1">
                Allow your profile to appear in search results and ride matches
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.profile_searchable}
              onChange={(e) => updateSetting('profile_searchable', e.target.checked)}
              disabled={saving}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex items-start gap-3 flex-1">
            <MessageSquare className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Who Can Message You</p>
              <p className="text-sm text-gray-600 mt-1">
                Control who can send you messages
              </p>
            </div>
          </div>
          <select
            value={settings.allow_messages_from}
            onChange={(e) => updateSetting('allow_messages_from', e.target.value)}
            disabled={saving}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
          >
            <option value="anyone">Anyone</option>
            <option value="verified">Verified Users Only</option>
            <option value="connections">Connections Only</option>
          </select>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Some information may still be visible to users you've
          interacted with (e.g., ride partners, chat history). Changing privacy settings
          does not affect past interactions.
        </p>
      </div>
    </div>
  );
}
