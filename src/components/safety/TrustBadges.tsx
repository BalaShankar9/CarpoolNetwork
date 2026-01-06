import {
    Shield,
    ShieldCheck,
    Mail,
    Phone,
    CreditCard,
    Camera,
    Star,
    Award,
    Clock,
    CheckCircle,
    HelpCircle,
} from 'lucide-react';
import { TrustBadge } from '../../services/safetyService';

interface TrustBadgesProps {
    badges: TrustBadge[];
    showAll?: boolean;
    size?: 'sm' | 'md' | 'lg';
    onBadgeClick?: (badge: TrustBadge) => void;
}

const BADGE_ICONS: Record<string, React.ComponentType<any>> = {
    email_verified: Mail,
    phone_verified: Phone,
    id_verified: CreditCard,
    photo_verified: Camera,
    trusted_member: ShieldCheck,
    veteran: Award,
    super_driver: Star,
    reliable: Clock,
};

const BADGE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    email_verified: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
    phone_verified: { bg: 'bg-green-100', text: 'text-green-600', ring: 'ring-green-200' },
    id_verified: { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200' },
    photo_verified: { bg: 'bg-pink-100', text: 'text-pink-600', ring: 'ring-pink-200' },
    trusted_member: { bg: 'bg-yellow-100', text: 'text-yellow-600', ring: 'ring-yellow-200' },
    veteran: { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
    super_driver: { bg: 'bg-red-100', text: 'text-red-600', ring: 'ring-red-200' },
    reliable: { bg: 'bg-teal-100', text: 'text-teal-600', ring: 'ring-teal-200' },
};

export function TrustBadges({ badges, showAll = false, size = 'md', onBadgeClick }: TrustBadgesProps) {
    const earnedBadges = badges.filter(b => b.earned);
    const unearnedBadges = badges.filter(b => !b.earned);
    const displayBadges = showAll ? badges : earnedBadges;

    if (displayBadges.length === 0) {
        return (
            <div className="flex items-center gap-2 text-gray-400">
                <Shield className="h-4 w-4" />
                <span className="text-sm">No badges yet</span>
            </div>
        );
    }

    const sizeClasses = {
        sm: { wrapper: 'p-1', icon: 'h-3 w-3' },
        md: { wrapper: 'p-2', icon: 'h-4 w-4' },
        lg: { wrapper: 'p-3', icon: 'h-6 w-6' },
    };

    return (
        <div className="space-y-4">
            {/* Earned Badges */}
            <div className="flex flex-wrap gap-2">
                {earnedBadges.map(badge => {
                    const IconComponent = BADGE_ICONS[badge.id] || Shield;
                    const colors = BADGE_COLORS[badge.id] || {
                        bg: 'bg-gray-100',
                        text: 'text-gray-600',
                        ring: 'ring-gray-200',
                    };

                    return (
                        <button
                            key={badge.id}
                            onClick={() => onBadgeClick?.(badge)}
                            className={`${sizeClasses[size].wrapper} ${colors.bg} rounded-full 
                       ring-2 ${colors.ring} hover:ring-4 transition-all cursor-pointer
                       group relative`}
                            title={badge.name}
                        >
                            <IconComponent className={`${sizeClasses[size].icon} ${colors.text}`} />

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                            opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none z-10 w-max max-w-xs">
                                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                                    <p className="font-medium">{badge.name}</p>
                                    <p className="text-gray-300">{badge.description}</p>
                                    {badge.earnedAt && (
                                        <p className="text-gray-400 mt-1">
                                            Earned {new Date(badge.earnedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Unearned Badges (if showAll) */}
            {showAll && unearnedBadges.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        Badges to Earn
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {unearnedBadges.map(badge => {
                            const IconComponent = BADGE_ICONS[badge.id] || Shield;

                            return (
                                <button
                                    key={badge.id}
                                    onClick={() => onBadgeClick?.(badge)}
                                    className={`${sizeClasses[size].wrapper} bg-gray-100 rounded-full 
                           ring-2 ring-gray-200 hover:ring-4 transition-all cursor-pointer
                           group relative opacity-50`}
                                    title={`${badge.name} (Not earned)`}
                                >
                                    <IconComponent className={`${sizeClasses[size].icon} text-gray-400`} />

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                                opacity-0 group-hover:opacity-100 transition-opacity
                                pointer-events-none z-10 w-max max-w-xs">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                                            <p className="font-medium">{badge.name}</p>
                                            <p className="text-gray-300">{badge.description}</p>
                                            <p className="text-yellow-400 mt-1 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Not yet earned
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact inline version for profiles
interface TrustBadgesInlineProps {
    badges: TrustBadge[];
    maxDisplay?: number;
}

export function TrustBadgesInline({ badges, maxDisplay = 4 }: TrustBadgesInlineProps) {
    const earnedBadges = badges.filter(b => b.earned);
    const displayBadges = earnedBadges.slice(0, maxDisplay);
    const remaining = earnedBadges.length - maxDisplay;

    if (earnedBadges.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            {displayBadges.map(badge => {
                const IconComponent = BADGE_ICONS[badge.id] || Shield;
                const colors = BADGE_COLORS[badge.id] || {
                    bg: 'bg-gray-100',
                    text: 'text-gray-600',
                    ring: 'ring-gray-200',
                };

                return (
                    <div
                        key={badge.id}
                        className={`p-1 ${colors.bg} rounded-full`}
                        title={badge.name}
                    >
                        <IconComponent className={`h-3 w-3 ${colors.text}`} />
                    </div>
                );
            })}
            {remaining > 0 && (
                <span className="text-xs text-gray-500 ml-1">+{remaining}</span>
            )}
        </div>
    );
}

// Trust Score Display
interface TrustScoreProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
}

export function TrustScore({ score, size = 'md' }: TrustScoreProps) {
    const getScoreColor = (s: number) => {
        if (s >= 80) return { text: 'text-green-600', bg: 'bg-green-100', fill: 'bg-green-500' };
        if (s >= 60) return { text: 'text-blue-600', bg: 'bg-blue-100', fill: 'bg-blue-500' };
        if (s >= 40) return { text: 'text-yellow-600', bg: 'bg-yellow-100', fill: 'bg-yellow-500' };
        return { text: 'text-red-600', bg: 'bg-red-100', fill: 'bg-red-500' };
    };

    const colors = getScoreColor(score);

    const sizeClasses = {
        sm: { wrapper: 'w-8 h-8', text: 'text-xs' },
        md: { wrapper: 'w-12 h-12', text: 'text-sm' },
        lg: { wrapper: 'w-16 h-16', text: 'text-lg' },
    };

    return (
        <div className="flex items-center gap-3">
            <div
                className={`${sizeClasses[size].wrapper} ${colors.bg} rounded-full 
                  flex items-center justify-center relative overflow-hidden`}
            >
                <div
                    className={`absolute inset-0 ${colors.fill} opacity-20`}
                    style={{
                        clipPath: `polygon(0 ${100 - score}%, 100% ${100 - score}%, 100% 100%, 0 100%)`,
                    }}
                />
                <span className={`font-bold ${colors.text} ${sizeClasses[size].text} relative`}>
                    {score}
                </span>
            </div>
            {size === 'lg' && (
                <div>
                    <p className="font-medium text-gray-900">Trust Score</p>
                    <p className="text-sm text-gray-500">
                        {score >= 80
                            ? 'Highly Trusted'
                            : score >= 60
                                ? 'Trusted'
                                : score >= 40
                                    ? 'Building Trust'
                                    : 'New Member'}
                    </p>
                </div>
            )}
        </div>
    );
}
