import React from 'react';
import { Music, Volume2, VolumeX, Radio, Headphones } from 'lucide-react';

type MusicPreference = 'any' | 'quiet' | 'my_choice' | 'passenger_choice';

interface MusicPreferencesProps {
    value: MusicPreference;
    onChange: (value: MusicPreference) => void;
    disabled?: boolean;
}

export const MusicPreferences: React.FC<MusicPreferencesProps> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const options: { value: MusicPreference; label: string; description: string; icon: React.ReactNode }[] = [
        {
            value: 'any',
            label: 'Any Music',
            description: "I'm flexible with music choices",
            icon: <Music className="w-5 h-5" />
        },
        {
            value: 'quiet',
            label: 'Quiet Ride',
            description: 'Prefer no music or very low volume',
            icon: <VolumeX className="w-5 h-5" />
        },
        {
            value: 'my_choice',
            label: "Driver's Choice",
            description: 'Driver picks the tunes',
            icon: <Radio className="w-5 h-5" />
        },
        {
            value: 'passenger_choice',
            label: "Passenger's Choice",
            description: 'Passengers can suggest music',
            icon: <Headphones className="w-5 h-5" />
        },
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Music Preferences</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">What's your vibe?</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map(option => (
                    <button
                        key={option.value}
                        onClick={() => !disabled && onChange(option.value)}
                        disabled={disabled}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${value === option.value
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className={`p-2 rounded-lg ${value === option.value
                                ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                            {option.icon}
                        </div>
                        <div className="flex-1">
                            <div className={`font-medium ${value === option.value
                                    ? 'text-purple-700 dark:text-purple-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                {option.label}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {option.description}
                            </div>
                        </div>
                        {value === option.value && (
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface MusicPreferenceBadgeProps {
    preference: MusicPreference;
    size?: 'sm' | 'md';
}

export const MusicPreferenceBadge: React.FC<MusicPreferenceBadgeProps> = ({
    preference,
    size = 'md',
}) => {
    const configs: Record<MusicPreference, { label: string; icon: React.ReactNode; color: string }> = {
        any: { label: 'Any Music', icon: <Music className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />, color: 'purple' },
        quiet: { label: 'Quiet', icon: <VolumeX className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />, color: 'gray' },
        my_choice: { label: "Driver's Pick", icon: <Radio className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />, color: 'blue' },
        passenger_choice: { label: "Your Pick", icon: <Headphones className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />, color: 'green' },
    };

    const config = configs[preference];
    const colorClasses: Record<string, string> = {
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    };

    return (
        <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            } rounded-full ${colorClasses[config.color]}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

export default MusicPreferences;
