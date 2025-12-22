import { useState, useEffect } from 'react';
import { Accessibility, Eye, Volume2, Hand, Vibrate, Keyboard, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AccessibilityPrefs {
  screen_reader_enabled: boolean;
  large_text: boolean;
  high_contrast: boolean;
  reduce_motion: boolean;
  color_blind_mode: string;
  haptic_feedback: boolean;
  voice_commands: boolean;
  keyboard_navigation: boolean;
  captions_enabled: boolean;
  sound_alerts: boolean;
}

export default function AccessibilitySettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [prefs, setPrefs] = useState<AccessibilityPrefs>({
    screen_reader_enabled: false,
    large_text: false,
    high_contrast: false,
    reduce_motion: false,
    color_blind_mode: 'none',
    haptic_feedback: true,
    voice_commands: false,
    keyboard_navigation: true,
    captions_enabled: false,
    sound_alerts: true
  });

  useEffect(() => {
    loadPreferences();
  }, [profile?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setPrefs({
          screen_reader_enabled: data.screen_reader_enabled ?? false,
          large_text: data.large_text ?? false,
          high_contrast: data.high_contrast ?? false,
          reduce_motion: data.reduce_motion ?? false,
          color_blind_mode: data.color_blind_mode || 'none',
          haptic_feedback: data.haptic_feedback ?? true,
          voice_commands: data.voice_commands ?? false,
          keyboard_navigation: data.keyboard_navigation ?? true,
          captions_enabled: data.captions_enabled ?? false,
          sound_alerts: data.sound_alerts ?? true
        });
      }
    } catch (err) {
      console.error('Error loading accessibility preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof AccessibilityPrefs, value: any) => {
    try {
      setError('');

      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: profile?.id,
            [key]: value
          },
          { onConflict: 'user_id' }
        );

      if (updateError) throw updateError;

      setPrefs({ ...prefs, [key]: value });
      setSuccess('Accessibility settings updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
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

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Accessibility className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Accessibility First</h3>
            <p className="text-sm text-blue-800">
              We're committed to making our app accessible to everyone. These settings help customize your experience.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-6 h-6" />
          Visual Accessibility
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Screen Reader Support</p>
              <p className="text-sm text-gray-500">Enhanced compatibility with screen readers</p>
            </div>
            <button
              onClick={() => updatePreference('screen_reader_enabled', !prefs.screen_reader_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.screen_reader_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.screen_reader_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Large Text</p>
              <p className="text-sm text-gray-500">Increase text size across the app</p>
            </div>
            <button
              onClick={() => updatePreference('large_text', !prefs.large_text)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.large_text ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.large_text ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">High Contrast Mode</p>
              <p className="text-sm text-gray-500">Increase color contrast for better visibility</p>
            </div>
            <button
              onClick={() => updatePreference('high_contrast', !prefs.high_contrast)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.high_contrast ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.high_contrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Reduce Motion</p>
              <p className="text-sm text-gray-500">Minimize animations and transitions</p>
            </div>
            <button
              onClick={() => updatePreference('reduce_motion', !prefs.reduce_motion)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.reduce_motion ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.reduce_motion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color Blind Mode
            </label>
            <select
              value={prefs.color_blind_mode}
              onChange={(e) => updatePreference('color_blind_mode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia (Red-Green)</option>
              <option value="deuteranopia">Deuteranopia (Red-Green)</option>
              <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
              <option value="monochromacy">Monochromacy (Grayscale)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Volume2 className="w-6 h-6" />
          Audio & Feedback
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Sound Alerts</p>
              <p className="text-sm text-gray-500">Play sounds for important notifications</p>
            </div>
            <button
              onClick={() => updatePreference('sound_alerts', !prefs.sound_alerts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.sound_alerts ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.sound_alerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Captions</p>
              <p className="text-sm text-gray-500">Show captions for audio content</p>
            </div>
            <button
              onClick={() => updatePreference('captions_enabled', !prefs.captions_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.captions_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.captions_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Voice Commands</p>
              <p className="text-sm text-gray-500">Control the app with voice</p>
            </div>
            <button
              onClick={() => updatePreference('voice_commands', !prefs.voice_commands)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.voice_commands ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.voice_commands ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Hand className="w-6 h-6" />
          Interaction
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Haptic Feedback</p>
              <p className="text-sm text-gray-500">Vibrate on touch interactions</p>
            </div>
            <button
              onClick={() => updatePreference('haptic_feedback', !prefs.haptic_feedback)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.haptic_feedback ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.haptic_feedback ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Keyboard Navigation</p>
              <p className="text-sm text-gray-500">Navigate using keyboard shortcuts</p>
            </div>
            <button
              onClick={() => updatePreference('keyboard_navigation', !prefs.keyboard_navigation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.keyboard_navigation ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs.keyboard_navigation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
