import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, MessageSquare, Smartphone, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface NotificationPrefs {
  ride_notifications: boolean;
  message_notifications: boolean;
  system_notifications: boolean;
  social_notifications: boolean;
  challenge_notifications: boolean;
  dnd_enabled: boolean;
  dnd_start_time: string;
  dnd_end_time: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export default function NotificationSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ride_notifications: true,
    message_notifications: true,
    system_notifications: true,
    social_notifications: true,
    challenge_notifications: true,
    dnd_enabled: false,
    dnd_start_time: '22:00',
    dnd_end_time: '08:00',
    push_enabled: false,
    email_enabled: true,
    sms_enabled: false
  });

  useEffect(() => {
    loadPreferences();
  }, [profile?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setPrefs({
          ride_notifications: data.ride_notifications ?? true,
          message_notifications: data.message_notifications ?? true,
          system_notifications: data.system_notifications ?? true,
          social_notifications: data.social_notifications ?? true,
          challenge_notifications: data.challenge_notifications ?? true,
          dnd_enabled: data.dnd_enabled ?? false,
          dnd_start_time: data.dnd_start_time || '22:00',
          dnd_end_time: data.dnd_end_time || '08:00',
          push_enabled: data.push_enabled ?? false,
          email_enabled: data.email_enabled ?? true,
          sms_enabled: data.sms_enabled ?? false
        });
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPrefs, value: boolean | string) => {
    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: profile?.id,
            [key]: value,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (updateError) throw updateError;

      setPrefs({ ...prefs, [key]: value });
      setSuccess('Notification preferences updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notification Channels
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Choose how you want to receive notifications
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications on your device</p>
              </div>
            </div>
            <button
              onClick={() => updatePreference('push_enabled', !prefs.push_enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.push_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <button
              onClick={() => updatePreference('email_enabled', !prefs.email_enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.email_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
            </div>
            <button
              onClick={() => updatePreference('sms_enabled', !prefs.sms_enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.sms_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.sms_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Categories</h2>
        <p className="text-sm text-gray-600 mb-6">
          Control which types of notifications you receive
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Ride Notifications</p>
              <p className="text-sm text-gray-500">Bookings, cancellations, and ride updates</p>
            </div>
            <button
              onClick={() => updatePreference('ride_notifications', !prefs.ride_notifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.ride_notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.ride_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Message Notifications</p>
              <p className="text-sm text-gray-500">New messages and chat updates</p>
            </div>
            <button
              onClick={() => updatePreference('message_notifications', !prefs.message_notifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.message_notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.message_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Social Notifications</p>
              <p className="text-sm text-gray-500">Friend requests, reviews, and ratings</p>
            </div>
            <button
              onClick={() => updatePreference('social_notifications', !prefs.social_notifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.social_notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.social_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Challenge Notifications</p>
              <p className="text-sm text-gray-500">Achievements, leaderboards, and challenges</p>
            </div>
            <button
              onClick={() => updatePreference('challenge_notifications', !prefs.challenge_notifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.challenge_notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.challenge_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">System Notifications</p>
              <p className="text-sm text-gray-500">App updates and important announcements</p>
            </div>
            <button
              onClick={() => updatePreference('system_notifications', !prefs.system_notifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.system_notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.system_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Do Not Disturb
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Set quiet hours to pause non-urgent notifications
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Enable Do Not Disturb</p>
              <p className="text-sm text-gray-500">Mute notifications during specific hours</p>
            </div>
            <button
              onClick={() => updatePreference('dnd_enabled', !prefs.dnd_enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.dnd_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.dnd_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {prefs.dnd_enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={prefs.dnd_start_time}
                  onChange={(e) => updatePreference('dnd_start_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={prefs.dnd_end_time}
                  onChange={(e) => updatePreference('dnd_end_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
