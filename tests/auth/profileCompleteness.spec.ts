/**
 * profileCompleteness.spec.ts — Enterprise-grade tests for profile validation
 *
 * Tests: null profile, empty profile, partial completion, all-complete,
 * edge cases (whitespace-only names, short names), avatar fallback logic.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  getProfileMissingFields,
  isProfileComplete,
  type ProfileCompletenessInput,
} from '../../src/utils/profileCompleteness';

const FULL_PROFILE: ProfileCompletenessInput = {
  full_name: 'Jane Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  profile_photo_url: null,
  phone_e164: '+447700900000',
  phone_verified: true,
  country: 'United Kingdom',
  city: 'London',
  nationality: 'British',
  date_of_birth: '1990-01-15',
  gender: 'female',
};

describe('getProfileMissingFields', () => {
  // -----------------------------------------------------------------------
  // Null / empty
  // -----------------------------------------------------------------------
  it('returns all 9 fields for null profile', () => {
    const missing = getProfileMissingFields(null);
    expect(missing).toHaveLength(9);
    expect(missing).toEqual(
      expect.arrayContaining([
        'full_name', 'avatar', 'phone', 'phone_verified',
        'country', 'city', 'nationality', 'date_of_birth', 'gender',
      ]),
    );
  });

  it('returns all fields for empty object', () => {
    expect(getProfileMissingFields({})).toHaveLength(9);
  });

  // -----------------------------------------------------------------------
  // Complete profile
  // -----------------------------------------------------------------------
  it('returns empty array for fully complete profile', () => {
    expect(getProfileMissingFields(FULL_PROFILE)).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Avatar fallback: profile_photo_url counts as avatar
  // -----------------------------------------------------------------------
  it('accepts profile_photo_url as avatar', () => {
    const profile = { ...FULL_PROFILE, avatar_url: null, profile_photo_url: 'https://photo.jpg' };
    expect(getProfileMissingFields(profile)).not.toContain('avatar');
  });

  it('marks avatar missing when both avatar fields are null', () => {
    const profile = { ...FULL_PROFILE, avatar_url: null, profile_photo_url: null };
    expect(getProfileMissingFields(profile)).toContain('avatar');
  });

  // -----------------------------------------------------------------------
  // Name validation — minimum 2 characters after trim
  // -----------------------------------------------------------------------
  it('marks full_name missing for single character', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, full_name: 'A' })).toContain('full_name');
  });

  it('marks full_name missing for whitespace-only', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, full_name: '   ' })).toContain('full_name');
  });

  it('accepts 2-character name', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, full_name: 'Al' })).not.toContain('full_name');
  });

  it('marks full_name missing for null', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, full_name: null })).toContain('full_name');
  });

  // -----------------------------------------------------------------------
  // Phone verification — must be both present AND verified
  // -----------------------------------------------------------------------
  it('marks phone_verified missing when phone exists but not verified', () => {
    const profile = { ...FULL_PROFILE, phone_verified: false };
    const missing = getProfileMissingFields(profile);
    expect(missing).toContain('phone_verified');
    expect(missing).not.toContain('phone');
  });

  it('marks phone missing when phone_e164 is null', () => {
    const profile = { ...FULL_PROFILE, phone_e164: null };
    expect(getProfileMissingFields(profile)).toContain('phone');
  });

  // -----------------------------------------------------------------------
  // Individual field removal
  // -----------------------------------------------------------------------
  const fieldTests: [keyof ProfileCompletenessInput, string][] = [
    ['country', 'country'],
    ['city', 'city'],
    ['nationality', 'nationality'],
    ['date_of_birth', 'date_of_birth'],
    ['gender', 'gender'],
  ];

  it.each(fieldTests)('detects missing %s', (field, expected) => {
    const profile = { ...FULL_PROFILE, [field]: null };
    expect(getProfileMissingFields(profile)).toContain(expected);
  });

  // -----------------------------------------------------------------------
  // Whitespace-only string fields
  // -----------------------------------------------------------------------
  it('marks city missing for whitespace-only string', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, city: '   ' })).toContain('city');
  });

  it('marks nationality missing for whitespace-only string', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, nationality: '  \t ' })).toContain('nationality');
  });

  it('marks gender missing for whitespace-only string', () => {
    expect(getProfileMissingFields({ ...FULL_PROFILE, gender: '  ' })).toContain('gender');
  });
});

describe('isProfileComplete', () => {
  it('returns true for a complete profile', () => {
    expect(isProfileComplete(FULL_PROFILE)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it('returns false when any single field is missing', () => {
    expect(isProfileComplete({ ...FULL_PROFILE, country: null })).toBe(false);
  });
});
