/**
 * Shared fixtures, factories, and mock builders for Settings module tests.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_USER_ID = 'user-settings-001';

export const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Jane Settings',
  email: 'jane@settings.test',
  bio: 'Test bio text',
  phone_e164: '+447123456789',
  phone: '+447123456789',
  whatsapp_number: '+447987654321',
  date_of_birth: '1990-05-15',
  gender: 'female',
  city: 'London',
  country: 'United Kingdom',
  language: 'en',
  timezone: 'UTC',
  email_verified: true,
  profile_completion_percentage: 85,
  created_at: '2024-01-15T10:00:00Z',
  avatar_url: null,
};

export const FAKE_EMPTY_PROFILE = {
  id: FAKE_USER_ID,
  full_name: '',
  email: 'jane@settings.test',
  bio: '',
  phone_e164: '',
  phone: '',
  whatsapp_number: '',
  date_of_birth: '',
  gender: '',
  city: '',
  country: '',
  language: 'en',
  timezone: 'UTC',
  email_verified: false,
  profile_completion_percentage: 10,
  created_at: '2024-01-15T10:00:00Z',
  avatar_url: null,
};

// ---------------------------------------------------------------------------
// Preference fixtures
// ---------------------------------------------------------------------------

export const FAKE_APPEARANCE_PREFS = {
  user_id: FAKE_USER_ID,
  theme: 'light',
  font_size: 'medium',
  distance_unit: 'km',
  temperature_unit: 'celsius',
  time_format: '24h',
  date_format: 'DMY',
  map_style: 'standard',
  reduce_motion: false,
  high_contrast: false,
};

export const FAKE_NOTIFICATION_PREFS = {
  user_id: FAKE_USER_ID,
  ride_notifications: true,
  message_notifications: true,
  system_notifications: true,
  social_notifications: true,
  challenge_notifications: true,
  dnd_enabled: false,
  dnd_start_time: '22:00',
  dnd_end_time: '08:00',
  push_enabled: false,
  email_enabled: true,
  sms_enabled: false,
};

export const FAKE_ACCESSIBILITY_PREFS = {
  user_id: FAKE_USER_ID,
  screen_reader_enabled: false,
  large_text: false,
  high_contrast: false,
  reduce_motion: false,
  color_blind_mode: 'none',
  haptic_feedback: true,
  voice_commands: false,
  keyboard_navigation: true,
  captions_enabled: false,
  sound_alerts: true,
};

// ---------------------------------------------------------------------------
// buildMockChain — Supabase query builder mock
// ---------------------------------------------------------------------------

export function buildMockChain(data: any = [], error: any = null) {
  const isArray = Array.isArray(data);
  const thenable = {
    then(resolve: (val: any) => void) {
      resolve({ data, error, count: isArray ? data.length : data ? 1 : 0 });
      return thenable;
    },
  };

  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: isArray ? data[0] ?? null : data, error });
        return { then: (r: any) => r({ data: isArray ? data[0] ?? null : data, error }) };
      },
    }),
    maybeSingle: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: isArray ? data[0] ?? null : data, error });
        return { then: (r: any) => r({ data: isArray ? data[0] ?? null : data, error }) };
      },
    }),
    then: thenable.then,
  };

  return chain;
}
