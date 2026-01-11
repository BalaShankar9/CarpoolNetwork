import { describe, expect, it, vi } from 'vitest';
import { deactivateVehicle, getUserVehicles } from '../src/services/vehicleService';

describe('vehicleService', () => {
  it('fetches user vehicles with active filter', async () => {
    const response = { data: [{ id: 'veh-1' }], error: null };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(response),
    };
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as any;

    const result = await getUserVehicles('user-1', { activeOnly: true }, client);

    expect(client.from).toHaveBeenCalledWith('vehicles');
    expect(query.eq.mock.calls).toContainEqual(['user_id', 'user-1']);
    expect(query.eq.mock.calls).toContainEqual(['is_active', true]);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.data).toHaveLength(1);
  });

  it('fetches user vehicles without active filter', async () => {
    const response = { data: [{ id: 'veh-2' }], error: null };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(response),
    };
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as any;

    await getUserVehicles('user-2', { activeOnly: false }, client);

    expect(query.eq.mock.calls).toContainEqual(['user_id', 'user-2']);
    const hasActiveFilter = query.eq.mock.calls.some((call) => call[0] === 'is_active');
    expect(hasActiveFilter).toBe(false);
  });

  it('returns an error for missing user id', async () => {
    const result = await getUserVehicles('', { activeOnly: true } as any, {} as any);
    expect(result.error).toBeTruthy();
    expect(result.data).toHaveLength(0);
  });

  it('calls deactivate_vehicle rpc', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const client = { rpc } as any;

    await deactivateVehicle('veh-3', client);

    expect(rpc).toHaveBeenCalledWith('deactivate_vehicle', { p_vehicle_id: 'veh-3' });
  });
});
