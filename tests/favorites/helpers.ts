import { vi } from 'vitest';

/* ───── factories ───── */

export function makeFavoriteDriver(overrides?: Partial<any>) {
  return {
    id: 'fav-1',
    user_id: 'user-1',
    driver_id: 'driver-1',
    nickname: '',
    notes: '',
    ride_count: 5,
    last_ride_at: '2025-06-10T10:00:00Z',
    driver: {
      id: 'driver-1',
      full_name: 'Jane Smith',
      average_rating: 4.8,
      profile_photo_url: 'https://example.com/photo.jpg',
      avatar_url: null,
    },
    ...overrides,
  };
}

export function makeSavedRoute(overrides?: Partial<any>) {
  return {
    id: 'route-1',
    user_id: 'user-1',
    name: 'Daily Commute',
    origin: '123 Home Street, London',
    destination: '456 Office Road, London',
    preferred_departure_time: '08:30',
    preferred_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    is_default: false,
    use_count: 12,
    last_used_at: '2025-06-08T08:30:00Z',
    ...overrides,
  };
}
