export type ProfileCompletenessInput = {
  full_name?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  phone_e164?: string | null;
  phone_verified?: boolean | null;
  country?: string | null;
  city?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
};

export function getProfileMissingFields(profile: ProfileCompletenessInput | null): string[] {
  if (!profile) {
    return ['full_name', 'avatar', 'phone', 'phone_verified', 'country', 'city', 'nationality', 'date_of_birth', 'gender'];
  }

  const missing: string[] = [];
  const name = profile.full_name?.trim() || '';
  const hasAvatar = Boolean(profile.avatar_url || profile.profile_photo_url);
  const hasPhone = Boolean(profile.phone_e164);
  const hasCountry = Boolean(profile.country);

  if (name.length < 2) missing.push('full_name');
  if (!hasAvatar) missing.push('avatar');
  if (!hasPhone) missing.push('phone');
  if (!profile.phone_verified) missing.push('phone_verified');
  if (!hasCountry) missing.push('country');
  if (!profile.city?.trim()) missing.push('city');
  if (!profile.nationality?.trim()) missing.push('nationality');
  if (!profile.date_of_birth) missing.push('date_of_birth');
  if (!profile.gender?.trim()) missing.push('gender');

  return missing;
}

export function isProfileComplete(profile: ProfileCompletenessInput | null): boolean {
  return getProfileMissingFields(profile).length === 0;
}
