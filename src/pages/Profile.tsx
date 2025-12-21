import { useState, useEffect, useRef } from 'react';
import { Car, Star, Phone, Mail, Calendar, Plus, Edit, X, Shield, AlertCircle, CheckCircle, Upload, Image as ImageIcon, Camera, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadProfilePhoto, uploadVehiclePhoto, getPublicUrlSync } from '../services/storageService';
import { validateProfilePhoto } from '../services/faceDetection';
import PasskeyManagement from '../components/shared/PasskeyManagement';
import ProfileCompletionTracker from '../components/profile/ProfileCompletionTracker';
import EmergencyContactsManager from '../components/profile/EmergencyContactsManager';
import TrustScoreVisualization from '../components/profile/TrustScoreVisualization';
import ReviewsDisplay from '../components/profile/ReviewsDisplay';
import PrivacyControls from '../components/profile/PrivacyControls';
import StatisticsDashboard from '../components/profile/StatisticsDashboard';
import DocumentUploadCenter from '../components/profile/DocumentUploadCenter';
import RideAnalyticsDashboard from '../components/profile/RideAnalyticsDashboard';
import FriendsManager from '../components/social/FriendsManager';
import AchievementsBadges from '../components/gamification/AchievementsBadges';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  fuel_type?: string;
  vehicle_type?: string;
  registration_year?: number;
  engine_capacity?: number;
  image_url?: string;
  vehicle_photo_url?: string;
  vehicle_front_photo_path?: string;
  vehicle_front_photo_thumb_path?: string;
  mot_status?: string;
  mot_expiry_date?: string;
  tax_status?: string;
  tax_due_date?: string;
}

interface UserPreferences {
  auto_accept_rides: boolean;
  smoking_policy: string;
  pets_allowed: boolean;
  music_preference: string;
  conversation_level: string;
  instant_booking_enabled: boolean;
}

function isDateExpiringSoon(dateString?: string, daysThreshold: number = 30): boolean {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
}

function isDateExpired(dateString?: string): boolean {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const today = new Date();
  return expiryDate < today;
}

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVehicleId, setUploadingVehicleId] = useState<string | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicleImageInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vehicleToRemovePhoto, setVehicleToRemovePhoto] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [localPreviews, setLocalPreviews] = useState<{ [key: string]: string | null }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [key: string]: string | null }>({});
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    whatsapp_number: '',
    preferred_contact_method: 'both' as 'in_app' | 'whatsapp' | 'both',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    auto_accept_rides: false,
    smoking_policy: 'no-smoking',
    pets_allowed: false,
    music_preference: 'any',
    conversation_level: 'any',
    instant_booking_enabled: false,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      loadVehicles();
      loadPreferences();
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        whatsapp_number: (profile as any).whatsapp_number || '',
        preferred_contact_method: (profile as any).preferred_contact_method || 'both',
      });
    }
  }, [profile]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert paths to URLs for vehicles that have paths but no URLs
      const vehiclesWithUrls = (data || []).map(vehicle => {
        if (!vehicle.image_url && vehicle.vehicle_front_photo_path) {
          vehicle.image_url = getPublicUrlSync(vehicle.vehicle_front_photo_path);
        }
        return vehicle;
      });

      setVehicles(vehiclesWithUrls);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  const loadPreferences = async () => {
    if (!profile?.id) return;

    try {
      setPreferencesLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('auto_accept_rides, smoking_policy, pets_allowed, music_preference, conversation_level, instant_booking_enabled')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          auto_accept_rides: data.auto_accept_rides ?? false,
          smoking_policy: data.smoking_policy ?? 'no-smoking',
          pets_allowed: data.pets_allowed ?? false,
          music_preference: data.music_preference ?? 'any',
          conversation_level: data.conversation_level ?? 'any',
          instant_booking_enabled: data.instant_booking_enabled ?? false,
        });
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: boolean | string) => {
    if (!profile?.id) return;

    try {
      setPreferencesSaving(true);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          [key]: value,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        [key]: value,
      }));

      setSuccess('Preferences updated successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error updating preference:', err);
      setError('Failed to update preference');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setVehicleImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadVehicleImage = async (vehicleId: string): Promise<string | null> => {
    if (!vehicleImage) return null;

    try {
      setUploadingImage(true);
      const fileExt = vehicleImage.name.split('.').pop();
      const fileName = `${vehicleId}-${Date.now()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(filePath, vehicleImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!vehicleNumber.trim()) {
        setError('Please enter a vehicle number');
        setLoading(false);
        return;
      }

      const plateNumber = vehicleNumber.trim().toUpperCase();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-lookup`;
      const { data: { session } } = await supabase.auth.getSession();

      const lookupResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plateNumber }),
      });

      if (!lookupResponse.ok) {
        throw new Error('Failed to lookup vehicle details');
      }

      const lookupResult = await lookupResponse.json();

      if (!lookupResult.success || !lookupResult.data) {
        throw new Error('Vehicle not found');
      }

      const vehicleData = lookupResult.data;

      const { data, error: insertError } = await supabase
        .from('vehicles')
        .insert({
          user_id: profile?.id,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          license_plate: plateNumber,
          capacity: vehicleData.capacity,
          fuel_type: vehicleData.fuel_type,
          vehicle_type: vehicleData.vehicle_type,
          registration_year: vehicleData.registration_year,
          engine_capacity: vehicleData.engine_capacity,
          image_url: vehicleData.image_url,
          mot_status: vehicleData.mot_status,
          mot_expiry_date: vehicleData.mot_expiry_date,
          tax_status: vehicleData.tax_status,
          tax_due_date: vehicleData.tax_due_date,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (vehicleImage && data) {
        const imageUrl = await uploadVehicleImage(data.id);
        if (imageUrl) {
          await supabase
            .from('vehicles')
            .update({ image_url: imageUrl })
            .eq('id', data.id);
        }
      }

      setSuccess(`Vehicle added successfully! ${vehicleData.make} ${vehicleData.model}`);
      setVehicleNumber('');
      setVehicleImage(null);
      setImagePreview(null);
      setShowVehicleForm(false);
      await loadVehicles();
    } catch (err: any) {
      setError(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await updateProfile(editForm);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully!');
        setShowEditProfile(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleImageUpload = async (vehicleId: string, file: File) => {
    setError('');
    setSuccess('');
    setUploadingVehicleId(vehicleId);
    setUploadingImage(true);
    setUploadErrors(prev => ({ ...prev, [vehicleId]: null }));

    try {
      if (file.size > 10 * 1024 * 1024) {
        const errorMsg = 'Image size must be less than 10MB';
        setError(errorMsg);
        setUploadErrors(prev => ({ ...prev, [vehicleId]: errorMsg }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        const errorMsg = 'Please select an image file';
        setError(errorMsg);
        setUploadErrors(prev => ({ ...prev, [vehicleId]: errorMsg }));
        return;
      }

      if (!profile?.id) {
        const errorMsg = 'Profile not found';
        setError(errorMsg);
        setUploadErrors(prev => ({ ...prev, [vehicleId]: errorMsg }));
        return;
      }

      const { optimizedPath, thumbnailPath, optimizedUrl, thumbnailUrl } = await uploadVehiclePhoto(
        profile.id,
        vehicleId,
        file,
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [vehicleId]: progress }));
        }
      );

      const { error: updateError } = await supabase
        .from('vehicles')
        .update({
          vehicle_front_photo_path: optimizedPath,
          vehicle_front_photo_thumb_path: thumbnailPath,
          vehicle_photo_url: optimizedUrl,
          image_url: optimizedUrl
        })
        .eq('id', vehicleId);

      if (updateError) throw updateError;

      setSuccess('Vehicle photo uploaded and optimized!');
      setLocalPreviews(prev => ({ ...prev, [vehicleId]: null }));
      setUploadProgress(prev => ({ ...prev, [vehicleId]: 100 }));
      await loadVehicles();
      setTimeout(() => {
        setSuccess('');
        setUploadProgress(prev => ({ ...prev, [vehicleId]: undefined }));
      }, 3000);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to upload vehicle photo';
      setError(errorMsg);
      setUploadErrors(prev => ({ ...prev, [vehicleId]: errorMsg }));
    } finally {
      setUploadingVehicleId(null);
      setUploadingImage(false);
    }
  };

  const handleRemoveVehiclePhoto = async (vehicleId: string) => {
    try {
      setUploadErrors(prev => ({ ...prev, [vehicleId]: null }));

      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle?.vehicle_front_photo_path) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('user-media')
            .remove([vehicle.vehicle_front_photo_path, vehicle.vehicle_front_photo_thumb_path || ''].filter(Boolean));
          if (deleteError) console.error('Storage deletion error:', deleteError);
        } catch (err) {
          console.error('Failed to delete storage file:', err);
        }
      }

      const { error } = await supabase
        .from('vehicles')
        .update({
          image_url: null,
          vehicle_photo_url: null,
          vehicle_front_photo_path: null,
          vehicle_front_photo_thumb_path: null,
        })
        .eq('id', vehicleId);

      if (error) throw error;

      setSuccess('Photo removed successfully');
      setVehicleToRemovePhoto(null);
      setLocalPreviews(prev => ({ ...prev, [vehicleId]: null }));
      await loadVehicles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove photo');
      setUploadErrors(prev => ({ ...prev, [vehicleId]: err.message }));
      console.error('Photo removal error:', err);
    }
  };

  const confirmDeleteVehicle = async (vehicleId: string) => {
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle?.vehicle_front_photo_path) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('user-media')
            .remove([vehicle.vehicle_front_photo_path, vehicle.vehicle_front_photo_thumb_path || ''].filter(Boolean));
          if (deleteError) console.error('Storage deletion error:', deleteError);
        } catch (err) {
          console.error('Failed to delete storage file:', err);
        }
      }

      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: false })
        .eq('id', vehicleId);

      if (error) throw error;

      setSuccess('Vehicle deleted successfully');
      setVehicleToDelete(null);
      await loadVehicles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete vehicle');
      console.error('Vehicle deletion error:', err);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    setError('');
    setSuccess('');
    setUploadingProfileImage(true);

    try {
      // Validate profile photo (includes face detection)
      const validation = await validateProfilePhoto(file);

      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      if (!profile?.id) {
        setError('Profile not found');
        return;
      }

      const { optimizedPath, thumbnailPath, optimizedUrl, thumbnailUrl } = await uploadProfilePhoto(
        profile.id,
        file,
        (progress) => console.log(`Upload progress: ${progress}%`)
      );

      const { error: updateError } = await updateProfile({
        profile_photo_path: optimizedPath,
        profile_photo_thumb_path: thumbnailPath,
        profile_photo_url: optimizedUrl,
        avatar_url: optimizedUrl,
        profile_verified: true
      } as any);

      if (updateError) throw updateError;

      setSuccess('Profile photo uploaded and verified! Face detected successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile photo');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Get profile photo URL, with fallback to converting path to URL
  const profilePhotoUrl = profile.profile_photo_url
    || profile.avatar_url
    || ((profile as any).profile_photo_path ? getPublicUrlSync((profile as any).profile_photo_path) : '');

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={profile.full_name} className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-blue-600">
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {profile.profile_verified && (
              <div className="absolute top-0 right-0 p-1 bg-green-500 text-white rounded-full shadow-lg" title="Face verified">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={profileImageInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleProfileImageUpload(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => profileImageInputRef.current?.click()}
              disabled={uploadingProfileImage}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-lg"
              title="Upload profile photo (must contain face)"
            >
              {uploadingProfileImage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
              {profile.profile_verified && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Face Verified
                </span>
              )}
              {profile.is_verified && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Verified
                </span>
              )}
            </div>
            {uploadingProfileImage && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Detecting face in photo... This may take a moment.
              </div>
            )}
            {!profile.profile_verified && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Upload a clear face photo to get verified. This improves trust and safety in the community.</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm md:text-base text-gray-600">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-current" />
                {profile.average_rating.toFixed(1)} rating
              </span>
              <span className="hidden md:inline">•</span>
              <span>{profile.total_rides_offered} rides offered</span>
              <span className="hidden md:inline">•</span>
              <span>{profile.total_rides_taken} rides taken</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => navigate('/security')}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Security
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <p className="text-gray-900">{profile.email}</p>
          </div>

          {profile.phone && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <p className="text-gray-900">{profile.phone}</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Member Since
            </label>
            <p className="text-gray-900">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {profile.bio && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                About
              </label>
              <p className="text-gray-900">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      <ProfileCompletionTracker />

      <StatisticsDashboard />

      <RideAnalyticsDashboard />

      <TrustScoreVisualization />

      <DocumentUploadCenter />

      <PasskeyManagement />

      <EmergencyContactsManager />

      <PrivacyControls />

      <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="w-6 h-6" />
            My Vehicles
          </h3>
          <button
            onClick={() => setShowVehicleForm(!showVehicleForm)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {success}
          </div>
        )}

        {showVehicleForm && (
          <form onSubmit={addVehicle} className="mb-6 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Add New Vehicle</h4>
              <button
                type="button"
                onClick={() => {
                  setShowVehicleForm(false);
                  setVehicleNumber('');
                  setVehicleImage(null);
                  setImagePreview(null);
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number (License Plate)
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g., ABC-1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your vehicle's license plate number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Photo (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={loading}
                />
                <div className="flex flex-col gap-3">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={imagePreview}
                        alt="Vehicle preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600"
                      disabled={loading}
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">Upload Vehicle Photo</span>
                      <span className="text-xs text-gray-500">Any image up to 10MB (auto-optimized)</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? (uploadingImage ? 'Uploading image...' : 'Adding...') : 'Add Vehicle'}
              </button>
            </div>
          </form>
        )}

        {vehicles.length === 0 && !showVehicleForm ? (
          <div className="text-center py-12 text-gray-500">
            <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="font-medium mb-2">No vehicles added yet</p>
            <p className="text-sm">Add a vehicle to start offering rides</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="relative w-full sm:w-32 h-48 sm:h-24 flex-shrink-0">
                  {localPreviews[vehicle.id] || vehicle.image_url ? (
                    <>
                      <img
                        src={localPreviews[vehicle.id] || vehicle.image_url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {uploadProgress[vehicle.id] !== undefined && uploadProgress[vehicle.id] < 100 && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                          <div className="text-white text-sm font-medium">{uploadProgress[vehicle.id]}%</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center">
                      <Car className="w-12 h-12 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => vehicleImageInputRefs.current[vehicle.id] = el}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        setLocalPreviews(prev => ({ ...prev, [vehicle.id]: previewUrl }));
                        handleVehicleImageUpload(vehicle.id, file);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    {(vehicle.image_url || localPreviews[vehicle.id]) && (
                      <button
                        onClick={() => setVehicleToRemovePhoto(vehicle.id)}
                        disabled={uploadingVehicleId === vehicle.id}
                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:bg-red-300 shadow-lg"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => vehicleImageInputRefs.current[vehicle.id]?.click()}
                      disabled={uploadingVehicleId === vehicle.id}
                      className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow-lg"
                      title={vehicle.image_url ? "Change image" : "Upload image"}
                    >
                      {uploadingVehicleId === vehicle.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 w-full">
                      <p className="font-semibold text-gray-900 text-lg truncate">{vehicle.make} {vehicle.model}</p>
                      <p className="text-sm text-gray-600 mb-2">{vehicle.license_plate}</p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {vehicle.mot_status && (
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-medium ${
                            vehicle.mot_status.toLowerCase() === 'valid' || vehicle.mot_status.toLowerCase() === 'not valid'
                              ? isDateExpired(vehicle.mot_expiry_date)
                                ? 'bg-red-100 text-red-700'
                                : isDateExpiringSoon(vehicle.mot_expiry_date)
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {vehicle.mot_status.toLowerCase() === 'valid' && !isDateExpired(vehicle.mot_expiry_date) ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            MOT: {vehicle.mot_status}
                            {vehicle.mot_expiry_date && ` (${new Date(vehicle.mot_expiry_date).toLocaleDateString('en-GB')})`}
                          </span>
                        )}
                        {vehicle.tax_status && (
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 font-medium ${
                            vehicle.tax_status.toLowerCase() === 'taxed'
                              ? isDateExpired(vehicle.tax_due_date)
                                ? 'bg-red-100 text-red-700'
                                : isDateExpiringSoon(vehicle.tax_due_date)
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                              : vehicle.tax_status.toLowerCase() === 'sorn'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {vehicle.tax_status.toLowerCase() === 'taxed' && !isDateExpired(vehicle.tax_due_date) ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            TAX: {vehicle.tax_status}
                            {vehicle.tax_due_date && ` (${new Date(vehicle.tax_due_date).toLocaleDateString('en-GB')})`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {vehicle.color && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full border border-gray-300" style={{backgroundColor: vehicle.color.toLowerCase()}}></span>
                            {vehicle.color}
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {vehicle.capacity} seats
                        </span>
                        {vehicle.fuel_type && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                            {vehicle.fuel_type}
                          </span>
                        )}
                        {vehicle.year && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {vehicle.year}
                          </span>
                        )}
                        {vehicle.engine_capacity && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {vehicle.engine_capacity}cc
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setVehicleToDelete(vehicle.id)}
                      className="w-full sm:w-auto px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      Delete Vehicle
                    </button>
                  </div>

                  {profile?.email === 'admin@carpoolnetwork.co.uk' && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono space-y-1">
                      <div className="font-semibold text-gray-700 mb-2">Debug Info (Admin Only)</div>
                      <div className="text-gray-600">
                        <div>ID: {vehicle.id}</div>
                        <div>Path: {vehicle.vehicle_front_photo_path || 'None'}</div>
                        <div>URL: {vehicle.image_url ? '✓ Set' : '✗ None'}</div>
                        <div>Upload: {uploadProgress[vehicle.id] ? `${uploadProgress[vehicle.id]}%` : 'Idle'}</div>
                        {uploadErrors[vehicle.id] && (
                          <div className="text-red-600 mt-1">Error: {uploadErrors[vehicle.id]}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Ride Preferences</h3>
          {preferencesSaving && (
            <span className="text-sm text-blue-600">Saving...</span>
          )}
        </div>

        {preferencesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Auto-accept ride requests</p>
                <p className="text-sm text-gray-600 mt-1">Automatically accept matching ride requests</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.auto_accept_rides}
                  onChange={(e) => updatePreference('auto_accept_rides', e.target.checked)}
                  disabled={preferencesSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Instant booking</p>
                <p className="text-sm text-gray-600 mt-1">Allow passengers to book without approval</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.instant_booking_enabled}
                  onChange={(e) => updatePreference('instant_booking_enabled', e.target.checked)}
                  disabled={preferencesSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">No smoking</p>
                <p className="text-sm text-gray-600 mt-1">Smoking is not allowed in your vehicle</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.smoking_policy === 'no-smoking'}
                  onChange={(e) => updatePreference('smoking_policy', e.target.checked ? 'no-smoking' : 'smoking-allowed')}
                  disabled={preferencesSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Pets allowed</p>
                <p className="text-sm text-gray-600 mt-1">Allow passengers to bring pets</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.pets_allowed}
                  onChange={(e) => updatePreference('pets_allowed', e.target.checked)}
                  disabled={preferencesSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Music allowed</p>
                <p className="text-sm text-gray-600 mt-1">Passengers can request music during the ride</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.music_preference !== 'no-music'}
                  onChange={(e) => updatePreference('music_preference', e.target.checked ? 'any' : 'no-music')}
                  disabled={preferencesSaving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-start sm:items-center justify-between gap-4 py-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Conversation level</p>
                <p className="text-sm text-gray-600 mt-1">Prefer chatty or quiet rides</p>
              </div>
              <select
                value={preferences.conversation_level}
                onChange={(e) => updatePreference('conversation_level', e.target.value)}
                disabled={preferencesSaving}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="any">Any</option>
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="chatty">Chatty</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <ReviewsDisplay />

      <FriendsManager />

      <AchievementsBadges />

      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => {
                  setShowEditProfile(false);
                  setError('');
                  setEditForm({
                    full_name: profile?.full_name || '',
                    phone: profile?.phone || '',
                    bio: profile?.bio || '',
                    whatsapp_number: (profile as any)?.whatsapp_number || '',
                    preferred_contact_method: (profile as any)?.preferred_contact_method || 'both',
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+44 1234 567890"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Tell us about yourself..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number (Optional)
                </label>
                <input
                  type="tel"
                  value={editForm.whatsapp_number}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+44 1234 567890"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Other users can contact you via WhatsApp if provided</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={editForm.preferred_contact_method}
                  onChange={(e) => setEditForm({ ...editForm, preferred_contact_method: e.target.value as 'in_app' | 'whatsapp' | 'both' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="both">Both (In-app & WhatsApp)</option>
                  <option value="in_app">In-app Messages Only</option>
                  <option value="whatsapp">WhatsApp Only</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setError('');
                    setEditForm({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      bio: profile?.bio || '',
                      whatsapp_number: (profile as any)?.whatsapp_number || '',
                      preferred_contact_method: (profile as any)?.preferred_contact_method || 'both',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {vehicleToRemovePhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Photo?</h3>
            <p className="text-gray-600 mb-6">
              This will remove the photo from this vehicle. The vehicle will remain.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVehicleToRemovePhoto(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemoveVehiclePhoto(vehicleToRemovePhoto)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {vehicleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Vehicle?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this vehicle. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteVehicle(vehicleToDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
