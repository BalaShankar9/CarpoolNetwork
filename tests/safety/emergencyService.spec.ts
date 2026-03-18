/**
 * Enterprise-grade tests for EmergencyService
 * Covers: emergency contacts CRUD, SOS alerts, live trip sharing,
 * safety check-ins, route deviation detection, mappers
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
      'single', 'maybeSingle', 'filter', 'range', 'contains', 'upsert',
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

// Mock crypto.getRandomValues for generateShareCode
vi.stubGlobal('crypto', {
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = (i * 13 + 7) % 256;
    return arr;
  }),
});

// Stub window.location for notifyTripShareContacts
(globalThis as any).window = { location: { origin: 'https://test.carpoolnet.com' } };

import { emergencyService } from '../../src/services/emergencyService';

import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_ADMIN_USER_ID,
  FAKE_RIDE_ID,
  FAKE_CONTACT_ID,
  FAKE_ALERT_ID,
  FAKE_SHARE_ID,
  FAKE_CHECKIN_ID,
  FAKE_EMERGENCY_CONTACT_DB,
  FAKE_SOS_ALERT_DB,
  FAKE_LIVE_TRIP_SHARE_DB,
  FAKE_CHECKIN_DB,
} from './helpers';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY CONTACTS
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — Emergency Contacts', () => {
  describe('getEmergencyContacts', () => {
    it('should return mapped contacts for user', async () => {
      const dbRows = [FAKE_EMERGENCY_CONTACT_DB, { ...FAKE_EMERGENCY_CONTACT_DB, id: 'c2', name: 'Bob' }];
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: dbRows, error: null })
      );

      const contacts = await emergencyService.getEmergencyContacts(FAKE_USER_ID);
      expect(contacts).toHaveLength(2);
      expect(contacts[0]).toMatchObject({
        id: FAKE_CONTACT_ID,
        userId: FAKE_USER_ID,
        name: 'Jane Safety',
        isPrimary: true,
        notifyOnSOS: true,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('emergency_contacts');
    });

    it('should return empty array when no contacts', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const contacts = await emergencyService.getEmergencyContacts(FAKE_USER_ID);
      expect(contacts).toEqual([]);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' } })
      );
      await expect(emergencyService.getEmergencyContacts(FAKE_USER_ID))
        .rejects.toEqual({ message: 'DB error' });
    });
  });

  describe('addEmergencyContact', () => {
    const newContact = {
      name: 'John Doe',
      phone: '+0987654321',
      email: 'john@example.com',
      relationship: 'brother',
      isPrimary: false,
      notifyOnRideStart: true,
      notifyOnSOS: true,
    };

    it('should add a non-primary contact (no primary unset)', async () => {
      const insertedRow = {
        id: 'new-c',
        user_id: FAKE_USER_ID,
        name: 'John Doe',
        phone: '+0987654321',
        email: 'john@example.com',
        relationship: 'brother',
        is_primary: false,
        notify_on_ride_start: true,
        notify_on_sos: true,
        created_at: '2026-01-15T10:00:00Z',
      };
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.addEmergencyContact(FAKE_USER_ID, newContact);
      expect(result.name).toBe('John Doe');
      expect(result.isPrimary).toBe(false);
    });

    it('should unset other primaries when adding a primary contact', async () => {
      const primaryContact = { ...newContact, isPrimary: true };
      const updateChain = mockSupabase.makeFreshChain({ data: null, error: null });
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({
        data: { ...FAKE_EMERGENCY_CONTACT_DB, is_primary: true },
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        return callIdx === 1 ? updateChain : insertChain;
      });

      const result = await emergencyService.addEmergencyContact(FAKE_USER_ID, primaryContact);
      expect(result.isPrimary).toBe(true);
      // First call should update existing primaries
      expect(mockSupabase.from).toHaveBeenCalledWith('emergency_contacts');
    });

    it('should throw on insert error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.addEmergencyContact(FAKE_USER_ID, newContact))
        .rejects.toEqual({ message: 'Insert failed' });
    });
  });

  describe('updateEmergencyContact', () => {
    it('should update and return mapped contact', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({
        data: { ...FAKE_EMERGENCY_CONTACT_DB, name: 'Updated Jane' },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.updateEmergencyContact(FAKE_CONTACT_ID, { name: 'Updated Jane' });
      expect(result.name).toBe('Updated Jane');
    });

    it('should throw on error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.updateEmergencyContact(FAKE_CONTACT_ID, { name: 'X' }))
        .rejects.toEqual({ message: 'Update failed' });
    });
  });

  describe('deleteEmergencyContact', () => {
    it('should delete without error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await expect(emergencyService.deleteEmergencyContact(FAKE_CONTACT_ID)).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'Delete error' } })
      );
      await expect(emergencyService.deleteEmergencyContact(FAKE_CONTACT_ID))
        .rejects.toEqual({ message: 'Delete error' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOS ALERTS
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — SOS Alerts', () => {
  describe('triggerSOS', () => {
    it('should throw when userId is not provided', async () => {
      await expect(emergencyService.triggerSOS(FAKE_RIDE_ID))
        .rejects.toThrow('userId is required to trigger SOS');
    });

    it('should create SOS alert with ride and location', async () => {
      const sosRow = { ...FAKE_SOS_ALERT_DB };
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({ data: sosRow, error: null });

      // getEmergencyContacts for notifyEmergencyContacts
      const contactsChain = mockSupabase.makeFreshChain({
        data: [{ ...FAKE_EMERGENCY_CONTACT_DB, notify_on_sos: true }],
        error: null,
      });

      // profile for user name
      const profileChain = mockSupabase.makeFreshChain({ data: null, error: null });
      profileChain.single = vi.fn().mockResolvedValue({
        data: { full_name: 'Alice Safety' },
        error: null,
      });

      // Admin users
      const adminsChain = mockSupabase.makeFreshChain({
        data: [{ id: 'admin-1' }],
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++;
        if (callIdx === 1) return insertChain;          // sos_alerts insert
        if (table === 'emergency_contacts') return contactsChain;
        if (table === 'profiles' && callIdx <= 5) return profileChain;
        if (table === 'profiles') return adminsChain;     // admin profiles
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await emergencyService.triggerSOS(
        FAKE_RIDE_ID, FAKE_USER_ID, { lat: 37.77, lng: -122.42 }
      );
      expect(result).toMatchObject({ id: FAKE_ALERT_ID, alertType: 'sos', status: 'active' });
    });

    it('should create SOS alert without location (notifyEmergencyContactsWithoutLocation)', async () => {
      const sosRow = { ...FAKE_SOS_ALERT_DB, latitude: null, longitude: null };
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({ data: sosRow, error: null });

      const contactsChain = mockSupabase.makeFreshChain({
        data: [{ ...FAKE_EMERGENCY_CONTACT_DB, notify_on_sos: true }],
        error: null,
      });
      const profileChain = mockSupabase.makeFreshChain({ data: null, error: null });
      profileChain.single = vi.fn().mockResolvedValue({
        data: { full_name: 'Alice Safety' },
        error: null,
      });
      const adminsChain = mockSupabase.makeFreshChain({ data: [{ id: 'admin-1' }], error: null });

      let callIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++;
        if (callIdx === 1) return insertChain;
        if (table === 'emergency_contacts') return contactsChain;
        if (table === 'profiles' && callIdx <= 5) return profileChain;
        if (table === 'profiles') return adminsChain;
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await emergencyService.triggerSOS(
        FAKE_RIDE_ID, FAKE_USER_ID, undefined, 'Help!'
      );
      expect(result.alertType).toBe('sos');
    });

    it('should create SOS without rideId', async () => {
      const sosRow = { ...FAKE_SOS_ALERT_DB, ride_id: null };
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({ data: sosRow, error: null });

      const contactsChain = mockSupabase.makeFreshChain({ data: [], error: null });
      const adminsChain = mockSupabase.makeFreshChain({ data: [], error: null });

      let callIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++;
        if (callIdx === 1) return insertChain;
        if (table === 'emergency_contacts') return contactsChain;
        if (table === 'profiles') return adminsChain;
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await emergencyService.triggerSOS(
        undefined, FAKE_USER_ID, { lat: 37.77, lng: -122.42 }
      );
      expect(result).toBeDefined();
    });

    it('should throw when insert fails', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.triggerSOS(FAKE_RIDE_ID, FAKE_USER_ID))
        .rejects.toEqual({ message: 'Insert failed' });
    });
  });

  describe('updateSOSStatus', () => {
    it('should update to responded with responder and timestamp', async () => {
      const updatedRow = {
        ...FAKE_SOS_ALERT_DB,
        status: 'responded',
        responded_at: '2026-01-15T10:05:00Z',
        responder_id: FAKE_ADMIN_USER_ID,
      };
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.updateSOSStatus(FAKE_ALERT_ID, 'responded', FAKE_ADMIN_USER_ID);
      expect(result.status).toBe('responded');
      expect(result.respondedAt).toBe('2026-01-15T10:05:00Z');
    });

    it('should update to resolved with resolved_at timestamp', async () => {
      const updatedRow = {
        ...FAKE_SOS_ALERT_DB,
        status: 'resolved',
        resolved_at: '2026-01-15T10:10:00Z',
      };
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.updateSOSStatus(FAKE_ALERT_ID, 'resolved');
      expect(result.status).toBe('resolved');
      expect(result.resolvedAt).toBe('2026-01-15T10:10:00Z');
    });

    it('should update to false_alarm with resolved_at', async () => {
      const updatedRow = {
        ...FAKE_SOS_ALERT_DB,
        status: 'false_alarm',
        resolved_at: '2026-01-15T10:10:00Z',
      };
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.updateSOSStatus(FAKE_ALERT_ID, 'false_alarm');
      expect(result.status).toBe('false_alarm');
    });

    it('should throw on error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.updateSOSStatus(FAKE_ALERT_ID, 'resolved'))
        .rejects.toEqual({ message: 'Update failed' });
    });
  });

  describe('getActiveSOSAlerts', () => {
    it('should return active SOS alerts', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: [FAKE_SOS_ALERT_DB], error: null })
      );
      const alerts = await emergencyService.getActiveSOSAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('active');
    });

    it('should return empty array when none active', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const alerts = await emergencyService.getActiveSOSAlerts();
      expect(alerts).toEqual([]);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'Query error' } })
      );
      await expect(emergencyService.getActiveSOSAlerts())
        .rejects.toEqual({ message: 'Query error' });
    });
  });

  describe('getSOSHistory', () => {
    it('should return user SOS history', async () => {
      const alerts = [FAKE_SOS_ALERT_DB, { ...FAKE_SOS_ALERT_DB, id: 'a2', status: 'resolved' }];
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: alerts, error: null })
      );
      const history = await emergencyService.getSOSHistory(FAKE_USER_ID);
      expect(history).toHaveLength(2);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'err' } })
      );
      await expect(emergencyService.getSOSHistory(FAKE_USER_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LIVE TRIP SHARING
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — Live Trip Sharing', () => {
  describe('startTripShare', () => {
    it('should create a trip share with default 240 min duration', async () => {
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({
        data: FAKE_LIVE_TRIP_SHARE_DB,
        error: null,
      });

      // notifyTripShareContacts needs: live_trip_shares select, profiles, emergency_contacts
      const shareInfoChain = mockSupabase.makeFreshChain({ data: null, error: null });
      shareInfoChain.single = vi.fn().mockResolvedValue({
        data: { shared_with: [FAKE_CONTACT_ID] },
        error: null,
      });
      const profileChain = mockSupabase.makeFreshChain({ data: null, error: null });
      profileChain.single = vi.fn().mockResolvedValue({
        data: { full_name: 'Alice Safety' },
        error: null,
      });
      const contactDetailChain = mockSupabase.makeFreshChain({ data: null, error: null });
      contactDetailChain.single = vi.fn().mockResolvedValue({
        data: { name: 'Jane Safety', phone: '+123', email: 'jane@test.com' },
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++;
        if (callIdx === 1) return insertChain;
        if (table === 'live_trip_shares') return shareInfoChain;
        if (table === 'profiles') return profileChain;
        if (table === 'emergency_contacts') return contactDetailChain;
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await emergencyService.startTripShare(
        FAKE_RIDE_ID, FAKE_USER_ID, [FAKE_CONTACT_ID]
      );
      expect(result.rideId).toBe(FAKE_RIDE_ID);
      expect(result.isActive).toBe(true);
    });

    it('should support custom duration', async () => {
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({
        data: FAKE_LIVE_TRIP_SHARE_DB,
        error: null,
      });

      mockSupabase.from.mockImplementation(() => {
        return insertChain;
      });
      // The from mock will be used for all calls; that's fine for this test
      const shareInfoChain = mockSupabase.makeFreshChain({ data: null, error: null });
      shareInfoChain.single = vi.fn().mockResolvedValue({
        data: { shared_with: [] },
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return insertChain;
        return shareInfoChain;
      });

      const result = await emergencyService.startTripShare(
        FAKE_RIDE_ID, FAKE_USER_ID, [], 60
      );
      expect(result).toBeDefined();
    });

    it('should throw on insert error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert err' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.startTripShare(FAKE_RIDE_ID, FAKE_USER_ID, []))
        .rejects.toEqual({ message: 'Insert err' });
    });
  });

  describe('updateTripLocation', () => {
    it('should update location successfully', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await expect(
        emergencyService.updateTripLocation(FAKE_SHARE_ID, { lat: 37.77, lng: -122.42 })
      ).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'Update err' } })
      );
      await expect(
        emergencyService.updateTripLocation(FAKE_SHARE_ID, { lat: 37.77, lng: -122.42 })
      ).rejects.toEqual({ message: 'Update err' });
    });
  });

  describe('endTripShare', () => {
    it('should deactivate trip share', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await expect(emergencyService.endTripShare(FAKE_SHARE_ID)).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'err' } })
      );
      await expect(emergencyService.endTripShare(FAKE_SHARE_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });

  describe('getTripShareByCode', () => {
    it('should return mapped trip share when found', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({
        data: FAKE_LIVE_TRIP_SHARE_DB,
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.getTripShareByCode('share-code-abc');
      expect(result).not.toBeNull();
      expect(result!.shareCode).toBe('share-code-abc');
      expect(result!.isActive).toBe(true);
    });

    it('should return null when not found', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.getTripShareByCode('invalid');
      expect(result).toBeNull();
    });
  });

  describe('getActiveTripShares', () => {
    it('should return active shares for user', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: [FAKE_LIVE_TRIP_SHARE_DB], error: null })
      );
      const shares = await emergencyService.getActiveTripShares(FAKE_USER_ID);
      expect(shares).toHaveLength(1);
      expect(shares[0].isActive).toBe(true);
    });

    it('should return empty array when none active', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const shares = await emergencyService.getActiveTripShares(FAKE_USER_ID);
      expect(shares).toEqual([]);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'err' } })
      );
      await expect(emergencyService.getActiveTripShares(FAKE_USER_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CHECK-INS
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — Safety Check-Ins', () => {
  describe('scheduleSafetyCheckIn', () => {
    it('should schedule a check-in with default 30 min interval', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: FAKE_CHECKIN_DB, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.scheduleSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID);
      expect(result.rideId).toBe(FAKE_RIDE_ID);
      expect(result.status).toBe('pending');
      expect(result.attempts).toBe(0);
    });

    it('should schedule with custom interval', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: FAKE_CHECKIN_DB, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.scheduleSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID, 15);
      expect(result).toBeDefined();
    });

    it('should throw on error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.scheduleSafetyCheckIn(FAKE_RIDE_ID, FAKE_USER_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });

  describe('respondToCheckIn', () => {
    it('should mark check-in as confirmed', async () => {
      const confirmed = { ...FAKE_CHECKIN_DB, status: 'confirmed', responded_at: '2026-01-15T10:35:00Z' };
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: confirmed, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await emergencyService.respondToCheckIn(FAKE_CHECKIN_ID);
      expect(result.status).toBe('confirmed');
      expect(result.respondedAt).toBe('2026-01-15T10:35:00Z');
    });

    it('should throw on error', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.respondToCheckIn(FAKE_CHECKIN_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });

  describe('escalateMissedCheckIn', () => {
    it('should escalate and trigger SOS when ride has location', async () => {
      // 1. Get check-in
      const checkInChain = mockSupabase.makeFreshChain({ data: null, error: null });
      checkInChain.single = vi.fn().mockResolvedValue({
        data: { ...FAKE_CHECKIN_DB, ride_id: FAKE_RIDE_ID, user_id: FAKE_USER_ID },
        error: null,
      });

      // 2. Update check-in status
      const updateChain = mockSupabase.makeFreshChain({ data: null, error: null });

      // 3. Get ride (with location)
      const rideChain = mockSupabase.makeFreshChain({ data: null, error: null });
      rideChain.single = vi.fn().mockResolvedValue({
        data: { id: FAKE_RIDE_ID, current_lat: 37.77, current_lng: -122.42 },
        error: null,
      });

      // 4. triggerSOS → sos_alerts insert
      const sosChain = mockSupabase.makeFreshChain({ data: null, error: null });
      sosChain.single = vi.fn().mockResolvedValue({
        data: FAKE_SOS_ALERT_DB,
        error: null,
      });

      // Remaining: contacts, profiles, notifications etc.
      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return checkInChain;
        if (callIdx === 2) return updateChain;
        if (callIdx === 3) return rideChain;
        if (callIdx === 4) return sosChain;
        return mockSupabase.makeFreshChain({ data: [], error: null });
      });

      await expect(emergencyService.escalateMissedCheckIn(FAKE_CHECKIN_ID)).resolves.toBeUndefined();
    });

    it('should trigger SOS without location when ride has no coords', async () => {
      const checkInChain = mockSupabase.makeFreshChain({ data: null, error: null });
      checkInChain.single = vi.fn().mockResolvedValue({
        data: { ...FAKE_CHECKIN_DB },
        error: null,
      });

      const updateChain = mockSupabase.makeFreshChain({ data: null, error: null });

      const rideChain = mockSupabase.makeFreshChain({ data: null, error: null });
      rideChain.single = vi.fn().mockResolvedValue({
        data: { id: FAKE_RIDE_ID, current_lat: null, current_lng: null },
        error: null,
      });

      const sosChain = mockSupabase.makeFreshChain({ data: null, error: null });
      sosChain.single = vi.fn().mockResolvedValue({
        data: { ...FAKE_SOS_ALERT_DB },
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return checkInChain;
        if (callIdx === 2) return updateChain;
        if (callIdx === 3) return rideChain;
        if (callIdx === 4) return sosChain;
        return mockSupabase.makeFreshChain({ data: [], error: null });
      });

      await expect(emergencyService.escalateMissedCheckIn(FAKE_CHECKIN_ID)).resolves.toBeUndefined();
    });

    it('should do nothing when check-in not found', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      await expect(emergencyService.escalateMissedCheckIn('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getPendingCheckIns', () => {
    it('should return pending check-ins', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: [FAKE_CHECKIN_DB], error: null })
      );
      const pending = await emergencyService.getPendingCheckIns(FAKE_USER_ID);
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
    });

    it('should return empty array', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const pending = await emergencyService.getPendingCheckIns(FAKE_USER_ID);
      expect(pending).toEqual([]);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: { message: 'err' } })
      );
      await expect(emergencyService.getPendingCheckIns(FAKE_USER_ID))
        .rejects.toEqual({ message: 'err' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE DEVIATION DETECTION
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — Route Deviation', () => {
  describe('checkRouteDeviation', () => {
    it('should detect no deviation when on route', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const route = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.7850, lng: -122.4094 },
      ];

      // Current location is close to first point
      const result = await emergencyService.checkRouteDeviation(
        FAKE_RIDE_ID,
        { lat: 37.7750, lng: -122.4190 },
        route
      );
      expect(result.deviated).toBe(false);
      expect(result.distance).toBeLessThan(0.5);
    });

    it('should detect deviation when far from route', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const route = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.7850, lng: -122.4094 },
      ];

      // Current location is 10km away
      const result = await emergencyService.checkRouteDeviation(
        FAKE_RIDE_ID,
        { lat: 37.9000, lng: -122.2000 },
        route
      );
      expect(result.deviated).toBe(true);
      expect(result.distance).toBeGreaterThan(0.5);
    });

    it('should log deviation to route_deviations table', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const route = [{ lat: 37.7749, lng: -122.4194 }];

      await emergencyService.checkRouteDeviation(
        FAKE_RIDE_ID,
        { lat: 38.0000, lng: -122.0000 },
        route
      );

      // Should have inserted into route_deviations
      const routeDeviationCalls = mockSupabase.from.mock.calls.filter(
        (c: any) => c[0] === 'route_deviations'
      );
      expect(routeDeviationCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('handleRouteDeviation', () => {
    it('should notify passengers about route deviation', async () => {
      const bookingsChain = mockSupabase.makeFreshChain({
        data: [{ passenger_id: FAKE_OTHER_USER_ID }],
        error: null,
      });
      const notifChain = mockSupabase.makeFreshChain({ data: null, error: null });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return bookingsChain;
        return notifChain;
      });

      await emergencyService.handleRouteDeviation(
        FAKE_RIDE_ID, FAKE_USER_ID, { lat: 37.77, lng: -122.42 }, 0.8
      );

      const notifCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'notifications');
      expect(notifCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should auto-trigger SOS for significant deviation > 2km', async () => {
      const bookingsChain = mockSupabase.makeFreshChain({
        data: [{ passenger_id: FAKE_OTHER_USER_ID }],
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return bookingsChain;
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await emergencyService.handleRouteDeviation(
        FAKE_RIDE_ID, FAKE_USER_ID, { lat: 37.77, lng: -122.42 }, 3.5
      );

      // Should insert into sos_alerts table
      const sosCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'sos_alerts');
      expect(sosCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should not auto-trigger SOS for minor deviation <= 2km', async () => {
      const bookingsChain = mockSupabase.makeFreshChain({ data: [], error: null });

      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return bookingsChain;
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await emergencyService.handleRouteDeviation(
        FAKE_RIDE_ID, FAKE_USER_ID, { lat: 37.77, lng: -122.42 }, 1.5
      );

      const sosCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'sos_alerts');
      expect(sosCalls).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MAPPER TESTS (via public methods that use mappers)
// ═══════════════════════════════════════════════════════════════════════════
describe('EmergencyService — Mappers', () => {
  it('mapContact should transform snake_case to camelCase', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [FAKE_EMERGENCY_CONTACT_DB], error: null })
    );
    const contacts = await emergencyService.getEmergencyContacts(FAKE_USER_ID);
    const c = contacts[0];
    expect(c.userId).toBe(FAKE_USER_ID);
    expect(c.isPrimary).toBe(true);
    expect(c.notifyOnRideStart).toBe(true);
    expect(c.notifyOnSOS).toBe(true);
    expect(c.createdAt).toBe('2026-01-10T10:00:00Z');
  });

  it('mapSOSAlert should transform fields correctly', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [FAKE_SOS_ALERT_DB], error: null })
    );
    const alerts = await emergencyService.getActiveSOSAlerts();
    const a = alerts[0];
    expect(a.userId).toBe(FAKE_USER_ID);
    expect(a.rideId).toBe(FAKE_RIDE_ID);
    expect(a.alertType).toBe('sos');
    expect(a.createdAt).toBe('2026-01-15T10:00:00Z');
  });

  it('mapTripShare should transform fields correctly', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [FAKE_LIVE_TRIP_SHARE_DB], error: null })
    );
    const shares = await emergencyService.getActiveTripShares(FAKE_USER_ID);
    const s = shares[0];
    expect(s.rideId).toBe(FAKE_RIDE_ID);
    expect(s.shareCode).toBe('share-code-abc');
    expect(s.sharedWith).toEqual([FAKE_CONTACT_ID]);
    expect(s.isActive).toBe(true);
  });

  it('mapCheckIn should transform fields correctly', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [FAKE_CHECKIN_DB], error: null })
    );
    const pending = await emergencyService.getPendingCheckIns(FAKE_USER_ID);
    const ci = pending[0];
    expect(ci.rideId).toBe(FAKE_RIDE_ID);
    expect(ci.userId).toBe(FAKE_USER_ID);
    expect(ci.scheduledAt).toBe('2026-01-15T10:30:00Z');
    expect(ci.status).toBe('pending');
    expect(ci.attempts).toBe(0);
  });
});
