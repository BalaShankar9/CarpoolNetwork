import { useState, useEffect } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ProfilePictureBanner() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const dismissedState = localStorage.getItem('profile-picture-banner-dismissed');
    if (dismissedState === 'true') {
      setDismissed(true);
    }
  }, []);

  if (!user || !profile || profile.avatar_url || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('profile-picture-banner-dismissed', 'true');
  };

  const handleUploadClick = () => {
    navigate('/profile');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      handleDismiss();
      window.location.reload();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-b-4 border-blue-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Complete Your Profile
                </h3>
                <p className="text-sm text-blue-100 mb-3">
                  Please upload a profile picture to build trust with the community and enhance your carpooling experience.
                </p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Now'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleUploadClick}
                    className="px-4 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900 transition-colors"
                  >
                    Go to Profile
                  </button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
