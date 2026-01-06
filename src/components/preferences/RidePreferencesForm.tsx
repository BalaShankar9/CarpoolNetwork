import React, { useState, useEffect } from 'react';
import {
    Music,
    MessageSquare,
    Volume2,
    VolumeX,
    Cigarette,
    Dog,
    Baby,
    Snowflake,
    Sun,
    Check,
    Info,
    Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface RidePreferences {
    id?: string;
    user_id: string;
    music_preference: 'any' | 'quiet' | 'my_choice' | 'passenger_choice';
    conversation_preference: 'chatty' | 'some' | 'quiet';
    smoking_allowed: boolean;
    pets_allowed: boolean;
    children_friendly: boolean;
    ac_preference: 'on' | 'off' | 'no_preference';
    max_detour_minutes: number;
    luggage_space: 'small' | 'medium' | 'large' | 'none';
    updated_at?: string;
}

const DEFAULT_PREFERENCES: Omit<RidePreferences, 'user_id'> = {
    music_preference: 'any',
    conversation_preference: 'some',
    smoking_allowed: false,
    pets_allowed: true,
    children_friendly: true,
    ac_preference: 'no_preference',
    max_detour_minutes: 10,
    luggage_space: 'medium',
};

interface RidePreferencesFormProps {
    onSave?: (preferences: RidePreferences) => void;
    compact?: boolean;
}

export const RidePreferencesForm: React.FC<RidePreferencesFormProps> = ({
    onSave,
    compact = false,
}) => {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<Omit<RidePreferences, 'user_id'>>(DEFAULT_PREFERENCES);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadPreferences = async () => {
            try {
                const { data, error } = await supabase
                    .from('ride_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    setPreferences(data);
                }
            } catch (err) {
                console.error('Failed to load preferences:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPreferences();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setSaved(false);

        try {
            const { data, error } = await supabase
                .from('ride_preferences')
                .upsert({
                    user_id: user.id,
                    ...preferences,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);

            if (onSave && data) {
                onSave(data);
            }
        } catch (err) {
            console.error('Failed to save preferences:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className={`space-y-${compact ? '4' : '6'}`}>
            {/* Music Preference */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Music className="w-5 h-5 text-purple-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Music</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: 'any', label: 'Any music is fine', icon: '🎵' },
                        { value: 'quiet', label: 'Prefer quiet', icon: '🔇' },
                        { value: 'my_choice', label: "Driver's choice", icon: '🎧' },
                        { value: 'passenger_choice', label: "Passenger's choice", icon: '🎤' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setPreferences(prev => ({ ...prev, music_preference: option.value as RidePreferences['music_preference'] }))}
                            className={`p-3 rounded-lg text-sm text-left transition-colors ${preferences.music_preference === option.value
                                    ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 text-purple-700 dark:text-purple-400'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span className="mr-2">{option.icon}</span>
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conversation Preference */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Conversation</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { value: 'chatty', label: 'Love to chat', icon: '💬', desc: "I'm chatty" },
                        { value: 'some', label: 'Some chat', icon: '🙂', desc: 'Occasional chat' },
                        { value: 'quiet', label: 'Quiet ride', icon: '🤫', desc: 'Prefer silence' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setPreferences(prev => ({ ...prev, conversation_preference: option.value as RidePreferences['conversation_preference'] }))}
                            className={`p-3 rounded-lg text-center transition-colors ${preferences.conversation_preference === option.value
                                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-400'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-xs font-medium">{option.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Ride Rules</h3>

                {[
                    { key: 'smoking_allowed', label: 'Smoking allowed', icon: Cigarette, color: 'red' },
                    { key: 'pets_allowed', label: 'Pets welcome', icon: Dog, color: 'amber' },
                    { key: 'children_friendly', label: 'Children friendly', icon: Baby, color: 'pink' },
                ].map(toggle => {
                    const Icon = toggle.icon;
                    const isEnabled = preferences[toggle.key as keyof typeof preferences] as boolean;

                    return (
                        <div key={toggle.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 text-${toggle.color}-500`} />
                                <span className="text-gray-700 dark:text-gray-300">{toggle.label}</span>
                            </div>
                            <button
                                onClick={() => setPreferences(prev => ({ ...prev, [toggle.key]: !isEnabled }))}
                                className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* AC Preference */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Snowflake className="w-5 h-5 text-cyan-500" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Air Conditioning</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { value: 'on', label: 'AC On', icon: Snowflake },
                        { value: 'off', label: 'Windows Open', icon: Sun },
                        { value: 'no_preference', label: 'No Preference', icon: null },
                    ].map(option => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                onClick={() => setPreferences(prev => ({ ...prev, ac_preference: option.value as RidePreferences['ac_preference'] }))}
                                className={`p-3 rounded-lg text-center transition-colors ${preferences.ac_preference === option.value
                                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border-2 border-cyan-500 text-cyan-700 dark:text-cyan-400'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {Icon && <Icon className="w-5 h-5 mx-auto mb-1" />}
                                <div className="text-xs font-medium">{option.label}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Max Detour */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">Maximum Detour</h3>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {preferences.max_detour_minutes} min
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={preferences.max_detour_minutes}
                    onChange={e => setPreferences(prev => ({ ...prev, max_detour_minutes: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0 min</span>
                    <span>15 min</span>
                    <span>30 min</span>
                </div>
            </div>

            {/* Luggage Space */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Luggage Space Available</h3>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { value: 'none', label: 'None', icon: '❌' },
                        { value: 'small', label: 'Small', icon: '🎒' },
                        { value: 'medium', label: 'Medium', icon: '💼' },
                        { value: 'large', label: 'Large', icon: '🧳' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setPreferences(prev => ({ ...prev, luggage_space: option.value as RidePreferences['luggage_space'] }))}
                            className={`p-2 rounded-lg text-center transition-colors ${preferences.luggage_space === option.value
                                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-400'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <div className="text-xl mb-1">{option.icon}</div>
                            <div className="text-xs font-medium">{option.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${saved
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
            >
                {isSaving ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                    </>
                ) : saved ? (
                    <>
                        <Check className="w-5 h-5" />
                        Saved!
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5" />
                        Save Preferences
                    </>
                )}
            </button>
        </div>
    );
};

export default RidePreferencesForm;
