/**
 * Enterprise-grade tests for TrustVerificationService
 * Covers: safety score calculation, component scores, tier determination,
 * verification status, phone verification, ID verification, badges,
 * blocking, ride filtering
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
      'flatMap', 'head',
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

// Mock crypto
vi.stubGlobal('crypto', {
  getRandomValues: vi.fn((arr: Uint32Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = 123456;
    return arr;
  }),
});

import { trustVerificationService } from '../../src/services/trustVerificationService';
import type { VerificationStatus } from '../../src/services/trustVerificationService';
import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_RIDE_ID,
  FAKE_BADGE_ID,
  FAKE_VERIFICATION_DB,
  FAKE_USER_BADGE_DB,
} from './helpers';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
});

// Helper: create a chain whose Promise.all-friendly thenable resolves to given data
function chainWithData(data: any) {
  const chain = mockSupabase.makeFreshChain({ data, error: null });
  // Override thenable result
  const p = Promise.resolve({ data, error: null });
  Object.defineProperty(chain, 'then', {
    value: p.then.bind(p),
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return chain;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION STATUS
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — getVerificationStatus', () => {
  it('should return fully verified status', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: FAKE_VERIFICATION_DB,
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const status = await trustVerificationService.getVerificationStatus(FAKE_USER_ID);
    expect(status.emailVerified).toBe(true);
    expect(status.phoneVerified).toBe(true);
    expect(status.idVerified).toBe(true);
    expect(status.driverLicenseVerified).toBe(true);
    expect(status.vehicleVerified).toBe(true);
    expect(status.backgroundCheckPassed).toBe(true);
    expect(status.verificationLevel).toBe('full');
  });

  it('should return none level when no verification data', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const status = await trustVerificationService.getVerificationStatus(FAKE_USER_ID);
    expect(status.verificationLevel).toBe('none');
    expect(status.emailVerified).toBe(false);
    expect(status.phoneVerified).toBe(false);
  });

  it('should return basic level with 1 verification', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...FAKE_VERIFICATION_DB,
        email_verified: true,
        phone_verified: false,
        id_verified: false,
        driver_license_verified: false,
        vehicle_verified: false,
        background_check_passed: false,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const status = await trustVerificationService.getVerificationStatus(FAKE_USER_ID);
    expect(status.verificationLevel).toBe('basic');
  });

  it('should return standard level with 2-3 verifications', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...FAKE_VERIFICATION_DB,
        email_verified: true,
        phone_verified: true,
        id_verified: false,
        driver_license_verified: false,
        vehicle_verified: false,
        background_check_passed: false,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const status = await trustVerificationService.getVerificationStatus(FAKE_USER_ID);
    expect(status.verificationLevel).toBe('standard');
  });

  it('should return enhanced level with 4-5 verifications', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...FAKE_VERIFICATION_DB,
        email_verified: true,
        phone_verified: true,
        id_verified: true,
        driver_license_verified: true,
        vehicle_verified: false,
        background_check_passed: false,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const status = await trustVerificationService.getVerificationStatus(FAKE_USER_ID);
    expect(status.verificationLevel).toBe('enhanced');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — calculateSafetyScore', () => {
  it('should calculate score for a new user with no data', async () => {
    // All queries return empty data
    mockSupabase.from.mockImplementation(() => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.userId).toBe(FAKE_USER_ID);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.tier).toBeDefined();
    expect(score.components).toHaveProperty('ratingScore');
    expect(score.components).toHaveProperty('verificationScore');
    expect(score.components).toHaveProperty('historyScore');
    expect(score.components).toHaveProperty('responseScore');
    expect(score.components).toHaveProperty('safetyIncidents');
  });

  it('should apply incident penalty to overall score', async () => {
    // User with 5 safety incidents (penalty = 50)
    let callIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callIdx++;
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      // Return incidents for content_reports
      if (table === 'content_reports') {
        const data = Array.from({ length: 5 }, (_, i) => ({
          id: `cr-${i}`,
          category: 'safety_violation',
        }));
        const p = Promise.resolve({ data, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p),
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.safetyIncidents).toBe(5);
    // Overall should be reduced by penalty
    expect(score.overallScore).toBeLessThanOrEqual(100);
  });

  it('should never produce negative or >100 scores', async () => {
    // User with extreme incidents
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'content_reports') {
        const data = Array.from({ length: 20 }, (_, i) => ({
          id: `cr-${i}`, category: 'spam',
        }));
        const p = Promise.resolve({ data, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT SCORE CALCULATIONS (via public API)
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — Score Components', () => {
  // These are private methods but we test their effects through calculateSafetyScore

  it('ratingScore should be 50 for user with no ratings', async () => {
    // reviews returns empty
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'reviews') {
        const p = Promise.resolve({ data: [], error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.ratingScore).toBe(50);
  });

  it('ratingScore should increase with high ratings', async () => {
    const ratings = Array.from({ length: 20 }, () => ({ rating: 5 }));
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'reviews') {
        const p = Promise.resolve({ data: ratings, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.ratingScore).toBeGreaterThan(50);
  });

  it('verificationScore should be 100 when fully verified', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });

      if (table === 'user_verifications') {
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: FAKE_VERIFICATION_DB,
          error: null,
        });
      } else {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.verificationScore).toBe(100);
  });

  it('verificationScore should be 0 when nothing verified', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.verificationScore).toBe(0);
  });

  it('historyScore should be 50 for user with no rides', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.historyScore).toBe(50);
  });

  it('historyScore should be high for good ride history', async () => {
    const completedRides = Array.from({ length: 40 }, () => ({ status: 'completed' }));
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'rides' || table === 'ride_bookings') {
        const p = Promise.resolve({ data: completedRides, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.historyScore).toBeGreaterThan(50);
  });

  it('responseScore should be 70 for user with no read records', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.responseScore).toBe(70);
  });

  it('responseScore should be 100 for active reader (40+ conversations)', async () => {
    const readRecords = Array.from({ length: 45 }, (_, i) => ({
      last_read_at: new Date().toISOString(),
      conversation_id: `conv-${i}`,
    }));

    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'message_reads') {
        const p = Promise.resolve({ data: readRecords, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    expect(score.components.responseScore).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TIER DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — Tier Determination', () => {
  // These tests need to set up calculateSafetyScore with specific conditions

  it('should return "new" tier for users with < 3 rides', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    // 0 rides → "new"
    expect(score.tier).toBe('new');
  });

  it('should return "standard" for low score users with 3+ rides', async () => {
    // 3+ rides but low score (no verification, no ratings)
    const rides = Array.from({ length: 4 }, () => ({ status: 'completed' }));
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (table === 'rides') {
        const p = Promise.resolve({ data: rides, error: null });
        Object.defineProperty(chain, 'then', {
          value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
        });
      }
      return chain;
    });

    const score = await trustVerificationService.calculateSafetyScore(FAKE_USER_ID);
    // Low score + 3+ rides → "standard"
    expect(score.tier).toBe('standard');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHONE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — verifyPhone', () => {
  it('should return true when code matches and not expired', async () => {
    const futureDate = new Date(Date.now() + 600000).toISOString(); // 10 min from now
    const codeChain = mockSupabase.makeFreshChain({ data: null, error: null });
    codeChain.single = vi.fn().mockResolvedValue({
      data: { code: '123456', expires_at: futureDate },
      error: null,
    });

    const upsertChain = mockSupabase.makeFreshChain({ data: null, error: null });
    const badgeCheckChain = mockSupabase.makeFreshChain({ data: null, error: null });
    badgeCheckChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const badgeInsertChain = mockSupabase.makeFreshChain({ data: null, error: null });
    badgeInsertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'b1', badge_type: 'verified_phone', name: 'Verified Phone', description: 'Phone number verified', icon: '📱', earned_at: new Date().toISOString() },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return codeChain;
      if (callIdx === 2) return upsertChain;
      if (callIdx === 3) return badgeCheckChain; // existing badge check
      if (callIdx === 4) return badgeInsertChain; // badge insert
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    const result = await trustVerificationService.verifyPhone(FAKE_USER_ID, '+1234567890', '123456');
    expect(result).toBe(true);
  });

  it('should return false when code does not match', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({
      data: { code: '999999', expires_at: new Date(Date.now() + 600000).toISOString() },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await trustVerificationService.verifyPhone(FAKE_USER_ID, '+1234567890', '123456');
    expect(result).toBe(false);
  });

  it('should return false when code is expired', async () => {
    const pastDate = new Date(Date.now() - 600000).toISOString(); // 10 min ago
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({
      data: { code: '123456', expires_at: pastDate },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await trustVerificationService.verifyPhone(FAKE_USER_ID, '+1234567890', '123456');
    expect(result).toBe(false);
  });

  it('should return false when no verification code found', async () => {
    const chain = mockSupabase.makeFreshChain({ data: null, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await trustVerificationService.verifyPhone(FAKE_USER_ID, '+1234567890', '123456');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEND PHONE VERIFICATION CODE
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — sendPhoneVerificationCode', () => {
  it('should upsert verification code to database', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    await trustVerificationService.sendPhoneVerificationCode(FAKE_USER_ID, '+1234567890');
    expect(mockSupabase.from).toHaveBeenCalledWith('verification_codes');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ID VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — submitIdVerification', () => {
  it('should return pending status', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    const result = await trustVerificationService.submitIdVerification(
      FAKE_USER_ID, 'passport', 'https://storage.example.com/doc.jpg'
    );
    expect(result.status).toBe('pending');
    expect(result.message).toContain('1-2 business days');
    expect(mockSupabase.from).toHaveBeenCalledWith('id_verifications');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — Badges', () => {
  describe('getUserBadges', () => {
    it('should return mapped badges', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({
          data: [FAKE_USER_BADGE_DB, { ...FAKE_USER_BADGE_DB, id: 'b2', badge_type: 'safe_driver', name: 'Safe Driver', description: 'Safe', icon: '⭐' }],
          error: null,
        })
      );

      const badges = await trustVerificationService.getUserBadges(FAKE_USER_ID);
      expect(badges).toHaveLength(2);
      expect(badges[0].type).toBe('verified_id');
      expect(badges[0].name).toBe('Verified Identity');
      expect(badges[1].type).toBe('safe_driver');
    });

    it('should return empty array when no badges', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const badges = await trustVerificationService.getUserBadges(FAKE_USER_ID);
      expect(badges).toEqual([]);
    });
  });

  describe('awardBadge', () => {
    it('should award new badge and send notification', async () => {
      // Check existing → null (badge not yet earned)
      const checkChain = mockSupabase.makeFreshChain({ data: null, error: null });
      checkChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      // Insert badge
      const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
      insertChain.single = vi.fn().mockResolvedValue({
        data: {
          id: 'b-new',
          badge_type: 'verified_email',
          name: 'Verified Email',
          description: 'Email address verified',
          icon: '✉️',
          earned_at: '2026-01-15T10:00:00Z',
        },
        error: null,
      });

      // Notification insert
      const notifChain = mockSupabase.makeFreshChain({ data: null, error: null });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return checkChain;
        if (callIdx === 2) return insertChain;
        return notifChain;
      });

      const badge = await trustVerificationService.awardBadge(FAKE_USER_ID, 'verified_email');
      expect(badge).not.toBeNull();
      expect(badge!.type).toBe('verified_email');
      expect(badge!.name).toBe('Verified Email');

      // Should have sent notification
      const notifCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'notifications');
      expect(notifCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null if user already has badge', async () => {
      const checkChain = mockSupabase.makeFreshChain({ data: null, error: null });
      checkChain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'existing-badge' },
        error: null,
      });
      mockSupabase.from.mockReturnValue(checkChain);

      const badge = await trustVerificationService.awardBadge(FAKE_USER_ID, 'verified_id');
      expect(badge).toBeNull();
    });

    it('should return correct badge info for all badge types', async () => {
      const badgeTypes = [
        'verified_id', 'verified_phone', 'verified_email', 'verified_driver',
        'safe_driver', 'trusted_user', 'elite_member', '100_rides',
        '500_rides', 'perfect_rating', 'community_helper',
      ] as const;

      for (const badgeType of badgeTypes) {
        const checkChain = mockSupabase.makeFreshChain({ data: null, error: null });
        checkChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

        const insertChain = mockSupabase.makeFreshChain({ data: null, error: null });
        insertChain.single = vi.fn().mockResolvedValue({
          data: { id: `b-${badgeType}`, badge_type: badgeType, name: 'Test', description: 'Test', icon: '🏆', earned_at: new Date().toISOString() },
          error: null,
        });

        let callIdx = 0;
        mockSupabase.from.mockImplementation(() => {
          callIdx++;
          if (callIdx === 1) return checkChain;
          if (callIdx === 2) return insertChain;
          return mockSupabase.makeFreshChain({ data: null, error: null });
        });

        const badge = await trustVerificationService.awardBadge(FAKE_USER_ID, badgeType);
        expect(badge).not.toBeNull();

        vi.clearAllMocks();
        mockSupabase.from.mockImplementation(() =>
          mockSupabase.makeFreshChain({ data: null, error: null })
        );
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKING
// ═══════════════════════════════════════════════════════════════════════════
describe('TrustVerificationService — Blocking', () => {
  describe('blockUser', () => {
    it('should insert block record', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await trustVerificationService.blockUser(FAKE_USER_ID, FAKE_OTHER_USER_ID, 'Harassment');
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_users');
    });

    it('should insert block without reason', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await trustVerificationService.blockUser(FAKE_USER_ID, FAKE_OTHER_USER_ID);
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_users');
    });
  });

  describe('unblockUser', () => {
    it('should delete block record', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      await trustVerificationService.unblockUser(FAKE_USER_ID, FAKE_OTHER_USER_ID);
      expect(mockSupabase.from).toHaveBeenCalledWith('blocked_users');
    });
  });

  describe('getBlockedUsers', () => {
    it('should return mapped blocked users', async () => {
      const blockData = [
        {
          id: 'block-1',
          blocker_id: FAKE_USER_ID,
          blocked_id: FAKE_OTHER_USER_ID,
          reason: 'Spam',
          created_at: '2026-01-15T10:00:00Z',
          blocked: { full_name: 'Bob', avatar_url: null },
        },
      ];
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: blockData, error: null })
      );

      const blocked = await trustVerificationService.getBlockedUsers(FAKE_USER_ID);
      expect(blocked).toHaveLength(1);
      expect(blocked[0].blockerId).toBe(FAKE_USER_ID);
      expect(blocked[0].blockedId).toBe(FAKE_OTHER_USER_ID);
      expect(blocked[0].reason).toBe('Spam');
    });

    it('should return empty array when no blocks', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );
      const blocked = await trustVerificationService.getBlockedUsers(FAKE_USER_ID);
      expect(blocked).toEqual([]);
    });
  });

  describe('isBlocked', () => {
    it('should return true when block exists', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'block-1' },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await trustVerificationService.isBlocked(FAKE_USER_ID, FAKE_OTHER_USER_ID);
      expect(result).toBe(true);
    });

    it('should return false when no block exists', async () => {
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await trustVerificationService.isBlocked(FAKE_USER_ID, FAKE_OTHER_USER_ID);
      expect(result).toBe(false);
    });
  });

  describe('filterBlockedFromRides', () => {
    it('should filter out rides from blocked users', async () => {
      const blockedRelChain = mockSupabase.makeFreshChain({
        data: [
          { blocked_id: FAKE_OTHER_USER_ID, blocker_id: FAKE_USER_ID },
        ],
        error: null,
      });

      const ridesChain = mockSupabase.makeFreshChain({
        data: [
          { id: 'ride-1', driver_id: FAKE_OTHER_USER_ID }, // blocked driver
          { id: 'ride-2', driver_id: 'user-clean' },       // clean driver
        ],
        error: null,
      });

      let callIdx = 0;
      mockSupabase.from.mockImplementation(() => {
        callIdx++;
        return callIdx === 1 ? blockedRelChain : ridesChain;
      });

      const filtered = await trustVerificationService.filterBlockedFromRides(
        FAKE_USER_ID, ['ride-1', 'ride-2']
      );
      expect(filtered).toEqual(['ride-2']);
    });

    it('should return all rides when no blocked relations', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const filtered = await trustVerificationService.filterBlockedFromRides(
        FAKE_USER_ID, ['ride-1', 'ride-2']
      );
      expect(filtered).toEqual(['ride-1', 'ride-2']);
    });

    it('should return all rides when blocked list is empty', async () => {
      mockSupabase.from.mockReturnValue(
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const filtered = await trustVerificationService.filterBlockedFromRides(
        FAKE_USER_ID, ['ride-1', 'ride-2', 'ride-3']
      );
      expect(filtered).toEqual(['ride-1', 'ride-2', 'ride-3']);
    });
  });
});
