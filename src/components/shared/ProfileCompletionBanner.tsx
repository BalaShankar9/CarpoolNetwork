import { AlertCircle, Camera, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function ProfileCompletionBanner() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const needsProfilePhoto = !profile.profile_photo_path && !profile.avatar_url && !profile.profile_photo_url;

  if (!needsProfilePhoto) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              Complete your profile to start using all features
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add a profile picture to post rides, request rides, and book trips
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Complete Setup
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-amber-600 hover:text-amber-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
