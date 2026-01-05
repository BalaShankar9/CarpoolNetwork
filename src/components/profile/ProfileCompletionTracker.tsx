import { CheckCircle, AlertCircle, Car, Shield, Phone, User, Image as ImageIcon, TrendingUp, Award, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  icon: typeof CheckCircle;
  description: string;
  link?: string;
  benefit?: string;
}

export default function ProfileCompletionTracker() {
  const { profile } = useAuth();

  if (!profile) return null;

  const completionItems: CompletionItem[] = [
    {
      id: 'profile_photo',
      label: 'Profile Photo',
      completed: !!(profile as any).profile_photo_url || !!profile.avatar_url,
      icon: ImageIcon,
      description: 'Upload a clear photo of your face',
      link: '#profile-photo',
      benefit: '+25% trust score'
    },
    {
      id: 'face_verified',
      label: 'Face Verification',
      completed: !!(profile as any).profile_verified,
      icon: Shield,
      description: 'Verify your identity with face detection',
      link: '#profile-photo',
      benefit: '+40% booking success'
    },
    {
      id: 'phone',
      label: 'Phone Number',
      completed: !!profile.phone_e164 && !!profile.phone_verified,
      icon: Phone,
      description: 'Add and verify your phone number',
      link: '#edit-profile',
      benefit: '+15% visibility'
    },
    {
      id: 'bio',
      label: 'Bio',
      completed: !!profile.bio && profile.bio.length > 20,
      icon: User,
      description: 'Write a brief bio about yourself',
      link: '#edit-profile',
      benefit: '+20% match rate'
    },
    {
      id: 'vehicle',
      label: 'Vehicle Added',
      completed: profile.total_rides_offered > 0,
      icon: Car,
      description: 'Add a vehicle to offer rides',
      link: '#vehicles',
      benefit: 'Unlock driver features'
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const totalCount = completionItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const isComplete = completionPercentage === 100;

  const getMilestone = () => {
    if (completionPercentage >= 100) return { level: 'Complete', badge: '🎉', color: 'green' };
    if (completionPercentage >= 75) return { level: 'Almost There', badge: '⭐', color: 'yellow' };
    if (completionPercentage >= 50) return { level: 'Halfway', badge: '🚀', color: 'blue' };
    return { level: 'Getting Started', badge: '🌱', color: 'gray' };
  };

  const milestone = getMilestone();

  const estimatedBenefit = completionPercentage >= 75 ? '78% better matches' :
                          completionPercentage >= 50 ? '45% better matches' :
                          '20% better matches';

  if (isComplete) {
    return (
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-green-300 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-full animate-pulse">
            <Award className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-green-900">Profile Complete!</h3>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-sm text-green-700 mb-3">
              Your profile is fully optimized for maximum matches and visibility!
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-green-700 border border-green-200">
                100% Trust Builder
              </div>
              <div className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-green-700 border border-green-200">
                Premium Visibility
              </div>
              <div className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-green-700 border border-green-200">
                Top Match Priority
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="relative">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 35}`}
              strokeDashoffset={`${2 * Math.PI * 35 * (1 - completionPercentage / 100)}`}
              className={`text-${milestone.color}-500 transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">{milestone.badge}</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-gray-900">Boost Your Visibility</h3>
            <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {milestone.level} - Complete your profile to get {estimatedBenefit}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-700">{completedCount}/{totalCount} completed</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {completionItems.filter(item => !item.completed).slice(0, 3).map((item) => (
          <a
            key={item.id}
            href={item.link}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all group"
          >
            <div className="flex-shrink-0 p-2 rounded-full bg-gray-200 group-hover:bg-blue-100 transition-colors">
              <AlertCircle className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                {item.benefit && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {item.benefit}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
          </a>
        ))}
      </div>

      {completionPercentage >= 50 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Award className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900">Milestone Unlocked!</p>
              <p className="text-xs text-yellow-800">
                You're {completionPercentage >= 75 ? 'almost' : 'halfway'} there! Complete {totalCount - completedCount} more {totalCount - completedCount === 1 ? 'item' : 'items'} to reach 100%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-2">Why Complete Your Profile?</p>
        <ul className="space-y-1.5 text-xs text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>78% more ride matches</strong> with a complete profile</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Higher trust score</strong> means more booking requests</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
            <span><strong>Priority in search</strong> results and recommendations</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
