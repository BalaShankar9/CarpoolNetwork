/**
 * Extended enterprise-grade tests for rideService.
 *
 * Supplements the existing tests/rideService.spec.ts with edge cases:
 *  - RPC returns error object
 *  - RPC returns null data
 *  - Client default parameter behavior (can't test without real supabase, but we test the injectable path)
 */
import { describe, expect, it, vi } from 'vitest';
import { deleteRideForDriver, syncExpiredRideState } from '../../src/services/rideService';

describe('rideService — extended edge cases', () => {
  // -----------------------------------------------------------------------
  // deleteRideForDriver
  // -----------------------------------------------------------------------
  describe('deleteRideForDriver', () => {
    it('returns Supabase error when RPC fails', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      });
      const client = { rpc } as any;

      const result = await deleteRideForDriver('ride-1', client);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('permission denied');
    });

    it('returns success data from RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: { deleted: true, bookings_cancelled: 2 },
        error: null,
      });
      const client = { rpc } as any;

      const result = await deleteRideForDriver('ride-1', client);
      expect(result.data).toEqual({ deleted: true, bookings_cancelled: 2 });
      expect(result.error).toBeNull();
    });

    it('guards against empty string ride id', async () => {
      const result = await deleteRideForDriver('', {} as any);
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it('passes rideId as p_ride_id to RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const client = { rpc } as any;

      await deleteRideForDriver('my-ride-xyz', client);
      expect(rpc).toHaveBeenCalledWith('delete_ride_for_driver', {
        p_ride_id: 'my-ride-xyz',
      });
    });
  });

  // -----------------------------------------------------------------------
  // syncExpiredRideState
  // -----------------------------------------------------------------------
  describe('syncExpiredRideState', () => {
    it('returns success from RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: { synced: 5 },
        error: null,
      });
      const client = { rpc } as any;

      const result = await syncExpiredRideState(client);
      expect(result.data).toEqual({ synced: 5 });
    });

    it('returns error from RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'timeout' },
      });
      const client = { rpc } as any;

      const result = await syncExpiredRideState(client);
      expect(result.error).toBeTruthy();
    });

    it('calls RPC with no extra arguments', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const client = { rpc } as any;

      await syncExpiredRideState(client);
      expect(rpc).toHaveBeenCalledWith('sync_expired_ride_state');
      expect(rpc.mock.calls[0]).toHaveLength(1);
    });
  });
});
