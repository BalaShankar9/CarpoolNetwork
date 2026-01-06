import React from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkles,
    ArrowRight,
    CheckCircle,
    Car,
    Users,
    Shield,
    MessageSquare,
    Star,
    Gift
} from 'lucide-react';

interface NewMemberWelcomeProps {
    userName?: string;
    onDismiss?: () => void;
    showChecklist?: boolean;
    completedSteps?: string[];
    className?: string;
}

const ONBOARDING_STEPS = [
    {
        id: 'profile',
        label: 'Complete your profile',
        description: 'Add a photo and verify your details',
        icon: Users,
        link: '/profile',
    },
    {
        id: 'preferences',
        label: 'Set ride preferences',
        description: 'Let others know your carpool style',
        icon: Car,
        link: '/settings',
    },
    {
        id: 'safety',
        label: 'Review safety features',
        description: 'Learn how we keep you safe',
        icon: Shield,
        link: '/safety',
    },
    {
        id: 'first_ride',
        label: 'Find your first ride',
        description: 'Search for carpools near you',
        icon: Sparkles,
        link: '/find-rides',
    },
];

export const NewMemberWelcome: React.FC<NewMemberWelcomeProps> = ({
    userName = 'there',
    onDismiss,
    showChecklist = true,
    completedSteps = [],
    className = '',
}) => {
    const completedCount = completedSteps.length;
    const totalSteps = ONBOARDING_STEPS.length;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);

    return (
        <div className={`bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-sm font-medium opacity-90">Welcome to the community!</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                    Hey {userName}! 👋
                </h2>
                <p className="text-white/80">
                    We're excited to have you join our carpool community. Let's get you started with a few quick steps.
                </p>

                {/* Progress */}
                {showChecklist && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span>Getting started progress</span>
                            <span className="font-medium">{completedCount}/{totalSteps}</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Checklist */}
            {showChecklist && (
                <div className="bg-white dark:bg-gray-800 p-4">
                    <div className="space-y-2">
                        {ONBOARDING_STEPS.map(step => {
                            const isCompleted = completedSteps.includes(step.id);
                            const Icon = step.icon;

                            return (
                                <Link
                                    key={step.id}
                                    to={step.link}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCompleted
                                            ? 'bg-green-50 dark:bg-green-900/20'
                                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted
                                            ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-medium ${isCompleted
                                                ? 'text-green-700 dark:text-green-400 line-through'
                                                : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {step.label}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {step.description}
                                        </div>
                                    </div>
                                    {!isCompleted && (
                                        <ArrowRight className="w-5 h-5 text-gray-400" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Dismiss button */}
                    {onDismiss && completedCount === totalSteps && (
                        <button
                            onClick={onDismiss}
                            className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Gift className="w-5 h-5" />
                            You're all set! Start exploring
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Mini banner version
interface WelcomeBannerProps {
    userName?: string;
    className?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
    userName = 'there',
    className = '',
}) => {
    return (
        <div className={`bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold">Welcome, {userName}!</h3>
                        <p className="text-sm text-white/80">Ready to start carpooling?</p>
                    </div>
                </div>
                <Link
                    to="/find-rides"
                    className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-1"
                >
                    Find Rides
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
};

// First ride success celebration
export const FirstRideCelebration: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white text-center ${className}`}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">🎉 Congratulations!</h2>
            <p className="text-white/90 mb-4">
                You completed your first carpool ride! Welcome to the community.
            </p>
            <div className="flex justify-center gap-3">
                <Link
                    to="/find-rides"
                    className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                    Find Another Ride
                </Link>
                <Link
                    to="/post-ride"
                    className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                >
                    Offer a Ride
                </Link>
            </div>
        </div>
    );
};

export default NewMemberWelcome;
