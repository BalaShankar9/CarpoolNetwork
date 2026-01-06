import React from 'react';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    Music,
    MessageSquare,
    Cigarette,
    Dog,
    Baby,
    Snowflake,
    Briefcase,
    Clock,
    Sparkles
} from 'lucide-react';
import type { RidePreferences } from './RidePreferencesForm';

interface PreferenceMatchIndicatorProps {
    userPreferences: RidePreferences;
    ridePreferences: RidePreferences;
    showDetails?: boolean;
}

interface MatchResult {
    key: string;
    label: string;
    icon: React.ReactNode;
    status: 'match' | 'compatible' | 'mismatch';
    userValue: string;
    rideValue: string;
}

export const PreferenceMatchIndicator: React.FC<PreferenceMatchIndicatorProps> = ({
    userPreferences,
    ridePreferences,
    showDetails = true,
}) => {
    const matchResults: MatchResult[] = [];

    // Music preference matching
    const musicMatch =
        userPreferences.music_preference === ridePreferences.music_preference ||
        userPreferences.music_preference === 'any' ||
        ridePreferences.music_preference === 'any';

    matchResults.push({
        key: 'music',
        label: 'Music',
        icon: <Music className="w-4 h-4" />,
        status: musicMatch ? 'match' : 'mismatch',
        userValue: formatMusicPref(userPreferences.music_preference),
        rideValue: formatMusicPref(ridePreferences.music_preference),
    });

    // Conversation preference matching
    const convDiff = Math.abs(
        getConvScore(userPreferences.conversation_preference) -
        getConvScore(ridePreferences.conversation_preference)
    );

    matchResults.push({
        key: 'conversation',
        label: 'Chat',
        icon: <MessageSquare className="w-4 h-4" />,
        status: convDiff === 0 ? 'match' : convDiff === 1 ? 'compatible' : 'mismatch',
        userValue: formatConvPref(userPreferences.conversation_preference),
        rideValue: formatConvPref(ridePreferences.conversation_preference),
    });

    // Smoking
    if (!userPreferences.smoking_allowed && ridePreferences.smoking_allowed) {
        matchResults.push({
            key: 'smoking',
            label: 'Smoking',
            icon: <Cigarette className="w-4 h-4" />,
            status: 'mismatch',
            userValue: 'No smoking',
            rideValue: 'Smoking allowed',
        });
    } else {
        matchResults.push({
            key: 'smoking',
            label: 'Smoking',
            icon: <Cigarette className="w-4 h-4" />,
            status: 'match',
            userValue: userPreferences.smoking_allowed ? 'OK' : 'No',
            rideValue: ridePreferences.smoking_allowed ? 'Allowed' : 'Not allowed',
        });
    }

    // Pets
    if (userPreferences.pets_allowed && !ridePreferences.pets_allowed) {
        matchResults.push({
            key: 'pets',
            label: 'Pets',
            icon: <Dog className="w-4 h-4" />,
            status: 'mismatch',
            userValue: 'With pet',
            rideValue: 'No pets',
        });
    }

    // Children
    if (userPreferences.children_friendly && !ridePreferences.children_friendly) {
        matchResults.push({
            key: 'children',
            label: 'Children',
            icon: <Baby className="w-4 h-4" />,
            status: 'mismatch',
            userValue: 'With child',
            rideValue: 'Not child-friendly',
        });
    }

    // AC
    if (
        userPreferences.ac_preference !== 'no_preference' &&
        ridePreferences.ac_preference !== 'no_preference' &&
        userPreferences.ac_preference !== ridePreferences.ac_preference
    ) {
        matchResults.push({
            key: 'ac',
            label: 'AC',
            icon: <Snowflake className="w-4 h-4" />,
            status: 'compatible',
            userValue: formatACPref(userPreferences.ac_preference),
            rideValue: formatACPref(ridePreferences.ac_preference),
        });
    }

    // Calculate overall score
    const matches = matchResults.filter(r => r.status === 'match').length;
    const compatible = matchResults.filter(r => r.status === 'compatible').length;
    const mismatches = matchResults.filter(r => r.status === 'mismatch').length;

    const score = Math.round(
        ((matches * 1 + compatible * 0.7) / matchResults.length) * 100
    );

    const getOverallStatus = () => {
        if (score >= 80) return { label: 'Great Match', color: 'green', icon: <Sparkles className="w-4 h-4" /> };
        if (score >= 60) return { label: 'Good Match', color: 'blue', icon: <CheckCircle className="w-4 h-4" /> };
        if (score >= 40) return { label: 'Some Differences', color: 'amber', icon: <AlertCircle className="w-4 h-4" /> };
        return { label: 'Different Preferences', color: 'red', icon: <XCircle className="w-4 h-4" /> };
    };

    const overall = getOverallStatus();

    const colorClasses: Record<string, string> = {
        green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    };

    if (!showDetails) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${colorClasses[overall.color]}`}>
                {overall.icon}
                {score}% {overall.label}
            </div>
        );
    }

    return (
        <div className={`rounded-xl border ${colorClasses[overall.color]} overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-current/10">
                <div className="flex items-center gap-2">
                    {overall.icon}
                    <span className="font-medium">{overall.label}</span>
                </div>
                <div className="text-lg font-bold">{score}%</div>
            </div>

            {/* Details */}
            <div className="p-3 space-y-2 bg-white/50 dark:bg-gray-900/50">
                {matchResults.map(result => (
                    <div key={result.key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            {result.icon}
                            <span>{result.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {result.status === 'match' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {result.status === 'compatible' && (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            {result.status === 'mismatch' && (
                                <XCircle className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper functions
function formatMusicPref(pref: string): string {
    const map: Record<string, string> = {
        any: 'Any music',
        quiet: 'Quiet',
        my_choice: "Driver's choice",
        passenger_choice: "Passenger's choice",
    };
    return map[pref] || pref;
}

function formatConvPref(pref: string): string {
    const map: Record<string, string> = {
        chatty: 'Chatty',
        some: 'Moderate',
        quiet: 'Quiet',
    };
    return map[pref] || pref;
}

function formatACPref(pref: string): string {
    const map: Record<string, string> = {
        on: 'AC On',
        off: 'Windows',
        no_preference: 'Flexible',
    };
    return map[pref] || pref;
}

function getConvScore(pref: string): number {
    const scores: Record<string, number> = { quiet: 0, some: 1, chatty: 2 };
    return scores[pref] || 1;
}

// Compact version for ride cards
interface PreferenceMatchBadgeProps {
    score: number;
}

export const PreferenceMatchBadge: React.FC<PreferenceMatchBadgeProps> = ({ score }) => {
    const getConfig = () => {
        if (score >= 80) return { label: 'Great', color: 'green', icon: <Sparkles className="w-3 h-3" /> };
        if (score >= 60) return { label: 'Good', color: 'blue', icon: <CheckCircle className="w-3 h-3" /> };
        if (score >= 40) return { label: 'OK', color: 'amber', icon: <AlertCircle className="w-3 h-3" /> };
        return { label: 'Low', color: 'red', icon: <XCircle className="w-3 h-3" /> };
    };

    const config = getConfig();
    const colorClasses: Record<string, string> = {
        green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
            {config.icon}
            {score}%
        </span>
    );
};

export default PreferenceMatchIndicator;
