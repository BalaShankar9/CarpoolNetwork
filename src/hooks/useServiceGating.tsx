import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceGatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSetup: () => void;
}

function ServiceGatingModal({ isOpen, onClose, onCompleteSetup }: ServiceGatingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Complete Your Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-gray-600 text-center">
            To use this feature, please complete your profile by adding a profile picture. This helps maintain trust and safety in our community.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onCompleteSetup}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Complete Setup
          </button>
        </div>
      </div>
    </div>
  );
}

export function useServiceGating() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const isProfileComplete = () => {
    if (!profile) return false;
    return !!(profile.profile_photo_path || profile.avatar_url || profile.profile_photo_url);
  };

  const checkAccess = (action: 'post-ride' | 'request-ride' | 'book-ride' | 'send-offer' | 'message'): boolean => {
    if (isProfileComplete()) {
      return true;
    }

    setShowModal(true);
    return false;
  };

  const handleCompleteSetup = () => {
    setShowModal(false);
    navigate('/profile');
  };

  const ServiceGatingModalComponent = () => (
    <ServiceGatingModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onCompleteSetup={handleCompleteSetup}
    />
  );

  return {
    checkAccess,
    isProfileComplete: isProfileComplete(),
    ServiceGatingModal: ServiceGatingModalComponent,
  };
}
