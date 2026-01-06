import { Target, Navigation, Clock, Route, TrendingUp, Info } from 'lucide-react';

interface MatchScoreDisplayProps {
    matchScore: number;
    proximityScore?: number;
    timeCompatibilityScore?: number;
    routeEfficiencyScore?: number;
    detourDistanceKm?: number;
    detourTimeMinutes?: number;
    size?: 'sm' | 'md' | 'lg';
    showBreakdown?: boolean;
}

export default function MatchScoreDisplay({
    matchScore,
    proximityScore,
    timeCompatibilityScore,
    routeEfficiencyScore,
    detourDistanceKm,
    detourTimeMinutes,
    size = 'md',
    showBreakdown = false,
}: MatchScoreDisplayProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-blue-600 bg-blue-100';
        if (score >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return 'Excellent Match';
        if (score >= 80) return 'Great Match';
        if (score >= 70) return 'Good Match';
        if (score >= 60) return 'Fair Match';
        if (score >= 50) return 'Moderate Match';
        return 'Low Match';
    };

    const sizeStyles = {
        sm: {
            container: 'w-12 h-12',
            text: 'text-sm font-bold',
            label: 'text-xs',
        },
        md: {
            container: 'w-16 h-16',
            text: 'text-xl font-bold',
            label: 'text-xs',
        },
        lg: {
            container: 'w-24 h-24',
            text: 'text-3xl font-bold',
            label: 'text-sm',
        },
    };

    const styles = sizeStyles[size];
    const colorClass = getScoreColor(matchScore);

    const ScoreBreakdownItem = ({
        icon: Icon,
        label,
        score,
        description,
    }: {
        icon: React.ElementType;
        label: string;
        score: number | undefined;
        description: string;
    }) => {
        if (score === undefined) return null;
        return (
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}
                            style={{ width: `${score}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{score}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {/* Main Score Badge */}
            <div className="flex items-center gap-3">
                <div
                    className={`${styles.container} ${colorClass} rounded-full flex flex-col items-center justify-center`}
                >
                    <span className={styles.text}>{matchScore}</span>
                    <span className={styles.label}>%</span>
                </div>
                <div>
                    <p className="font-medium text-gray-900">{getScoreLabel(matchScore)}</p>
                    <p className="text-sm text-gray-500">Match Score</p>
                </div>
            </div>

            {/* Score Breakdown */}
            {showBreakdown && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Score Breakdown</span>
                    </div>
                    <div className="divide-y divide-gray-200">
                        <ScoreBreakdownItem
                            icon={Target}
                            label="Proximity"
                            score={proximityScore}
                            description="How close pickup/dropoff points are to the route"
                        />
                        <ScoreBreakdownItem
                            icon={Clock}
                            label="Time Match"
                            score={timeCompatibilityScore}
                            description="How well departure times align"
                        />
                        <ScoreBreakdownItem
                            icon={Route}
                            label="Route Efficiency"
                            score={routeEfficiencyScore}
                            description="How efficiently this fits the driver's route"
                        />
                    </div>

                    {(detourDistanceKm || detourTimeMinutes) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">Estimated Detour:</p>
                            <div className="flex gap-4">
                                {detourDistanceKm !== undefined && (
                                    <div className="flex items-center gap-1 text-sm">
                                        <Navigation className="w-4 h-4 text-gray-400" />
                                        <span>{detourDistanceKm.toFixed(1)} km</span>
                                    </div>
                                )}
                                {detourTimeMinutes !== undefined && (
                                    <div className="flex items-center gap-1 text-sm">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>~{detourTimeMinutes} min</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Compact match score badge for list views
 */
export function MatchScoreBadge({
    score,
    className = '',
}: {
    score: number;
    className?: string;
}) {
    const getColor = (s: number) => {
        if (s >= 80) return 'bg-green-100 text-green-700 border-green-200';
        if (s >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getColor(score)} ${className}`}
        >
            <Target className="w-3 h-3" />
            {score}% Match
        </span>
    );
}

/**
 * Match score ring for circular progress display
 */
export function MatchScoreRing({
    score,
    size = 60,
    strokeWidth = 4,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const getStrokeColor = (s: number) => {
        if (s >= 80) return '#22c55e';
        if (s >= 60) return '#3b82f6';
        if (s >= 40) return '#eab308';
        return '#ef4444';
    };

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getStrokeColor(score)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{score}</span>
            </div>
        </div>
    );
}
