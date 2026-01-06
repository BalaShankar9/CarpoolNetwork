import { useState } from 'react';
import {
    Shield,
    AlertTriangle,
    Eye,
    Moon,
    Car,
    User,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    CheckCircle,
} from 'lucide-react';
import { SAFETY_TIPS } from '../../services/safetyService';

type TipCategory = 'first_ride' | 'as_driver' | 'as_passenger' | 'night_rides';

interface SafetyTipsProps {
    defaultCategory?: TipCategory;
    compact?: boolean;
}

const CATEGORY_CONFIG: Record<
    TipCategory,
    { icon: React.ComponentType<any>; title: string; color: string }
> = {
    first_ride: {
        icon: Eye,
        title: 'First Ride Tips',
        color: 'bg-purple-100 text-purple-600',
    },
    as_driver: {
        icon: Car,
        title: 'Tips for Drivers',
        color: 'bg-blue-100 text-blue-600',
    },
    as_passenger: {
        icon: User,
        title: 'Tips for Passengers',
        color: 'bg-green-100 text-green-600',
    },
    night_rides: {
        icon: Moon,
        title: 'Night Ride Safety',
        color: 'bg-indigo-100 text-indigo-600',
    },
};

export function SafetyTips({ defaultCategory = 'first_ride', compact = false }: SafetyTipsProps) {
    const [selectedCategory, setSelectedCategory] = useState<TipCategory>(defaultCategory);
    const [expandedCategories, setExpandedCategories] = useState<Set<TipCategory>>(
        new Set([defaultCategory])
    );
    const [checkedTips, setCheckedTips] = useState<Set<string>>(new Set());

    const toggleCategory = (category: TipCategory) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleTip = (tipKey: string) => {
        const newChecked = new Set(checkedTips);
        if (newChecked.has(tipKey)) {
            newChecked.delete(tipKey);
        } else {
            newChecked.add(tipKey);
        }
        setCheckedTips(newChecked);
    };

    if (compact) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-yellow-900 mb-2">Quick Safety Tips</h3>
                        <ul className="space-y-1">
                            {SAFETY_TIPS[selectedCategory].slice(0, 3).map((tip, index) => (
                                <li
                                    key={index}
                                    className="text-sm text-yellow-800 flex items-start gap-2"
                                >
                                    <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                    <Shield className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Safety Tips</h2>
                    <p className="text-sm text-gray-500">
                        Stay safe during your carpools
                    </p>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_CONFIG) as TipCategory[]).map(category => {
                    const config = CATEGORY_CONFIG[category];
                    const IconComponent = config.icon;
                    const isActive = selectedCategory === category;

                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       transition-colors ${isActive
                                    ? config.color
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <IconComponent className="h-4 w-4" />
                            {config.title}
                        </button>
                    );
                })}
            </div>

            {/* Tips List */}
            <div className="bg-white border rounded-xl divide-y">
                {SAFETY_TIPS[selectedCategory].map((tip, index) => {
                    const tipKey = `${selectedCategory}-${index}`;
                    const isChecked = checkedTips.has(tipKey);

                    return (
                        <label
                            key={index}
                            className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50
                       transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTip(tipKey)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600
                         focus:ring-green-500"
                            />
                            <span
                                className={`text-sm ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'
                                    }`}
                            >
                                {tip}
                            </span>
                        </label>
                    );
                })}
            </div>

            {/* Progress */}
            {checkedTips.size > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                        {checkedTips.size} tips reviewed
                    </span>
                    <button
                        onClick={() => setCheckedTips(new Set())}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Reset
                    </button>
                </div>
            )}

            {/* All Categories (Accordion) */}
            <div className="border rounded-xl overflow-hidden">
                {(Object.keys(CATEGORY_CONFIG) as TipCategory[]).map(category => {
                    const config = CATEGORY_CONFIG[category];
                    const IconComponent = config.icon;
                    const isExpanded = expandedCategories.has(category);

                    return (
                        <div key={category} className="border-b last:border-b-0">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50
                         transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${config.color}`}>
                                        <IconComponent className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-gray-900">{config.title}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4">
                                    <ul className="space-y-2 pl-12">
                                        {SAFETY_TIPS[category].map((tip, index) => (
                                            <li
                                                key={index}
                                                className="text-sm text-gray-600 flex items-start gap-2"
                                            >
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Emergency Banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                    <h3 className="font-medium text-red-900 mb-1">In an Emergency</h3>
                    <p className="text-sm text-red-700">
                        If you feel unsafe at any time, use the SOS button in the app or call emergency
                        services (999) directly. Your safety is our top priority.
                    </p>
                </div>
            </div>
        </div>
    );
}
