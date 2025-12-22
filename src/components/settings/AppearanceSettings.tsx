import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Type, Ruler, Thermometer, Clock, Map, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AppearancePrefs {
  theme: 'light' | 'dark' | 'auto';
  font_size: 'small' | 'medium' | 'large';
  distance_unit: 'km' | 'miles';
  temperature_unit: 'celsius' | 'fahrenheit';
  time_format: '12h' | '24h';
  date_format: 'DMY' | 'MDY' | 'YMD';
  map_style: 'standard' | 'satellite' | 'terrain';
  reduce_motion: boolean;
  high_contrast: boolean;
}

export default function AppearanceSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [prefs, setPrefs] = useState<AppearancePrefs>({
    theme: 'light',
    font_size: 'medium',
    distance_unit: 'km',
    temperature_unit: 'celsius',
    time_format: '24h',
    date_format: 'DMY',
    map_style: 'standard',
    reduce_motion: false,
    high_contrast: false
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
          theme: (data.theme as any) || 'light',
          font_size: (data.font_size as any) || 'medium',
          distance_unit: (data.distance_unit as any) || 'km',
          temperature_unit: (data.temperature_unit as any) || 'celsius',
          time_format: (data.time_format as any) || '24h',
          date_format: (data.date_format as any) || 'DMY',
          map_style: (data.map_style as any) || 'standard',
          reduce_motion: data.reduce_motion ?? false,
          high_contrast: data.high_contrast ?? false
        });
      }
    } catch (err) {
      console.error('Error loading appearance preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof AppearancePrefs, value: any) => {
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
      setSuccess('Appearance settings updated');
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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sun className="w-6 h-6" />
          Theme
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Choose your preferred color scheme
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => updatePreference('theme', 'light')}
            className={`p-4 rounded-lg border-2 transition-all ${
              prefs.theme === 'light'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sun className={`w-6 h-6 mx-auto mb-2 ${prefs.theme === 'light' ? 'text-blue-600' : 'text-gray-600'}`} />
            <p className={`text-sm font-medium ${prefs.theme === 'light' ? 'text-blue-900' : 'text-gray-900'}`}>
              Light
            </p>
          </button>

          <button
            onClick={() => updatePreference('theme', 'dark')}
            className={`p-4 rounded-lg border-2 transition-all ${
              prefs.theme === 'dark'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Moon className={`w-6 h-6 mx-auto mb-2 ${prefs.theme === 'dark' ? 'text-blue-600' : 'text-gray-600'}`} />
            <p className={`text-sm font-medium ${prefs.theme === 'dark' ? 'text-blue-900' : 'text-gray-900'}`}>
              Dark
            </p>
          </button>

          <button
            onClick={() => updatePreference('theme', 'auto')}
            className={`p-4 rounded-lg border-2 transition-all ${
              prefs.theme === 'auto'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Monitor className={`w-6 h-6 mx-auto mb-2 ${prefs.theme === 'auto' ? 'text-blue-600' : 'text-gray-600'}`} />
            <p className={`text-sm font-medium ${prefs.theme === 'auto' ? 'text-blue-900' : 'text-gray-900'}`}>
              Auto
            </p>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Type className="w-6 h-6" />
          Display
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => updatePreference('font_size', size)}
                  className={`p-3 rounded-lg border-2 transition-all capitalize ${
                    prefs.font_size === size
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-gray-100">
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

          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="font-medium text-gray-900">High Contrast</p>
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Ruler className="w-6 h-6" />
          Units & Formats
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Distance Unit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updatePreference('distance_unit', 'km')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.distance_unit === 'km'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                Kilometers (km)
              </button>
              <button
                onClick={() => updatePreference('distance_unit', 'miles')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.distance_unit === 'miles'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                Miles (mi)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Temperature Unit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updatePreference('temperature_unit', 'celsius')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.temperature_unit === 'celsius'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                Celsius (°C)
              </button>
              <button
                onClick={() => updatePreference('temperature_unit', 'fahrenheit')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.temperature_unit === 'fahrenheit'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                Fahrenheit (°F)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Time Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updatePreference('time_format', '12h')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.time_format === '12h'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                12-hour (2:30 PM)
              </button>
              <button
                onClick={() => updatePreference('time_format', '24h')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.time_format === '24h'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                24-hour (14:30)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Date Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => updatePreference('date_format', 'DMY')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.date_format === 'DMY'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                DD/MM/YYYY
              </button>
              <button
                onClick={() => updatePreference('date_format', 'MDY')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.date_format === 'MDY'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                MM/DD/YYYY
              </button>
              <button
                onClick={() => updatePreference('date_format', 'YMD')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  prefs.date_format === 'YMD'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
              >
                YYYY/MM/DD
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Map className="w-6 h-6" />
          Map Style
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {['standard', 'satellite', 'terrain'].map((style) => (
            <button
              key={style}
              onClick={() => updatePreference('map_style', style)}
              className={`p-4 rounded-lg border-2 transition-all capitalize ${
                prefs.map_style === style
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-900'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
