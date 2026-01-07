import { useState, useEffect } from 'react';
import {
    Shield,
    AlertTriangle,
    Users,
    Share2,
    Award,
    Lightbulb,
    ChevronRight,
    ArrowLeft,
    Phone,
    FileText,
    Scale,
    Activity,
    MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EmergencyContacts } from '../components/safety/EmergencyContacts';
import { SafetyTips } from '../components/safety/SafetyTips';
import { TrustBadges, TrustScore } from '../components/safety/TrustBadges';
import { SOSButton } from '../components/safety/SOSButton';
import { LiveTripSharing } from '../components/safety/LiveTripSharing';
import { SafetyScoreDisplay } from '../components/safety/SafetyScoreDisplay';
import { SafetyDashboard } from '../components/safety/SafetyDashboard';
import { DisputeCenter } from '../components/disputes/DisputeCenter';
import { ReportSystem } from '../components/moderation/ReportSystem';
import {
    getUserTrustBadges,
    getSafetyScoreBreakdown,
    TrustBadge,
} from '../services/safetyService';

type Tab = 'overview' | 'contacts' | 'badges' | 'tips' | 'disputes' | 'analytics';

export default function SafetyCenter() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [badges, setBadges] = useState<TrustBadge[]>([]);
    const [safetyScore, setSafetyScore] = useState<{
        overallScore: number;
        components: { name: string; score: number; maxScore: number; description: string }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadSafetyData();
        }
    }, [user]);

    const loadSafetyData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [badgesData, scoreData] = await Promise.all([
                getUserTrustBadges(user.id),
                getSafetyScoreBreakdown(user.id),
            ]);
            setBadges(badgesData);
            setSafetyScore(scoreData);
        } catch (err) {
            console.error('Error loading safety data:', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'overview' as Tab, label: 'Overview', icon: Shield },
        { id: 'contacts' as Tab, label: 'Emergency Contacts', icon: Users },
        { id: 'badges' as Tab, label: 'Trust Badges', icon: Award },
        { id: 'tips' as Tab, label: 'Safety Tips', icon: Lightbulb },
        { id: 'disputes' as Tab, label: 'Disputes', icon: Scale },
        { id: 'analytics' as Tab, label: 'Analytics', icon: Activity },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex items-center gap-4 h-16">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Shield className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-gray-900">Safety Center</h1>
                                <p className="text-sm text-gray-500">Your safety toolkit</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                           text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Safety Score Card */}
                        <div className="bg-white rounded-xl border p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Your Safety Score</h2>
                                {safetyScore && <TrustScore score={safetyScore.overallScore} size="lg" />}
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                                </div>
                            ) : (
                                safetyScore && (
                                    <div className="space-y-4">
                                        {safetyScore.components.map(component => (
                                            <div key={component.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {component.name}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {component.score}/{component.maxScore}
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(component.score / component.maxScore) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{component.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={() => setActiveTab('contacts')}
                                className="bg-white rounded-xl border p-4 flex items-center gap-4
                         hover:shadow-md transition-all text-left"
                            >
                                <div className="p-3 bg-red-100 rounded-xl">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Emergency Contacts</h3>
                                    <p className="text-sm text-gray-500">Manage trusted contacts</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </button>

                            <button
                                onClick={() => setActiveTab('badges')}
                                className="bg-white rounded-xl border p-4 flex items-center gap-4
                         hover:shadow-md transition-all text-left"
                            >
                                <div className="p-3 bg-yellow-100 rounded-xl">
                                    <Award className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Trust Badges</h3>
                                    <p className="text-sm text-gray-500">
                                        {badges.filter(b => b.earned).length}/{badges.length} earned
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </button>

                            <button
                                onClick={() => setActiveTab('tips')}
                                className="bg-white rounded-xl border p-4 flex items-center gap-4
                         hover:shadow-md transition-all text-left"
                            >
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Lightbulb className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Safety Tips</h3>
                                    <p className="text-sm text-gray-500">Learn how to stay safe</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </button>

                            <a
                                href="tel:999"
                                className="bg-white rounded-xl border p-4 flex items-center gap-4
                         hover:shadow-md transition-all text-left"
                            >
                                <div className="p-3 bg-green-100 rounded-xl">
                                    <Phone className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Emergency Services</h3>
                                    <p className="text-sm text-gray-500">Call 999</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </a>

                            <button
                                onClick={() => setActiveTab('disputes')}
                                className="bg-white rounded-xl border p-4 flex items-center gap-4
                         hover:shadow-md transition-all text-left"
                            >
                                <div className="p-3 bg-orange-100 rounded-xl">
                                    <Scale className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Dispute Center</h3>
                                    <p className="text-sm text-gray-500">Resolve ride issues</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Live Trip Sharing */}
                        {user && (
                            <div className="bg-white rounded-xl border p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <MapPin className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">Live Trip Sharing</h2>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Share your real-time location with trusted contacts during rides.
                                </p>
                                <LiveTripSharing userId={user.id} />
                            </div>
                        )}

                        {/* Trust Badges Preview */}
                        <div className="bg-white rounded-xl border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Your Trust Badges</h2>
                                <button
                                    onClick={() => setActiveTab('badges')}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    View All
                                </button>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                                </div>
                            ) : (
                                <TrustBadges badges={badges} size="md" />
                            )}
                        </div>

                        {/* Safety Tips Preview */}
                        <SafetyTips compact defaultCategory="as_passenger" />

                        {/* Community Guidelines Link */}
                        <div className="bg-white rounded-xl border p-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Community Guidelines</h3>
                                    <p className="text-sm text-gray-500">
                                        Our rules for a safe carpooling community
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'contacts' && <EmergencyContacts />}

                {activeTab === 'badges' && (
                    <div className="space-y-6">
                        {/* Safety Score */}
                        <div className="bg-white rounded-xl border p-6">
                            <div className="flex items-center gap-4">
                                {safetyScore && (
                                    <>
                                        <TrustScore score={safetyScore.overallScore} size="lg" />
                                        <div className="flex-1">
                                            <p className="text-gray-600">
                                                Complete verifications and maintain good ratings to increase your trust score
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* All Badges */}
                        <div className="bg-white rounded-xl border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Trust Badges</h2>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                                </div>
                            ) : (
                                <TrustBadges badges={badges} showAll size="lg" />
                            )}
                        </div>

                        {/* How to Earn Badges */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h3 className="font-medium text-blue-900 mb-2">How to Earn Badges</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li>✓ Verify your email and phone number</li>
                                <li>✓ Upload a profile photo</li>
                                <li>✓ Complete your first 10 rides</li>
                                <li>✓ Maintain a high rating from other users</li>
                                <li>✓ Stay active in the community for 6+ months</li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'tips' && <SafetyTips />}

                {activeTab === 'disputes' && user && <DisputeCenter userId={user.id} />}

                {activeTab === 'analytics' && <SafetyDashboard />}
            </div>

            {/* Floating SOS Button */}
            {user && <SOSButton userId={user.id} />}
        </div>
    );
}
