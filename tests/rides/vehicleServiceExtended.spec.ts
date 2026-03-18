/**
 * Extended enterprise-grade tests for vehicleService.
 *
 * Supplements the existing tests/vehicleService.spec.ts with edge cases:
 *  - deactivateVehicle missing id guard
 *  - RPC error propagation
 *  - Query chain verification
 */
import { describe, expect, it, vi } from 'vitest';
import { deactivateVehicle, getUserVehicles } from '../../src/services/vehicleService';

describe('vehicleService — extended edge cases', () => {
  // -----------------------------------------------------------------------
  // deactivateVehicle
  // -----------------------------------------------------------------------
  describe('deactivateVehicle', () => {
    it('guards against empty vehicle id', async () => {
      const result = await deactivateVehicle('', {} as any);
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it('passes vehicleId as p_vehicle_id to RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      const client = { rpc } as any;

      await deactivateVehicle('veh-xyz', client);
      expect(rpc).toHaveBeenCalledWith('deactivate_vehicle', {
        p_vehicle_id: 'veh-xyz',
      });
    });

    it('returns RPC error when present', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Vehicle not found', code: '42P01' },
      });
      const client = { rpc } as any;

      const result = await deactivateVehicle('veh-1', client);
      expect(result.error).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // getUserVehicles
  // -----------------------------------------------------------------------
  describe('getUserVehicles', () => {
    it('returns empty data and error for empty userId', async () => {
      const result = await getUserVehicles('', {}, {} as any);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
    });

    it('returns data from Supabase on success', async () => {
      const vehicles = [
        { id: 'v-1', make: 'Honda', model: 'Civic', is_active: true },
        { id: 'v-2', make: 'Toyota', model: 'Camry', is_active: true },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: vehicles, error: null }),
      };
      const client = { from: vi.fn().mockReturnValue(query) } as any;

      const result = await getUserVehicles('user-1', { activeOnly: true }, client);
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('returns error and empty data when Supabase fails', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
      };
      const client = { from: vi.fn().mockReturnValue(query) } as any;

      const result = await getUserVehicles('user-1', {}, client);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
    });

    it('does not add is_active filter when activeOnly is false', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const client = { from: vi.fn().mockReturnValue(query) } as any;

      await getUserVehicles('user-1', { activeOnly: false }, client);

      // Should have user_id eq but NOT is_active eq
      const eqCalls = query.eq.mock.calls;
      expect(eqCalls.some((c: any[]) => c[0] === 'user_id')).toBe(true);
      expect(eqCalls.some((c: any[]) => c[0] === 'is_active')).toBe(false);
    });

    it('applies ascending: false ordering by created_at', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const client = { from: vi.fn().mockReturnValue(query) } as any;

      await getUserVehicles('user-1', {}, client);
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
});
