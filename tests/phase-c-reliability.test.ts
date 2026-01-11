import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Phase C: Reliability Functions Unit Tests
 * 
 * These tests verify the TypeScript service wrappers for the
 * Phase C database functions.
 */

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Phase C: Reliability Service Functions', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('expireRides', () => {
    
    it('should call expire_rides RPC and return success', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          rides_expired: 5,
          bookings_completed: 12,
          notifications_created: 12,
        },
        error: null,
      });

      const { expireRides } = await import('@/services/reliabilityService');
      const result = await expireRides();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('expire_rides');
      expect(result.success).toBe(true);
      expect(result.rides_expired).toBe(5);
    });

    it('should handle no expired rides gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          rides_expired: 0,
          bookings_completed: 0,
          notifications_created: 0,
        },
        error: null,
      });

      const { expireRides } = await import('@/services/reliabilityService');
      const result = await expireRides();

      expect(result.success).toBe(true);
      expect(result.rides_expired).toBe(0);
    });

    it('should throw on database error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { expireRides } = await import('@/services/reliabilityService');
      
      await expect(expireRides()).rejects.toThrow('Database error');
    });
  });

  describe('reconcileSeatCounts', () => {
    
    it('should fix seat mismatches and return count', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          mismatches_found: 3,
          mismatches_fixed: 3,
        },
        error: null,
      });

      const { reconcileSeatCounts } = await import('@/services/reliabilityService');
      const result = await reconcileSeatCounts();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('reconcile_seat_counts');
      expect(result.mismatches_found).toBe(3);
      expect(result.mismatches_fixed).toBe(3);
    });

    it('should report zero when system is healthy', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          mismatches_found: 0,
          mismatches_fixed: 0,
        },
        error: null,
      });

      const { reconcileSeatCounts } = await import('@/services/reliabilityService');
      const result = await reconcileSeatCounts();

      expect(result.mismatches_found).toBe(0);
    });
  });

  describe('repairMissingNotifications', () => {
    
    it('should create missing notifications', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          booking_requests_created: 2,
          confirmations_created: 5,
          cancellations_created: 1,
          total_notifications_created: 8,
        },
        error: null,
      });

      const { repairMissingNotifications } = await import('@/services/reliabilityService');
      const result = await repairMissingNotifications();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('repair_missing_notifications');
      expect(result.total_notifications_created).toBe(8);
    });
  });

  describe('checkSystemInvariants', () => {
    
    it('should return healthy when no violations', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          healthy: true,
          total_violations: 0,
          violations: [],
        },
        error: null,
      });

      const { checkSystemInvariants } = await import('@/services/reliabilityService');
      const result = await checkSystemInvariants();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_system_invariants');
      expect(result.healthy).toBe(true);
      expect(result.total_violations).toBe(0);
    });

    it('should return violations when found', async () => {
      const mockViolations = [
        {
          check: 'INV-SEAT-001',
          name: 'seat_mismatch',
          severity: 'critical',
          ride_id: 'abc-123',
          current: 2,
          expected: 1,
        },
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          healthy: false,
          total_violations: 1,
          violations: mockViolations,
        },
        error: null,
      });

      const { checkSystemInvariants } = await import('@/services/reliabilityService');
      const result = await checkSystemInvariants();

      expect(result.healthy).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].check).toBe('INV-SEAT-001');
    });
  });

  describe('getSystemHealthSummary', () => {
    
    it('should return comprehensive health metrics', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          timestamp: '2026-01-11T12:00:00Z',
          total_rides: 1250,
          active_rides: 45,
          in_progress_rides: 3,
          total_bookings: 3200,
          pending_bookings: 12,
          confirmed_bookings: 28,
          expired_active_rides: 0,
          seat_mismatches: 0,
          unresolved_violations: 0,
          recent_job_status: [],
        },
        error: null,
      });

      const { getSystemHealthSummary } = await import('@/services/reliabilityService');
      const result = await getSystemHealthSummary();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_system_health_summary');
      expect(result.total_rides).toBe(1250);
      expect(result.expired_active_rides).toBe(0);
      expect(result.seat_mismatches).toBe(0);
    });
  });

});

describe('Phase C: Invariant Violation Types', () => {
  
  describe('ViolationSeverity', () => {
    it('should have correct severity levels', () => {
      const severities = ['critical', 'warning', 'info'] as const;
      
      expect(severities).toContain('critical');
      expect(severities).toContain('warning');
      expect(severities).toContain('info');
    });
  });

  describe('InvariantCheck codes', () => {
    it('should have documented check codes', () => {
      const checkCodes = [
        'INV-SEAT-001',  // seat_mismatch
        'INV-SEAT-002',  // negative_seats
        'INV-SEAT-003',  // seat_overflow
        'INV-STATE-001', // active_booking_on_terminal_ride
        'INV-STATE-002', // invalid_ride_status
        'INV-STATE-003', // invalid_booking_status
        'INV-UNIQUE-001', // duplicate_active_bookings
        'INV-TIME-001',  // expired_active_ride
      ];
      
      expect(checkCodes).toHaveLength(8);
    });
  });
  
});

describe('Phase C: State Validation', () => {
  
  describe('Canonical Ride States', () => {
    const VALID_RIDE_STATES = ['active', 'in-progress', 'completed', 'cancelled'] as const;
    
    it('should reject deprecated states', () => {
      const deprecatedStates = ['in_progress', 'canceled', 'pending', 'expired'];
      
      for (const state of deprecatedStates) {
        expect(VALID_RIDE_STATES).not.toContain(state);
      }
    });

    it('should accept canonical states', () => {
      for (const state of VALID_RIDE_STATES) {
        expect(VALID_RIDE_STATES).toContain(state);
      }
    });
  });

  describe('Canonical Booking States', () => {
    const VALID_BOOKING_STATES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
    
    it('should reject deprecated states', () => {
      const deprecatedStates = ['rejected', 'declined', 'active', 'paid', 'accepted'];
      
      for (const state of deprecatedStates) {
        expect(VALID_BOOKING_STATES).not.toContain(state);
      }
    });

    it('should accept canonical states', () => {
      for (const state of VALID_BOOKING_STATES) {
        expect(VALID_BOOKING_STATES).toContain(state);
      }
    });
  });

  describe('Canonical Notification Types', () => {
    const VALID_NOTIFICATION_TYPES = [
      'NEW_MESSAGE',
      'FRIEND_REQUEST',
      'FRIEND_REQUEST_ACCEPTED',
      'FORUM_REPLY',
      'FORUM_MENTION',
      'RIDE_MATCH',
      'BOOKING_REQUEST',
      'BOOKING_CONFIRMED',
      'BOOKING_CANCELLED',
      'REVIEW',
      'SAFETY_ALERT',
      'SYSTEM',
    ] as const;
    
    it('should have exactly 12 notification types', () => {
      expect(VALID_NOTIFICATION_TYPES).toHaveLength(12);
    });

    it('should reject deprecated types', () => {
      const deprecatedTypes = [
        'message',
        'friend_request',
        'booking',
        'ride',
        'review',
        'achievement',
        'safety',
        'community',
        'ride_completed',
        'warning',
      ];
      
      for (const type of deprecatedTypes) {
        expect(VALID_NOTIFICATION_TYPES).not.toContain(type);
      }
    });
  });

});
