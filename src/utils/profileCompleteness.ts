export type ProfileCompletenessInput = {
  full_name?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  phone_e164?: string | null;
  phone_verified?: boolean | null;
  country?: string | null;
};

export function getProfileMissingFields(profile: ProfileCompletenessInput | null): string[] {
  if (!profile) {
    return ['full_name', 'avatar', 'phone', 'phone_verified', 'country'];
  }

  const missing: string[] = [];
  const name = profile.full_name?.trim() || '';
  const hasAvatar = Boolean(profile.avatar_url || profile.profile_photo_url);
  const hasPhone = Boolean(profile.phone_e164);
  const hasCountry = Boolean(profile.country)

  if (name.length < 2) missing.push('full_name');
  if (!hasAvatar) missing.push('avatar');
  if (!hasPhone) missing.push('phone');
  if (!profile.phone_verified) missing.push('phone_verified');
  if (!hasCountry) missing.push('country');

  return missing;
}

export function isProfileComplete(profile: ProfileCompletenessInput | null): boolean {
  return getProfileMissingFields(profile).length === 0;
}
