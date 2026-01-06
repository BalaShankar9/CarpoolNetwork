import { useState, useEffect } from 'react';
import { Camera, Car, X, Upload, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

export default function OnboardingModal() {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'welcome' | 'profile-pic' | 'vehicle-choice' | 'vehicle-pic' | 'complete'>('welcome');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);
  const [profilePicUploaded, setProfilePicUploaded] = useState(false);
  const [vehiclePicUploaded, setVehiclePicUploaded] = useState(false);
  const [willOfferRides, setWillOfferRides] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const onboardingCompleted = localStorage.getItem(`onboarding-completed-${user.id}`);

    if (!onboardingCompleted && !profile.avatar_url) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  if (!showModal || !user || !profile) return null;

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingProfile(true);

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

      setProfilePicUploaded(true);
      setTimeout(() => {
        setStep('vehicle-choice');
      }, 1000);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleVehiclePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingVehicle(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-vehicle-${Date.now()}.${fileExt}`;
      const filePath = `vehicle-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (vehicles && vehicles.length > 0) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ image_url: publicUrl })
          .eq('id', vehicles[0].id);

        if (updateError) throw updateError;
      }

      setVehiclePicUploaded(true);
      setTimeout(() => {
        setStep('complete');
      }, 1000);
    } catch (error) {
      console.error('Error uploading vehicle picture:', error);
      toast.error('Failed to upload vehicle picture. Please try again.');
    } finally {
      setUploadingVehicle(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`onboarding-completed-${user.id}`, 'true');
    setShowModal(false);
    window.location.reload();
  };

  const handleSkipVehicle = () => {
    setStep('complete');
  };

  const handleVehicleChoice = (choice: boolean) => {
    setWillOfferRides(choice);
    if (choice) {
      setStep('vehicle-pic');
    } else {
      setStep('complete');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {step === 'welcome' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Carpool Network!
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Let's set up your profile to get started. This will only take a minute.
            </p>
            <button
              onClick={() => setStep('profile-pic')}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 'profile-pic' && (
          <div className="p-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {profilePicUploaded ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <Camera className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Upload Profile Picture
              </h2>
              <p className="text-gray-600 text-center">
                A profile picture helps build trust within the community
              </p>
            </div>

            {!profilePicUploaded ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG up to 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicUpload}
                      disabled={uploadingProfile}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadingProfile && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                )}

                <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Profile picture is required to continue. This helps maintain a safe community.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">Profile picture uploaded!</p>
                <p className="text-sm text-gray-600">Proceeding to next step...</p>
              </div>
            )}
          </div>
        )}

        {step === 'vehicle-choice' && (
          <div className="p-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Will You Offer Rides?
              </h2>
              <p className="text-gray-600 text-center">
                Let us know if you plan to offer rides to others
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleVehicleChoice(true)}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Car className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Yes, I'll offer rides</h3>
                    <p className="text-sm text-gray-600">You'll need to add vehicle details</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                </div>
              </button>

              <button
                onClick={() => handleVehicleChoice(false)}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Camera className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">No, just finding rides</h3>
                    <p className="text-sm text-gray-600">You can always add this later</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'vehicle-pic' && (
          <div className="p-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {vehiclePicUploaded ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <Car className="w-8 h-8 text-purple-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Upload Vehicle Picture
              </h2>
              <p className="text-gray-600 text-center">
                Help passengers recognize your vehicle
              </p>
            </div>

            {!vehiclePicUploaded ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG up to 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVehiclePicUpload}
                      disabled={uploadingVehicle}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadingVehicle && (
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </div>
                )}

                <button
                  onClick={handleSkipVehicle}
                  className="w-full px-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Skip for now
                </button>
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">Vehicle picture uploaded!</p>
                <p className="text-sm text-gray-600">Completing setup...</p>
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              You're All Set!
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Welcome to Carpool Network. Start exploring rides or offer your own!
            </p>
            <button
              onClick={handleComplete}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
            >
              Start Carpooling
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
