import { describe, expect, it, vi } from 'vitest';
import { deleteRideForDriver, syncExpiredRideState } from '../src/services/rideService';

describe('rideService', () => {
  it('calls delete_ride_for_driver rpc', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const client = { rpc } as any;

    await deleteRideForDriver('ride-1', client);

    expect(rpc).toHaveBeenCalledWith('delete_ride_for_driver', { p_ride_id: 'ride-1' });
  });

  it('returns an error for missing ride id', async () => {
    const result = await deleteRideForDriver('', {} as any);
    expect(result.error).toBeTruthy();
  });

  it('calls sync_expired_ride_state rpc', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const client = { rpc } as any;

    await syncExpiredRideState(client);

    expect(rpc).toHaveBeenCalledWith('sync_expired_ride_state');
  });
});
