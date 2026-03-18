/**
 * Enterprise-grade tests for safetyService
 * Covers: SAFETY_TIPS constant, emergency contacts CRUD, trip sharing,
 * SOS triggering (RPC + fallback), safety check-ins, trust badges,
 * safety score breakdown, helper functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains', 'upsert', 'head',
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    return chain;
  };
  return {
    from: vi.fn(() => makeFreshChain({ data: null, error: null })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    makeFreshChain,
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

// Mock crypto.getRandomValues for generateShareToken
const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) arr[i] = (i * 7 + 42) % 256;
  return arr;
});
vi.stubGlobal('crypto', { getRandomValues: mockGetRandomValues });

import {
  SAFETY_TIPS,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  createTripShare,
  getTripShareByToken,
  triggerSOS,
  createSafetyCheckIn,
  getUserTrustBadges,
  getSafetyScoreBreakdown,
} from '../../src/services/safetyService';

import {
  FAKE_USER_ID,
  FAKE_RIDE_ID,
  FAKE_BOOKING_ID,
  FAKE_CONTACT_ID,
  FAKE_EMERGENCY_CONTACT,
  FAKE_TRIP_SHARE,
  FAKE_PROFILE,
} from './helpers';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Reset from() to return a default chain
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY_TIPS constant
// ═══════════════════════════════════════════════════════════════════════════
describe('SAFETY_TIPS', () => {
  it('should have all 4 categories', () => {
    expect(Object.keys(SAFETY_TIPS)).toEqual(
      expect.arrayContaining(['first_ride', 'as_driver', 'as_passenger', 'night_rides'])
    );
    expect(Object.keys(SAFETY_TIPS)).toHaveLength(4);
  });

  it('each category should have at least 4 tips', () => {
    for (const [key, tips] of Object.entries(SAFETY_TIPS)) {
      expect(tips.length).toBeGreaterThanOrEqual(4);
      for (const tip of tips) {
        expect(typeof tip).toBe('string');
        expect(tip.length).toBeGreaterThan(10);
      }
    }
  });

  it('first_ride tips mention safety fundamentals', () => {
    const tips = SAFETY_TIPS.first_ride;
    expect(tips.some(t => t.toLowerCase().includes('share'))).toBe(true);
    expect(tips.some(t => t.toLowerCase().includes('verify') || t.toLowerCase().includes('photo'))).toBe(true);
  });

  it('as_driver tips include driver-specific advice', () => {
    const tips = SAFETY_TIPS.as_driver;
    expect(tips.some(t => t.toLowerCase().includes('passenger') || t.toLowerCase().includes('verify'))).toBe(true);
  });

  it('night_rides tips include low-light precautions', () => {
    const tips = SAFETY_TIPS.night_rides;
    expect(tips.some(t => t.toLowerCase().includes('lit') || t.toLowerCase().includes('light'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getEmergencyContacts
// ═══════════════════════════════════════════════════════════════════════════
describe('getEmergencyContacts', () => {
  it('should return contacts for user', async () => {
    const contacts = [FAKE_EMERGENCY_CONTACT, { ...FAKE_EMERGENCY_CONTACT, id: 'c2' }];
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: contacts, error: null })
    );

    const result = await getEmergencyContacts(FAKE_USER_ID);
    expect(result).toEqual(contacts);
    expect(mockSupabase.from).toHaveBeenCalledWith('emergency_contacts');
  });

  it('should return empty array when no contacts', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );
    const result = await getEmergencyContacts(FAKE_USER_ID);
    expect(result).toEqual([]);
  });

  it('should throw on error', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' } })
    );
    await expect(getEmergencyContacts(FAKE_USER_ID)).rejects.toEqual({ message: 'DB error' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// addEmergencyContact
// ═══════════════════════════════════════════════════════════════════════════
describe('addEmergencyContact', () => {
  const newContact = {
    name: 'John Doe',
    phone: '+0987654321',
    relationship: 'brother',
    notify_on_sos: true,
    notify_on_trip_start: false,
  };

  it('should add a contact successfully', async () => {
    // First call: getEmergencyContacts returns 2 existing
    const existingChain = mockSupabase.makeFreshChain({
      data: [FAKE_EMERGENCY_CONTACT, { ...FAKE_EMERGENCY_CONTACT, id: 'c2' }],
      error: null,
    });
    // Second call: insert
    const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-c', user_id: FAKE_USER_ID, ...newContact, created_at: '2026-01-15T10:00:00Z' },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      return callIdx === 1 ? existingChain : insertChain;
    });

    const result = await addEmergencyContact(FAKE_USER_ID, newContact);
    expect(result).toMatchObject({ name: 'John Doe' });
  });

  it('should throw when at maximum 5 contacts', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      ...FAKE_EMERGENCY_CONTACT,
      id: `c-${i}`,
    }));
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: five, error: null })
    );

    await expect(addEmergencyContact(FAKE_USER_ID, newContact))
      .rejects.toThrow('Maximum of 5 emergency contacts allowed');
  });

  it('should throw on insert error', async () => {
    const existingChain = mockSupabase.makeFreshChain({ data: [], error: null });
    const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
    insertChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      return callIdx === 1 ? existingChain : insertChain;
    });

    await expect(addEmergencyContact(FAKE_USER_ID, newContact))
      .rejects.toEqual({ message: 'Insert failed' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateEmergencyContact
// ═══════════════════════════════════════════════════════════════════════════
describe('updateEmergencyContact', () => {
  it('should update contact successfully', async () => {
    const updated = { ...FAKE_EMERGENCY_CONTACT, name: 'Updated Name' };
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: updated, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await updateEmergencyContact(FAKE_CONTACT_ID, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('should throw on error', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(updateEmergencyContact(FAKE_CONTACT_ID, { name: 'X' }))
      .rejects.toEqual({ message: 'Not found' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteEmergencyContact
// ═══════════════════════════════════════════════════════════════════════════
describe('deleteEmergencyContact', () => {
  it('should delete contact successfully', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );
    await expect(deleteEmergencyContact(FAKE_CONTACT_ID)).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('emergency_contacts');
  });

  it('should throw on error', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: { message: 'Delete failed' } })
    );
    await expect(deleteEmergencyContact(FAKE_CONTACT_ID))
      .rejects.toEqual({ message: 'Delete failed' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createTripShare
// ═══════════════════════════════════════════════════════════════════════════
describe('createTripShare', () => {
  it('should create a trip share with contact IDs', async () => {
    const tripShareData = {
      id: 'ts-1',
      ride_id: FAKE_RIDE_ID,
      booking_id: FAKE_BOOKING_ID,
      user_id: FAKE_USER_ID,
      share_token: 'generated-token',
      shared_with_contacts: [FAKE_CONTACT_ID],
      shared_via_link: false,
      expires_at: '2026-01-16T10:00:00Z',
    };
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: tripShareData, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await createTripShare(FAKE_RIDE_ID, FAKE_USER_ID, FAKE_BOOKING_ID, [FAKE_CONTACT_ID]);
    expect(result).toMatchObject({ ride_id: FAKE_RIDE_ID, shared_via_link: false });
  });

  it('should create link-based share when no contacts', async () => {
    const tripShareData = {
      id: 'ts-2',
      ride_id: FAKE_RIDE_ID,
      user_id: FAKE_USER_ID,
      share_token: 'generated-token',
      shared_with_contacts: [],
      shared_via_link: true,
      expires_at: '2026-01-16T10:00:00Z',
    };
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: tripShareData, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await createTripShare(FAKE_RIDE_ID, FAKE_USER_ID);
    expect(result).toMatchObject({ shared_via_link: true });
  });

  it('should throw on insert error', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert err' } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(createTripShare(FAKE_RIDE_ID, FAKE_USER_ID))
      .rejects.toEqual({ message: 'Insert err' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getTripShareByToken
// ═══════════════════════════════════════════════════════════════════════════
describe('getTripShareByToken', () => {
  it('should return trip share with in-progress ride and current location', async () => {
    const tripShareData = { ...FAKE_TRIP_SHARE };
    const trackingData = {
      current_location: { coordinates: [-122.4194, 37.7749] },
    };

    // First call: trip_shares query
    const shareChain = mockSupabase.makeFreshChain({ data: null, error: null });
    shareChain.single = vi.fn().mockResolvedValue({ data: tripShareData, error: null });
    // Second call: ride_tracking query
    const trackingChain = mockSupabase.makeFreshChain({ data: null, error: null });
    trackingChain.single = vi.fn().mockResolvedValue({ data: trackingData, error: null });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      return callIdx === 1 ? shareChain : trackingChain;
    });

    const result = await getTripShareByToken('abc123token');
    expect(result).not.toBeNull();
    expect(result!.currentLocation).toEqual({ latitude: 37.7749, longitude: -122.4194 });
    expect(result!.driver).toEqual(tripShareData.ride.driver);
  });

  it('should return trip share without location for non-in-progress ride', async () => {
    const tripShareData = {
      ...FAKE_TRIP_SHARE,
      ride: { ...FAKE_TRIP_SHARE.ride, status: 'scheduled' },
    };
    const shareChain = mockSupabase.makeFreshChain({ data: null, error: null });
    shareChain.single = vi.fn().mockResolvedValue({ data: tripShareData, error: null });
    mockSupabase.from.mockReturnValue(shareChain);

    const result = await getTripShareByToken('abc123token');
    expect(result).not.toBeNull();
    expect(result!.currentLocation).toBeUndefined();
  });

  it('should return null when token not found or expired', async () => {
    const shareChain = mockSupabase.makeFreshChain({ data: null, error: null });
    shareChain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockSupabase.from.mockReturnValue(shareChain);

    const result = await getTripShareByToken('invalid-token');
    expect(result).toBeNull();
  });

  it('should return null for in-progress ride without tracking data', async () => {
    const tripShareData = { ...FAKE_TRIP_SHARE };
    const shareChain = mockSupabase.makeFreshChain({ data: null, error: null });
    shareChain.single = vi.fn().mockResolvedValue({ data: tripShareData, error: null });
    const trackingChain = mockSupabase.makeFreshChain({ data: null, error: null });
    trackingChain.single = vi.fn().mockResolvedValue({ data: null, error: null });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      return callIdx === 1 ? shareChain : trackingChain;
    });

    const result = await getTripShareByToken('abc123token');
    expect(result).not.toBeNull();
    expect(result!.currentLocation).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// triggerSOS
// ═══════════════════════════════════════════════════════════════════════════
describe('triggerSOS', () => {
  it('should use RPC when rideId is provided and RPC succeeds', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ success: true, message: 'Emergency triggered via RPC' }],
      error: null,
    });

    const result = await triggerSOS(FAKE_USER_ID, FAKE_RIDE_ID, { latitude: 37.77, longitude: -122.42 });
    expect(result).toEqual({ success: true, message: 'Emergency triggered via RPC' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('trigger_ride_emergency', {
      p_ride_id: FAKE_RIDE_ID,
      p_lat: 37.77,
      p_lng: -122.42,
    });
  });

  it('should return default message if RPC returns empty data', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: [undefined], error: null });

    const result = await triggerSOS(FAKE_USER_ID, FAKE_RIDE_ID);
    expect(result).toEqual({ success: true, message: 'Emergency services notified' });
  });

  it('should fallback to manual alert when RPC fails', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

    // safety_alerts insert, getEmergencyContacts, notification_queue inserts
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const result = await triggerSOS(FAKE_USER_ID, FAKE_RIDE_ID, { latitude: 37.77, longitude: -122.42 });
    expect(result).toEqual({
      success: true,
      message: 'Emergency alert sent to contacts and safety team',
    });
  });

  it('should work without rideId (no-ride SOS)', async () => {
    // No RPC call — goes straight to manual
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const result = await triggerSOS(FAKE_USER_ID);
    expect(result).toEqual({
      success: true,
      message: 'Emergency alert sent to contacts and safety team',
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('should notify SOS-enabled contacts in fallback path', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const sosContact = { ...FAKE_EMERGENCY_CONTACT, notify_on_sos: true };
    const nonSosContact = { ...FAKE_EMERGENCY_CONTACT, id: 'c2', notify_on_sos: false };

    // First call: safety_alerts insert
    // Second call: emergency_contacts select (returns contacts)
    // Third+: notification_queue inserts
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 2) {
        // getEmergencyContacts
        return mockSupabase.makeFreshChain({ data: [sosContact, nonSosContact], error: null });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    await triggerSOS(FAKE_USER_ID, FAKE_RIDE_ID);
    // Only 1 notification queued (the SOS-enabled contact)
    const notifCalls = mockSupabase.from.mock.calls.filter(
      (c: any) => c[0] === 'notification_queue'
    );
    expect(notifCalls).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createSafetyCheckIn
// ═══════════════════════════════════════════════════════════════════════════
describe('createSafetyCheckIn', () => {
  it('should create an OK check-in', async () => {
    const checkInData = {
      id: 'ci-1',
      ride_id: FAKE_RIDE_ID,
      user_id: FAKE_USER_ID,
      status: 'ok',
      location: null,
      notes: null,
      created_at: '2026-01-15T10:00:00Z',
    };
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: checkInData, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await createSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID, 'ok');
    expect(result.status).toBe('ok');
    expect(mockSupabase.rpc).not.toHaveBeenCalled(); // No SOS triggered
  });

  it('should create check-in with location and notes', async () => {
    const location = { latitude: 37.77, longitude: -122.42 };
    const checkInData = {
      id: 'ci-2',
      ride_id: FAKE_RIDE_ID,
      user_id: FAKE_USER_ID,
      status: 'ok',
      location: `POINT(-122.42 37.77)`,
      notes: 'All good',
      created_at: '2026-01-15T10:00:00Z',
    };
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: checkInData, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await createSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID, 'ok', location, 'All good');
    expect(result.notes).toBe('All good');
  });

  it('should trigger SOS when status is help_needed', async () => {
    const checkInData = {
      id: 'ci-3',
      ride_id: FAKE_RIDE_ID,
      user_id: FAKE_USER_ID,
      status: 'help_needed',
      created_at: '2026-01-15T10:00:00Z',
    };

    // First from() call → safety_checkins insert
    const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
    insertChain.single = vi.fn().mockResolvedValue({ data: checkInData, error: null });

    // Subsequent from() calls for triggerSOS fallback
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return insertChain;
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    // triggerSOS with rideId will try RPC first
    mockSupabase.rpc.mockResolvedValue({
      data: [{ success: true, message: 'SOS' }],
      error: null,
    });

    const result = await createSafetyCheckIn(
      FAKE_RIDE_ID, FAKE_USER_ID, 'help_needed', { latitude: 37.77, longitude: -122.42 }
    );
    expect(result.status).toBe('help_needed');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('trigger_ride_emergency', expect.any(Object));
  });

  it('should throw on insert error', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(createSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID, 'ok'))
      .rejects.toEqual({ message: 'Insert failed' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getUserTrustBadges
// ═══════════════════════════════════════════════════════════════════════════
describe('getUserTrustBadges', () => {
  it('should return all 8 badge definitions with earned status', async () => {
    // Mock profile, rides as driver, rides as passenger
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // profiles
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({ data: FAKE_PROFILE, error: null });
        return chain;
      }
      if (callIdx === 2) {
        // rides as driver
        return mockSupabase.makeFreshChain({ data: null, error: null, count: 30 });
      }
      if (callIdx === 3) {
        // ride_bookings as passenger
        return mockSupabase.makeFreshChain({ data: null, error: null, count: 20 });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    expect(badges).toHaveLength(8);

    const ids = badges.map(b => b.id);
    expect(ids).toContain('email_verified');
    expect(ids).toContain('phone_verified');
    expect(ids).toContain('id_verified');
    expect(ids).toContain('photo_verified');
    expect(ids).toContain('trusted_member');
    expect(ids).toContain('veteran');
    expect(ids).toContain('super_driver');
    expect(ids).toContain('reliable');
  });

  it('should mark email_verified badge as earned when profile has email_verified=true', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({ data: { ...FAKE_PROFILE, email_verified: true }, error: null });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const emailBadge = badges.find(b => b.id === 'email_verified');
    expect(emailBadge?.earned).toBe(true);
  });

  it('should mark photo_verified based on profile_photo_url', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, profile_photo_url: null },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const photoBadge = badges.find(b => b.id === 'photo_verified');
    expect(photoBadge?.earned).toBe(false);
  });

  it('should mark trusted_member when 10+ rides and 4.0+ rating', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, average_rating: 4.2 },
          error: null,
        });
        return chain;
      }
      if (callIdx === 2) return mockSupabase.makeFreshChain({ data: null, error: null, count: 6 });
      if (callIdx === 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 5 });
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const trusted = badges.find(b => b.id === 'trusted_member');
    // 6 + 5 = 11 >= 10 and 4.2 >= 4.0
    expect(trusted?.earned).toBe(true);
  });

  it('should NOT mark trusted_member when rides < 10', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, average_rating: 4.5 },
          error: null,
        });
        return chain;
      }
      if (callIdx === 2) return mockSupabase.makeFreshChain({ data: null, error: null, count: 3 });
      if (callIdx === 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 4 });
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const trusted = badges.find(b => b.id === 'trusted_member');
    // 3 + 4 = 7 < 10
    expect(trusted?.earned).toBe(false);
  });

  it('should mark super_driver when 50+ driver rides and 4.5+ rating', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, average_rating: 4.6 },
          error: null,
        });
        return chain;
      }
      if (callIdx === 2) return mockSupabase.makeFreshChain({ data: null, error: null, count: 55 });
      if (callIdx === 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 10 });
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const superDriver = badges.find(b => b.id === 'super_driver');
    expect(superDriver?.earned).toBe(true);
  });

  it('should mark reliable when reliability_score >= 90', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, reliability_score: 95 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const reliable = badges.find(b => b.id === 'reliable');
    expect(reliable?.earned).toBe(true);
  });

  it('should return empty array when profile not found', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    expect(badges).toEqual([]);
  });

  it('should mark veteran when account older than 6 months', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 7);

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, created_at: oldDate.toISOString() },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const veteran = badges.find(b => b.id === 'veteran');
    expect(veteran?.earned).toBe(true);
  });

  it('should NOT mark veteran when account younger than 6 months', async () => {
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 2);

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, created_at: recentDate.toISOString() },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const badges = await getUserTrustBadges(FAKE_USER_ID);
    const veteran = badges.find(b => b.id === 'veteran');
    expect(veteran?.earned).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getSafetyScoreBreakdown
// ═══════════════════════════════════════════════════════════════════════════
describe('getSafetyScoreBreakdown', () => {
  it('should return all 4 score components', async () => {
    // getUserTrustBadges needs: profile, rides as driver, rides as passenger
    // getSafetyScoreBreakdown also queries profile for ratings
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // getUserTrustBadges → profiles
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({ data: FAKE_PROFILE, error: null });
        return chain;
      }
      if (callIdx === 2) {
        // rides as driver count
        return mockSupabase.makeFreshChain({ data: null, error: null, count: 10 });
      }
      if (callIdx === 3) {
        // ride_bookings as passenger count
        return mockSupabase.makeFreshChain({ data: null, error: null, count: 5 });
      }
      if (callIdx === 4) {
        // profiles for safety score
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { average_rating: 4.8, reliability_score: 92, trust_score: 85 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const result = await getSafetyScoreBreakdown(FAKE_USER_ID);
    expect(result.components).toHaveLength(4);
    expect(result.components.map(c => c.name)).toEqual([
      'Verification', 'Ratings', 'Reliability', 'Experience',
    ]);
    expect(typeof result.overallScore).toBe('number');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('should cap Verification at 40 (4 badges × 10)', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: {
            ...FAKE_PROFILE,
            email_verified: true,
            phone_verified: true,
            id_verified: true,
            profile_photo_url: 'yes.jpg',
          },
          error: null,
        });
        return chain;
      }
      if (callIdx <= 3) {
        return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
      }
      if (callIdx === 4) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { average_rating: 0, reliability_score: 0, trust_score: 0 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const result = await getSafetyScoreBreakdown(FAKE_USER_ID);
    const verification = result.components.find(c => c.name === 'Verification');
    expect(verification?.score).toBe(40);
    expect(verification?.maxScore).toBe(40);
  });

  it('should calculate Ratings score from average_rating', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, email_verified: false, phone_verified: false, id_verified: false, profile_photo_url: null },
          error: null,
        });
        return chain;
      }
      if (callIdx <= 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
      if (callIdx === 4) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { average_rating: 5.0, reliability_score: 0, trust_score: 0 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const result = await getSafetyScoreBreakdown(FAKE_USER_ID);
    const ratings = result.components.find(c => c.name === 'Ratings');
    // Math.round(5.0 * 6) = 30
    expect(ratings?.score).toBe(30);
    expect(ratings?.maxScore).toBe(30);
  });

  it('should calculate Reliability from reliability_score × 0.2', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { ...FAKE_PROFILE, email_verified: false, phone_verified: false, id_verified: false, profile_photo_url: null },
          error: null,
        });
        return chain;
      }
      if (callIdx <= 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
      if (callIdx === 4) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { average_rating: 0, reliability_score: 100, trust_score: 0 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const result = await getSafetyScoreBreakdown(FAKE_USER_ID);
    const reliability = result.components.find(c => c.name === 'Reliability');
    // Math.round(100 * 0.2) = 20
    expect(reliability?.score).toBe(20);
    expect(reliability?.maxScore).toBe(20);
  });

  it('should cap Experience at 10', async () => {
    // Need badges that earn trusted_member, veteran, super_driver (3 × 5 = 15, capped at 10)
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 7);

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: {
            ...FAKE_PROFILE,
            average_rating: 4.8,
            reliability_score: 95,
            created_at: oldDate.toISOString(),
            email_verified: false,
            phone_verified: false,
            id_verified: false,
            profile_photo_url: null,
          },
          error: null,
        });
        return chain;
      }
      // Rides as driver (55), passenger (10) → total 65
      if (callIdx === 2) return mockSupabase.makeFreshChain({ data: null, error: null, count: 55 });
      if (callIdx === 3) return mockSupabase.makeFreshChain({ data: null, error: null, count: 10 });
      if (callIdx === 4) {
        const chain = mockSupabase.makeFreshChain({ data: null, error: null });
        chain.single = vi.fn().mockResolvedValue({
          data: { average_rating: 4.8, reliability_score: 95, trust_score: 85 },
          error: null,
        });
        return chain;
      }
      return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
    });

    const result = await getSafetyScoreBreakdown(FAKE_USER_ID);
    const experience = result.components.find(c => c.name === 'Experience');
    expect(experience?.score).toBeLessThanOrEqual(10);
  });
});
