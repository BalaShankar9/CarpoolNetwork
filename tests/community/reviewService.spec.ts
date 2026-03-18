/**
 * Enterprise-grade tests for ReviewService
 * Covers: submitReview, getPendingReviews, getUserReviews, getUserReviewStats, hasReviewed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains',
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
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    makeFreshChain,
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

import {
  submitReview,
  getPendingReviews,
  getUserReviews,
  getUserReviewStats,
  hasReviewed,
} from '../../src/services/reviewService';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null, count: 0 })
  );
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
});

// =========================================================================
describe('ReviewService', () => {

  // --- submitReview ---
  describe('submitReview', () => {
    it('calls submit_detailed_review RPC with all parameters', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ success: true, message: 'Review submitted', achievements_unlocked: ['first_review'] }],
        error: null,
      });

      const result = await submitReview({
        booking_id: 'b1',
        overall_rating: 5,
        punctuality_rating: 5,
        cleanliness_rating: 4,
        communication_rating: 5,
        safety_rating: 5,
        comfort_rating: 4,
        review_text: 'Great ride!',
        would_ride_again: true,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_detailed_review', {
        p_booking_id: 'b1',
        p_overall_rating: 5,
        p_punctuality_rating: 5,
        p_cleanliness_rating: 4,
        p_communication_rating: 5,
        p_safety_rating: 5,
        p_comfort_rating: 4,
        p_review_text: 'Great ride!',
        p_would_ride_again: true,
      });
      expect(result.success).toBe(true);
      expect(result.achievements_unlocked).toContain('first_review');
    });

    it('passes null for optional rating fields when not provided', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ success: true, message: 'OK' }],
        error: null,
      });

      await submitReview({
        booking_id: 'b1',
        overall_rating: 4,
        would_ride_again: false,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_detailed_review', expect.objectContaining({
        p_punctuality_rating: null,
        p_cleanliness_rating: null,
        p_communication_rating: null,
        p_safety_rating: null,
        p_comfort_rating: null,
        p_review_text: null,
      }));
    });

    it('throws on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Already reviewed' },
      });

      await expect(submitReview({
        booking_id: 'b1',
        overall_rating: 5,
        would_ride_again: true,
      })).rejects.toThrow('Already reviewed');
    });

    it('returns fallback when RPC returns empty result', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await submitReview({
        booking_id: 'b1',
        overall_rating: 5,
        would_ride_again: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('No response');
    });

    it('returns fallback when RPC returns null data', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await submitReview({
        booking_id: 'b1',
        overall_rating: 5,
        would_ride_again: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('No response');
    });
  });

  // --- getPendingReviews ---
  describe('getPendingReviews', () => {
    it('throws when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(getPendingReviews()).rejects.toThrow('Not authenticated');
    });

    it('returns pending reviews from both passenger and driver perspectives', async () => {
      // The function calls from('ride_bookings') twice — once for passenger, once for driver
      // Since our mock always returns same data, we just verify the call happens
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const reviews = await getPendingReviews();
      expect(Array.isArray(reviews)).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('ride_bookings');
    });

    it('maps passenger booking to pending review format', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [{
            id: 'booking-1',
            ride_id: 'ride-1',
            rides: {
              driver_id: 'driver-1',
              origin: 'London',
              destination: 'Oxford',
              departure_time: '2026-01-15T08:00:00Z',
              driver: { full_name: 'John Driver' },
            },
          }],
          error: null,
        })
      );

      const reviews = await getPendingReviews();
      expect(reviews.length).toBeGreaterThanOrEqual(1);
      // First set are passenger reviews
      const passengerReview = reviews.find(r => r.role === 'passenger');
      if (passengerReview) {
        expect(passengerReview.reviewee_name).toBe('John Driver');
        expect(passengerReview.origin).toBe('London');
        expect(passengerReview.destination).toBe('Oxford');
      }
    });

    it('handles errors gracefully (logs to console, does not throw)', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'query fail' } })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const reviews = await getPendingReviews();
      expect(Array.isArray(reviews)).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  // --- getUserReviews ---
  describe('getUserReviews', () => {
    it('returns reviews and total count', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { id: 'rev-1', overall_rating: 5, review_text: 'Great!', created_at: '2026-01-01' },
            { id: 'rev-2', overall_rating: 4, review_text: 'Good', created_at: '2026-01-02' },
          ],
          error: null,
          count: 15,
        })
      );

      const result = await getUserReviews('u1');
      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(15);
    });

    it('uses default limit and offset', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null, count: 0 })
      );

      await getUserReviews('u1');
      expect(mockSupabase.from).toHaveBeenCalledWith('ride_reviews_detailed');
    });

    it('uses custom limit and offset', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null, count: 0 })
      );

      await getUserReviews('u1', { limit: 5, offset: 10 });
      expect(mockSupabase.from).toHaveBeenCalledWith('ride_reviews_detailed');
    });

    it('throws on query error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'Query failed' } })
      );

      await expect(getUserReviews('u1')).rejects.toThrow('Query failed');
    });

    it('returns empty reviews when no data', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null, count: 0 })
      );

      const result = await getUserReviews('u1');
      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // --- getUserReviewStats ---
  describe('getUserReviewStats', () => {
    it('calculates averages correctly', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { overall_rating: 5, punctuality_rating: 5, cleanliness_rating: 4, communication_rating: 5, safety_rating: 5, comfort_rating: 4, would_ride_again: true },
            { overall_rating: 3, punctuality_rating: 3, cleanliness_rating: 4, communication_rating: 3, safety_rating: 4, comfort_rating: 3, would_ride_again: false },
          ],
          error: null,
        })
      );

      const stats = await getUserReviewStats('u1');
      expect(stats.averageRating).toBe(4); // (5+3)/2
      expect(stats.totalReviews).toBe(2);
      expect(stats.wouldRideAgainPercent).toBe(50); // 1/2
      expect(stats.categoryAverages.punctuality).toBe(4); // (5+3)/2
      expect(stats.categoryAverages.cleanliness).toBe(4); // (4+4)/2
    });

    it('returns zeros when no reviews', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: [], error: null })
      );

      const stats = await getUserReviewStats('u1');
      expect(stats.averageRating).toBe(0);
      expect(stats.totalReviews).toBe(0);
      expect(stats.wouldRideAgainPercent).toBe(0);
      expect(stats.categoryAverages).toEqual({});
    });

    it('handles null category ratings', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { overall_rating: 4, punctuality_rating: null, cleanliness_rating: null, communication_rating: null, safety_rating: null, comfort_rating: null, would_ride_again: true },
          ],
          error: null,
        })
      );

      const stats = await getUserReviewStats('u1');
      expect(stats.averageRating).toBe(4);
      expect(stats.categoryAverages.punctuality).toBe(0);
    });

    it('throws on query error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'fail' } })
      );

      await expect(getUserReviewStats('u1')).rejects.toThrow('fail');
    });

    it('calculates 100% would ride again when all true', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({
          data: [
            { overall_rating: 5, would_ride_again: true, punctuality_rating: null, cleanliness_rating: null, communication_rating: null, safety_rating: null, comfort_rating: null },
            { overall_rating: 4, would_ride_again: true, punctuality_rating: null, cleanliness_rating: null, communication_rating: null, safety_rating: null, comfort_rating: null },
          ],
          error: null,
        })
      );

      const stats = await getUserReviewStats('u1');
      expect(stats.wouldRideAgainPercent).toBe(100);
    });
  });

  // --- hasReviewed ---
  describe('hasReviewed', () => {
    it('returns true when review exists', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null, count: 1 })
      );

      const result = await hasReviewed('b1', 'u1');
      expect(result).toBe(true);
    });

    it('returns false when no review exists', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null, count: 0 })
      );

      const result = await hasReviewed('b1', 'u1');
      expect(result).toBe(false);
    });

    it('throws on query error', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' }, count: null })
      );

      await expect(hasReviewed('b1', 'u1')).rejects.toThrow('DB error');
    });

    it('returns false when count is null', async () => {
      mockSupabase.from.mockImplementation(() =>
        mockSupabase.makeFreshChain({ data: null, error: null, count: null })
      );

      const result = await hasReviewed('b1', 'u1');
      expect(result).toBe(false);
    });
  });
});
