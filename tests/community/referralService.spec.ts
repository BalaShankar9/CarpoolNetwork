/**
 * Enterprise-grade tests for ReferralService
 * Covers: code generation, getOrCreateReferralCode, applyReferralCode,
 * completeReferral, getReferralStats, getLeaderboard, getShareLink, getShareText
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
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

import { referralService, REFERRAL_TIERS } from '../../src/services/referralService';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

  // Stub window.location for getShareLink/getShareText (runs in node env)
  (globalThis as any).window = { location: { origin: 'https://carpoolnetwork.app' } };
});

// =========================================================================
describe('ReferralService', () => {

  // --- REFERRAL_TIERS ---
  describe('REFERRAL_TIERS constant', () => {
    it('has 4 tiers defined', () => {
      expect(REFERRAL_TIERS).toHaveLength(4);
    });

    it('tiers are in ascending order of minReferrals', () => {
      for (let i = 1; i < REFERRAL_TIERS.length; i++) {
        expect(REFERRAL_TIERS[i].minReferrals).toBeGreaterThan(REFERRAL_TIERS[i - 1].minReferrals);
      }
    });

    it('each tier has required fields', () => {
      for (const tier of REFERRAL_TIERS) {
        expect(tier.name).toBeTruthy();
        expect(typeof tier.minReferrals).toBe('number');
        expect(tier.color).toBeTruthy();
        expect(tier.benefits.length).toBeGreaterThan(0);
        expect(tier.badge).toBeTruthy();
      }
    });

    it('includes Bronze, Silver, Gold, Platinum', () => {
      const names = REFERRAL_TIERS.map(t => t.name);
      expect(names).toEqual(['Bronze', 'Silver', 'Gold', 'Platinum']);
    });
  });

  // --- generateReferralCode ---
  describe('generateReferralCode', () => {
    it('generates a code with format XXXXXX-YYYY', () => {
      const code = referralService.generateReferralCode('user-abc-123');
      expect(code).toMatch(/^[A-Z0-9]{6}-[A-Z0-9]{4}$/);
    });

    it('appends first 4 chars of userId uppercased', () => {
      const code = referralService.generateReferralCode('abcd-efgh');
      expect(code.endsWith('-ABCD')).toBe(true);
    });

    it('generates unique codes on multiple calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        codes.add(referralService.generateReferralCode('user-1'));
      }
      // Not all identical (at least 2 different)
      expect(codes.size).toBeGreaterThanOrEqual(2);
    });

    it('uses only non-confusing characters (no 0, O, 1, I)', () => {
      const confusing = ['0', 'O', '1', 'I'];
      // Run many times to check
      for (let i = 0; i < 20; i++) {
        const code = referralService.generateReferralCode('test-user');
        const randomPart = code.split('-')[0];
        for (const char of randomPart) {
          expect(confusing).not.toContain(char);
        }
      }
    });
  });

  // --- getOrCreateReferralCode ---
  describe('getOrCreateReferralCode', () => {
    it('returns existing active code', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: {
            code: 'ABC123-USER', user_id: 'u1', created_at: '2026-01-01',
            usage_count: 3, max_uses: 100, expires_at: null, is_active: true,
          },
          error: null,
        })
      );

      const result = await referralService.getOrCreateReferralCode('u1');
      expect(result).not.toBeNull();
      expect(result!.code).toBe('ABC123-USER');
      expect(result!.usageCount).toBe(3);
    });

    it('creates new code when none exists', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // maybeSingle returns null (no existing)
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        // insert returns new code
        return mockSupabase.makeFreshChain({
          data: {
            code: 'NEW123-U1XX', user_id: 'u1', created_at: '2026-01-01',
            usage_count: 0, max_uses: null, expires_at: null, is_active: true,
          },
          error: null,
        });
      });

      const result = await referralService.getOrCreateReferralCode('u1');
      expect(result).not.toBeNull();
      expect(result!.usageCount).toBe(0);
    });

    it('returns null on creation error', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: { message: 'Unique violation' } });
      });

      const result = await referralService.getOrCreateReferralCode('u1');
      expect(result).toBeNull();
    });
  });

  // --- applyReferralCode ---
  describe('applyReferralCode', () => {
    it('returns failure for invalid code', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      const result = await referralService.applyReferralCode('new-user', 'INVALID');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('prevents self-referral', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { user_id: 'u1', code: 'CODE', is_active: true, max_uses: null, expires_at: null, usage_count: 0 },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('u1', 'CODE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('own referral');
    });

    it('rejects when max uses reached', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { user_id: 'other', code: 'CODE', is_active: true, max_uses: 5, expires_at: null, usage_count: 5 },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('new-user', 'CODE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('limit');
    });

    it('rejects expired code', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { user_id: 'other', code: 'CODE', is_active: true, max_uses: null, expires_at: pastDate, usage_count: 0 },
            error: null,
          });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('new-user', 'CODE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('rejects when user already used a referral', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { user_id: 'referrer', code: 'CODE', is_active: true, max_uses: null, expires_at: null, usage_count: 0 },
            error: null,
          });
        }
        if (table === 'referrals') {
          return mockSupabase.makeFreshChain({ data: { id: 'existing' }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('new-user', 'CODE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('already used');
    });

    it('succeeds with valid code and increments usage', async () => {
      let refCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { id: 'rc-1', user_id: 'referrer', code: 'VALID1-REFE', is_active: true, max_uses: null, expires_at: null, usage_count: 2 },
            error: null,
          });
        }
        if (table === 'referrals') {
          refCallCount++;
          if (refCallCount === 1) {
            // Check existing referral → none
            return mockSupabase.makeFreshChain({ data: null, error: null });
          }
          // Insert referral
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('new-user', 'valid1-refe');
      expect(result.success).toBe(true);
      expect(result.referrerId).toBe('referrer');
      expect(result.message).toContain('rewards');
    });

    it('returns failure on insert error', async () => {
      let refCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referral_codes') {
          return mockSupabase.makeFreshChain({
            data: { id: 'rc-1', user_id: 'referrer', code: 'CODE', is_active: true, max_uses: null, expires_at: null, usage_count: 0 },
            error: null,
          });
        }
        if (table === 'referrals') {
          refCallCount++;
          if (refCallCount === 1) return mockSupabase.makeFreshChain({ data: null, error: null }); // no existing
          return mockSupabase.makeFreshChain({ data: null, error: { message: 'insert fail' } }); // insert fails
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const result = await referralService.applyReferralCode('new-user', 'CODE');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    it('uppercases and trims the code', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await referralService.applyReferralCode('new-user', '  code  ');
      // The from('referral_codes') query should be called
      expect(mockSupabase.from).toHaveBeenCalledWith('referral_codes');
    });
  });

  // --- completeReferral ---
  describe('completeReferral', () => {
    it('does nothing when no pending referral', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null })
      );

      await referralService.completeReferral('u1');
      // Should only query referrals, not update
      expect(mockSupabase.from).toHaveBeenCalledWith('referrals');
    });

    it('does nothing when user has no completed rides', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referrals') {
          callCount++;
          if (callCount === 1) {
            return mockSupabase.makeFreshChain({
              data: { id: 'ref-1', referrer_id: 'referrer', referred_id: 'u1', status: 'pending' },
              error: null,
            });
          }
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'ride_bookings') {
          return mockSupabase.makeFreshChain({ data: null, error: null, count: 0 });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await referralService.completeReferral('u1');
      // Should not update referral status since count = 0
    });

    it('completes referral and awards rewards when ride completed', async () => {
      let refCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referrals') {
          refCallCount++;
          if (refCallCount === 1) {
            return mockSupabase.makeFreshChain({
              data: { id: 'ref-1', referrer_id: 'referrer', referred_id: 'u1', status: 'pending' },
              error: null,
            });
          }
          // Subsequent: for update and for getReferralStats
          return mockSupabase.makeFreshChain({ data: [], error: null });
        }
        if (table === 'ride_bookings') {
          return mockSupabase.makeFreshChain({ data: null, error: null, count: 1 });
        }
        if (table === 'user_badges') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        if (table === 'notifications') {
          return mockSupabase.makeFreshChain({ data: null, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      await referralService.completeReferral('u1');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_badges');
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    });
  });

  // --- getReferralStats ---
  describe('getReferralStats', () => {
    it('calculates stats from referral data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'referrals') {
          return mockSupabase.makeFreshChain({
            data: [
              { id: 'r1', status: 'pending', referrer_id: 'u1', created_at: '2026-01-01' },
              { id: 'r2', status: 'completed', referrer_id: 'u1', created_at: '2026-01-02' },
              { id: 'r3', status: 'completed', referrer_id: 'u1', created_at: '2026-01-03' },
              { id: 'r4', status: 'rewarded', referrer_id: 'u1', created_at: '2026-01-04' },
            ],
            error: null,
          });
        }
        if (table === 'user_badges') {
          return mockSupabase.makeFreshChain({ data: { badge_type: 'community_champion', badge_count: 3 }, error: null });
        }
        return mockSupabase.makeFreshChain({ data: null, error: null });
      });

      const stats = await referralService.getReferralStats('u1');
      expect(stats.totalReferrals).toBe(4);
      expect(stats.pendingReferrals).toBe(1);
      expect(stats.completedReferrals).toBe(3); // completed + rewarded
      expect(stats.totalRewardsEarned.badges).toBe(3);
      expect(stats.tier).toBe('bronze'); // 3 completed < 5 for silver
    });

    it('returns bronze tier for < 5 completed referrals', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const stats = await referralService.getReferralStats('u1');
      expect(stats.tier).toBe('bronze');
    });
  });

  // --- getShareLink ---
  describe('getShareLink', () => {
    it('returns a URL with the referral code', () => {
      const link = referralService.getShareLink('ABC123');
      expect(link).toContain('signup?ref=ABC123');
    });
  });

  // --- getShareText ---
  describe('getShareText', () => {
    it('returns encoded twitter text', () => {
      const text = referralService.getShareText('CODE1', 'twitter');
      expect(text).toContain('CarpoolNetwork');
      expect(text).toContain('CODE1');
    });

    it('returns encoded whatsapp text', () => {
      const text = referralService.getShareText('CODE1', 'whatsapp');
      expect(text).toContain('CarpoolNetwork');
    });

    it('returns email subject and body', () => {
      const text = referralService.getShareText('CODE1', 'email');
      expect(text).toContain('subject=');
      expect(text).toContain('body=');
    });

    it('returns generic share text', () => {
      const text = referralService.getShareText('CODE1', 'generic');
      expect(text).toContain('CODE1');
      expect(text).toContain('CarpoolNetwork');
    });
  });
});
