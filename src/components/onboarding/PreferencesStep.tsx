import React, { useState } from 'react';
import { Settings, ArrowRight, Music, MessageCircle, Wind } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

interface PreferencesStepProps {
  onNext: () => void;
}

export default function PreferencesStep({ onNext }: PreferencesStepProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    smoking_policy: 'no_smoking',
    pets_allowed: false,
    music_preference: 'flexible',
    conversation_level: 'moderate'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(preferences)
        .eq('id', user.id);

      if (error) throw error;
      onNext();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-3">
          <Settings className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Set Your Preferences
        </h3>
        <p className="text-gray-600">
          Help us match you with compatible travelers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Wind className="w-5 h-5 text-gray-400" />
            Smoking Policy
          </label>
          <div className="space-y-2">
            {[
              { value: 'no_smoking', label: 'No Smoking' },
              { value: 'outside_only', label: 'Outside Vehicle Only' },
              { value: 'allowed', label: 'Smoking Allowed' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="smoking_policy"
                  value={option.value}
                  checked={preferences.smoking_policy === option.value}
                  onChange={(e) => setPreferences({ ...preferences, smoking_policy: e.target.value })}
                  className="w-4 h-4 text-green-600"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pets Allowed
          </label>
          <div className="flex gap-4">
            <label className="flex-1 flex items-center justify-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="pets_allowed"
                checked={preferences.pets_allowed === true}
                onChange={() => setPreferences({ ...preferences, pets_allowed: true })}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-900">Yes</span>
            </label>
            <label className="flex-1 flex items-center justify-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="pets_allowed"
                checked={preferences.pets_allowed === false}
                onChange={() => setPreferences({ ...preferences, pets_allowed: false })}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-900">No</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Music className="w-5 h-5 text-gray-400" />
            Music Preference
          </label>
          <select
            value={preferences.music_preference}
            onChange={(e) => setPreferences({ ...preferences, music_preference: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="no_music">No Music</option>
            <option value="quiet">Quiet Background Music</option>
            <option value="flexible">Flexible</option>
            <option value="upbeat">Upbeat Music</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            Conversation Level
          </label>
          <select
            value={preferences.conversation_level}
            onChange={(e) => setPreferences({ ...preferences, conversation_level: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="quiet">Prefer Quiet</option>
            <option value="moderate">Moderate Chat</option>
            <option value="chatty">Love to Chat</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
        >
          {loading ? 'Saving...' : 'Continue'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}