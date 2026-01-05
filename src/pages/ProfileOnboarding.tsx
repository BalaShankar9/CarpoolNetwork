import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { countryCodes, defaultCountry } from '../data/countryCodes';
import { normalizePhoneNumber } from '../utils/phone';
import { getProfileMissingFields } from '../utils/profileCompleteness';
import PhoneVerificationStep from '../components/onboarding/PhoneVerificationStep';

type StepKey = 'basics' | 'photo' | 'phone' | 'details' | 'ethnicity';

const steps: { key: StepKey; title: string; description: string }[] = [
  {
    key: 'basics',
    title: 'Basics',
    description: 'Name and location',
  },
  {
    key: 'photo',
    title: 'Profile Photo',
    description: 'Upload a clear photo',
  },
  {
    key: 'phone',
    title: 'Verify Phone',
    description: 'Confirm your phone number',
  },
  {
    key: 'details',
    title: 'Details',
    description: 'Bio, languages, WhatsApp',
  },
  {
    key: 'ethnicity',
    title: 'Optional',
    description: 'Sensitive data with consent',
  },
];

export default function ProfileOnboarding() {
  const { user, profile, updateProfile, isProfileComplete, profileMissingFields } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [basicForm, setBasicForm] = useState({
    full_name: '',
    country: '',
    city: '',
  });
  const [detailsForm, setDetailsForm] = useState({
    bio: '',
    languages: '',
    whatsapp_e164: '',
    phone_visibility: 'ride_only' as 'none' | 'friends' | 'ride_only' | 'anyone',
    whatsapp_visibility: 'friends' as 'none' | 'friends' | 'ride_only' | 'anyone',
  });
  const [ethnicityForm, setEthnicityForm] = useState({
    consent: false,
    ethnicity: '',
    visibility: 'none' as 'none' | 'friends' | 'anyone',
  });

  const returnTo = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (!profile) return;
    setBasicForm({
      full_name: profile.full_name || '',
      country: profile.country_of_residence || profile.country || '',
      city: profile.city || '',
    });
    setDetailsForm({
      bio: profile.bio || '',
      languages: (profile.languages || []).join(', '),
      whatsapp_e164: profile.whatsapp_e164 || profile.whatsapp_number || '',
      phone_visibility: profile.phone_visibility || 'ride_only',
      whatsapp_visibility: profile.whatsapp_visibility || 'friends',
    });
    setEthnicityForm({
      consent: profile.ethnicity_consent || false,
      ethnicity: profile.ethnicity || '',
      visibility: profile.ethnicity_visibility || 'none',
    });
  }, [profile]);

  const initialStep = useMemo(() => {
    if (!profile) return 0;
    const missing = getProfileMissingFields(profile);
    if (missing.includes('full_name') || missing.includes('country')) {
      return 0;
    }
    if (missing.includes('avatar')) {
      return 1;
    }
    if (missing.includes('phone') || missing.includes('phone_verified')) {
      return 2;
    }
    return 3;
  }, [profile]);

  useEffect(() => {
    if (!initialized) {
      setCurrentStep(initialStep);
      setInitialized(true);
    }
  }, [initialStep, initialized]);

  if (!user) {
    return null;
  }

  const handleBasicsSave = async () => {
    setError('');
    if (!basicForm.full_name.trim() || basicForm.full_name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!basicForm.country.trim()) {
      setError('Please select your country.');
      return;
    }
    setSaving(true);
    const updates = {
      full_name: basicForm.full_name.trim(),
      country: basicForm.country.trim(),
      country_of_residence: basicForm.country.trim(),
      city: basicForm.city.trim() || null,
    };
    const { error: updateError } = await updateProfile(updates);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save profile.');
      return;
    }

    setCurrentStep(1);
  };

  const handlePhotoSelect = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be smaller than 3MB.');
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;
      setPhotoPreview(avatarUrl);

      const { error: updateError } = await updateProfile({
        avatar_url: avatarUrl,
        profile_photo_url: avatarUrl,
      });

      if (updateError) throw updateError;

      setCurrentStep(2);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhoneVerified = async (phoneE164: string) => {
    setError('');
    const { error: updateError } = await updateProfile({
      phone_e164: phoneE164,
      phone: phoneE164,
      phone_number: phoneE164,
      phone_verified: true,
    });

    if (updateError) {
      setError(updateError.message || 'Failed to save verified phone.');
      return;
    }

    setCurrentStep(3);
  };

  const handleDetailsSave = async () => {
    setError('');
    const languages = detailsForm.languages
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let whatsappE164: string | null = null;
    if (detailsForm.whatsapp_e164.trim()) {
      const normalized = normalizePhoneNumber(detailsForm.whatsapp_e164.trim());
      if (!normalized.isValid || !normalized.e164) {
        setError(normalized.error || 'Enter a valid WhatsApp number in E.164 format.');
        return;
      }
      whatsappE164 = normalized.e164;
    }

    setSaving(true);
    const { error: updateError } = await updateProfile({
      bio: detailsForm.bio.trim() || null,
      languages: languages.length ? languages : null,
      whatsapp_e164: whatsappE164,
      whatsapp_number: whatsappE164,
      phone_visibility: detailsForm.phone_visibility,
      whatsapp_visibility: detailsForm.whatsapp_visibility,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save details.');
      return;
    }

    setCurrentStep(4);
  };

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    const updates = {
      ethnicity_consent: ethnicityForm.consent,
      ethnicity: ethnicityForm.consent ? ethnicityForm.ethnicity.trim() || null : null,
      ethnicity_visibility: ethnicityForm.consent ? ethnicityForm.visibility : 'none',
      onboarding_completed: true,
    };
    const { error: updateError } = await updateProfile(updates);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to complete onboarding.');
      return;
    }

    navigate(returnTo);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (isProfileComplete && profileMissingFields.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile complete</h1>
            <p className="text-gray-600">You are ready to post and request rides.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(returnTo)}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
            <p className="text-gray-600">Required before posting or requesting rides.</p>
          </div>
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {step.title}: {step.description}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step.key === 'basics' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name *
              </label>
              <input
                type="text"
                value={basicForm.full_name}
                onChange={(e) => setBasicForm({ ...basicForm, full_name: e.target.value })}
                data-testid="onboarding-full-name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country of residence *
              </label>
              <select
                value={basicForm.country}
                onChange={(e) => setBasicForm({ ...basicForm, country: e.target.value })}
                data-testid="onboarding-country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select country</option>
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City (Optional)
              </label>
              <input
                type="text"
                value={basicForm.city}
                onChange={(e) => setBasicForm({ ...basicForm, city: e.target.value })}
                data-testid="onboarding-city"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {step.key === 'photo' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {photoPreview || profile?.avatar_url ? (
                  <img
                    src={photoPreview || profile?.avatar_url || ''}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Upload a clear photo</p>
                <p className="text-xs text-gray-500">Max 3MB, JPG/PNG/WebP.</p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="onboarding-photo-input"
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handlePhotoSelect(file);
                    e.target.value = '';
                  }
                }}
              />
              {uploadingPhoto ? 'Uploading...' : 'Choose photo'}
            </label>
          </div>
        )}

        {step.key === 'phone' && (
          <div className="space-y-4">
            <PhoneVerificationStep onVerified={handlePhoneVerified} disabled={saving} />
          </div>
        )}

        {step.key === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio (optional)
              </label>
              <textarea
                value={detailsForm.bio}
                onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Languages (comma separated)
              </label>
              <input
                type="text"
                value={detailsForm.languages}
                onChange={(e) => setDetailsForm({ ...detailsForm, languages: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp number (optional, E.164)
              </label>
              <input
                type="tel"
                placeholder={defaultCountry.dialCode}
                value={detailsForm.whatsapp_e164}
                onChange={(e) => setDetailsForm({ ...detailsForm, whatsapp_e164: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone visibility
                </label>
                <select
                  value={detailsForm.phone_visibility}
                  onChange={(e) =>
                    setDetailsForm({
                      ...detailsForm,
                      phone_visibility: e.target.value as 'none' | 'friends' | 'ride_only' | 'anyone',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ride_only">Ride only</option>
                  <option value="friends">Friends</option>
                  <option value="anyone">Anyone</option>
                  <option value="none">No one</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp visibility
                </label>
                <select
                  value={detailsForm.whatsapp_visibility}
                  onChange={(e) =>
                    setDetailsForm({
                      ...detailsForm,
                      whatsapp_visibility: e.target.value as 'none' | 'friends' | 'ride_only' | 'anyone',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="friends">Friends</option>
                  <option value="ride_only">Ride only</option>
                  <option value="anyone">Anyone</option>
                  <option value="none">No one</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step.key === 'ethnicity' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={ethnicityForm.consent}
                onChange={(e) => setEthnicityForm({ ...ethnicityForm, consent: e.target.checked })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Share ethnicity (optional)</p>
                <p className="text-xs text-gray-500">
                  Only share if you consent. This is never required and not public by default.
                </p>
              </div>
            </div>
            {ethnicityForm.consent && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ethnicity
                  </label>
                  <input
                    type="text"
                    value={ethnicityForm.ethnicity}
                    onChange={(e) => setEthnicityForm({ ...ethnicityForm, ethnicity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={ethnicityForm.visibility}
                    onChange={(e) =>
                      setEthnicityForm({
                        ...ethnicityForm,
                        visibility: e.target.value as 'none' | 'friends' | 'anyone',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="none">Only me</option>
                    <option value="friends">Friends</option>
                    <option value="anyone">Anyone</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(currentStep - 1, 0))}
            disabled={currentStep === 0}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step.key === 'basics' && (
            <button
              type="button"
              onClick={handleBasicsSave}
              disabled={saving}
              data-testid="onboarding-basics-next"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step.key === 'photo' && (
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={uploadingPhoto || !profile?.avatar_url}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step.key === 'phone' && (
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={!profile?.phone_verified}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step.key === 'details' && (
            <button
              type="button"
              onClick={handleDetailsSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step.key === 'ethnicity' && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              data-testid="onboarding-finish"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : 'Finish'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
