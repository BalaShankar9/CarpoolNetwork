import { CheckCircle, AlertCircle, Car, Shield, Phone, User, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  icon: typeof CheckCircle;
  description: string;
  link?: string;
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
      link: '#profile-photo'
    },
    {
      id: 'face_verified',
      label: 'Face Verification',
      completed: !!(profile as any).profile_verified,
      icon: Shield,
      description: 'Verify your identity with face detection',
      link: '#profile-photo'
    },
    {
      id: 'phone',
      label: 'Phone Number',
      completed: !!profile.phone,
      icon: Phone,
      description: 'Add your contact phone number',
      link: '#edit-profile'
    },
    {
      id: 'bio',
      label: 'Bio',
      completed: !!profile.bio && profile.bio.length > 20,
      icon: User,
      description: 'Write a brief bio about yourself',
      link: '#edit-profile'
    },
    {
      id: 'vehicle',
      label: 'Vehicle Added',
      completed: profile.total_rides_offered > 0,
      icon: Car,
      description: 'Add a vehicle to offer rides',
      link: '#vehicles'
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const totalCount = completionItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const isComplete = completionPercentage === 100;

  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900">Profile Complete!</h3>
            <p className="text-sm text-green-700">Your profile is fully set up and ready to go</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Complete Your Profile</h3>
        <span className="text-sm font-semibold text-blue-600">{completionPercentage}%</span>
      </div>

      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-6">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="space-y-3">
        {completionItems.map((item) => (
          <a
            key={item.id}
            href={item.link}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              item.completed
                ? 'bg-green-50 hover:bg-green-100'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className={`flex-shrink-0 p-2 rounded-full ${
                item.completed
                  ? 'bg-green-100'
                  : 'bg-gray-200'
              }`}
            >
              {item.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                item.completed ? 'text-green-900' : 'text-gray-900'
              }`}>
                {item.label}
              </p>
              <p className={`text-xs ${
                item.completed ? 'text-green-700' : 'text-gray-600'
              }`}>
                {item.completed ? 'Completed' : item.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Why complete your profile?</strong> A complete profile builds trust,
          increases your booking success rate, and helps you connect with the right ride partners.
        </p>
      </div>
    </div>
  );
}
