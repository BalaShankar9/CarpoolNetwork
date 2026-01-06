import React, { useState } from 'react';
import {
    Shield,
    Heart,
    Users,
    MessageSquare,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Star,
    Car,
    Clock
} from 'lucide-react';

interface GuidelineSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
}

const GUIDELINES: GuidelineSection[] = [
    {
        id: 'respect',
        title: 'Respect & Courtesy',
        icon: <Heart className="w-5 h-5" />,
        color: 'red',
        items: [
            'Treat all members with kindness and respect',
            'Be punctual - your time and others\' time is valuable',
            'Keep conversations appropriate and inclusive',
            'Respect personal space and boundaries',
            'Be understanding of different backgrounds and perspectives',
        ],
    },
    {
        id: 'safety',
        title: 'Safety First',
        icon: <Shield className="w-5 h-5" />,
        color: 'blue',
        items: [
            'Always wear seatbelts - drivers ensure all passengers do too',
            'Follow all traffic laws and drive responsibly',
            'Keep emergency contacts updated in your profile',
            'Share your trip details with trusted contacts when needed',
            'Report any safety concerns immediately through the app',
        ],
    },
    {
        id: 'communication',
        title: 'Communication',
        icon: <MessageSquare className="w-5 h-5" />,
        color: 'green',
        items: [
            'Respond to messages promptly',
            'Be clear about pickup locations and timing',
            'Notify others immediately if you need to cancel',
            'Keep communication within the app for your protection',
            'Provide constructive feedback through reviews',
        ],
    },
    {
        id: 'riding',
        title: 'Riding Etiquette',
        icon: <Car className="w-5 h-5" />,
        color: 'purple',
        items: [
            'Be ready at the agreed pickup location on time',
            'Keep the vehicle clean - no eating without permission',
            'Ask before adjusting AC, music, or windows',
            'Offer to help with petrol costs if the driver mentions it',
            'Leave honest, fair reviews after each ride',
        ],
    },
];

interface CommunityGuidelinesProps {
    showFull?: boolean;
    className?: string;
}

export const CommunityGuidelines: React.FC<CommunityGuidelinesProps> = ({
    showFull = true,
    className = '',
}) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(
        showFull ? GUIDELINES[0].id : null
    );

    const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
        red: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: 'text-red-500',
            border: 'border-red-200 dark:border-red-800',
        },
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'text-blue-500',
            border: 'border-blue-200 dark:border-blue-800',
        },
        green: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            icon: 'text-green-500',
            border: 'border-green-200 dark:border-green-800',
        },
        purple: {
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            icon: 'text-purple-500',
            border: 'border-purple-200 dark:border-purple-800',
        },
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Community Guidelines
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Guidelines to keep our community safe and friendly
                </p>
            </div>

            {/* Sections */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {GUIDELINES.map(section => {
                    const isExpanded = expandedSection === section.id;
                    const colors = colorClasses[section.color];

                    return (
                        <div key={section.id}>
                            <button
                                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                        <span className={colors.icon}>{section.icon}</span>
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {section.title}
                                    </span>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>

                            {isExpanded && (
                                <div className={`px-4 pb-4 ${colors.bg} border-l-4 ${colors.border} ml-4 mr-4 mb-4 rounded-r-lg`}>
                                    <ul className="space-y-2 py-3">
                                        {section.items.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 dark:text-gray-400">
                        Violations of these guidelines may result in warnings, temporary suspension, or permanent removal from the platform.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Compact version for onboarding or tooltips
export const GuidelinesHighlights: React.FC<{ className?: string }> = ({ className = '' }) => {
    const highlights = [
        { icon: <Clock className="w-4 h-4" />, text: 'Be punctual' },
        { icon: <Heart className="w-4 h-4" />, text: 'Be respectful' },
        { icon: <Shield className="w-4 h-4" />, text: 'Safety first' },
        { icon: <Star className="w-4 h-4" />, text: 'Leave fair reviews' },
    ];

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {highlights.map((h, i) => (
                <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                    {h.icon}
                    {h.text}
                </span>
            ))}
        </div>
    );
};

export default CommunityGuidelines;
