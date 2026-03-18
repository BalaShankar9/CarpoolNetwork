/**
 * Enterprise-grade tests for src/services/rideTrackingService.ts
 *
 * PART A — Pure functions (no Supabase):
 *  - calculateETA (Haversine + minimum speed clamp)
 *
 * PART B — RPC wrappers (Supabase mocked):
 *  - startRideTracking, updateRideLocation
 *  - markPassengerPickedUp, markPassengerDroppedOff
 *  - completeRideTracking
 *  - getActiveRideTracking (success, PGRST116, other error)
 *  - subscribeToRideTracking (channel setup + cleanup)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  LONDON_COORDS,
  OXFORD_COORDS,
} from './helpers';

// ---------------------------------------------------------------------------
// We must mock the supabase module BEFORE importing the functions.
// ---------------------------------------------------------------------------
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

import {
  calculateETA,
  startRideTracking,
  updateRideLocation,
  markPassengerPickedUp,
  markPassengerDroppedOff,
  completeRideTracking,
  getActiveRideTracking,
  subscribeToRideTracking,
} from '../../src/services/rideTrackingService';

beforeEach(() => {
  vi.clearAllMocks();
});

// ===================================================================
// PART A — Pure functions
// ===================================================================
describe('rideTrackingService — calculateETA (pure)', () => {
  it('returns distance and eta for known London → Oxford', () => {
    const result = calculateETA(
      { latitude: LONDON_COORDS.lat, longitude: LONDON_COORDS.lng },
      { latitude: OXFORD_COORDS.lat, longitude: OXFORD_COORDS.lng },
      60
    );
    // ~83 km, at 60 km/h → ~83 min
    expect(result.distanceKm).toBeGreaterThan(70);
    expect(result.distanceKm).toBeLessThan(95);
    expect(result.etaMinutes).toBeGreaterThan(60);
    expect(result.etaMinutes).toBeLessThan(120);
  });

  it('clamps speed to minimum 30 km/h when stationary', () => {
    const result = calculateETA(
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.6, longitude: -0.2 },
      0 // stationary
    );
    // With min speed 30 km/h, should still get a reasonable ETA
    expect(result.etaMinutes).toBeGreaterThan(0);
  });

  it('clamps speed to 30 km/h for negative speed', () => {
    const result1 = calculateETA(
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.6, longitude: -0.2 },
      -10
    );
    const result2 = calculateETA(
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.6, longitude: -0.2 },
      0
    );
    // Both should use min speed of 30
    expect(result1.etaMinutes).toBe(result2.etaMinutes);
  });

  it('returns 0 distance and 0 ETA for same origin/destination', () => {
    const result = calculateETA(
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.5, longitude: -0.1 },
      60
    );
    expect(result.distanceKm).toBe(0);
    expect(result.etaMinutes).toBe(0);
  });

  it('returns integer minutes', () => {
    const result = calculateETA(
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.6, longitude: -0.2 },
      45
    );
    expect(Number.isInteger(result.etaMinutes)).toBe(true);
  });
});

// ===================================================================
// PART B — RPC wrappers
// ===================================================================
describe('rideTrackingService — startRideTracking', () => {
  it('calls RPC with correct params and returns result', async () => {
    const expected = { tracking_id: 'trk-1', success: true, message: 'Started' };
    mockRpc.mockResolvedValue({ data: [expected], error: null });

    const result = await startRideTracking('ride-1', { latitude: 51.5, longitude: -0.1 });

    expect(mockRpc).toHaveBeenCalledWith('start_ride_tracking', {
      p_ride_id: 'ride-1',
      p_initial_lat: 51.5,
      p_initial_lng: -0.1,
    });
    expect(result).toEqual(expected);
  });

  it('throws on Supabase error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    await expect(
      startRideTracking('ride-1', { latitude: 51.5, longitude: -0.1 })
    ).rejects.toThrow('DB error');
  });

  it('returns fallback when data is empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const result = await startRideTracking('ride-1', { latitude: 51.5, longitude: -0.1 });
    expect(result.success).toBe(false);
    expect(result.tracking_id).toBe('');
  });
});

describe('rideTrackingService — updateRideLocation', () => {
  it('calls RPC with correct params', async () => {
    const expected = { success: true, deviation_meters: 5, message: 'OK' };
    mockRpc.mockResolvedValue({ data: [expected], error: null });

    const result = await updateRideLocation('ride-1', {
      latitude: 51.5,
      longitude: -0.1,
      speed_kmh: 40,
      heading: 90,
    });

    expect(mockRpc).toHaveBeenCalledWith('update_ride_location', {
      p_ride_id: 'ride-1',
      p_lat: 51.5,
      p_lng: -0.1,
      p_speed_kmh: 40,
      p_heading: 90,
    });
    expect(result).toEqual(expected);
  });

  it('defaults speed and heading to 0', async () => {
    mockRpc.mockResolvedValue({ data: [{ success: true, deviation_meters: 0, message: '' }], error: null });

    await updateRideLocation('ride-1', { latitude: 51.5, longitude: -0.1 });

    expect(mockRpc).toHaveBeenCalledWith('update_ride_location', expect.objectContaining({
      p_speed_kmh: 0,
      p_heading: 0,
    }));
  });

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(
      updateRideLocation('ride-1', { latitude: 51.5, longitude: -0.1 })
    ).rejects.toThrow('fail');
  });
});

describe('rideTrackingService — markPassengerPickedUp', () => {
  it('calls correct RPC', async () => {
    mockRpc.mockResolvedValue({ data: [{ success: true, message: 'Picked up' }], error: null });
    const result = await markPassengerPickedUp('ride-1', 'passenger-1');
    expect(mockRpc).toHaveBeenCalledWith('mark_passenger_picked_up', {
      p_ride_id: 'ride-1',
      p_passenger_id: 'passenger-1',
    });
    expect(result.success).toBe(true);
  });

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    await expect(markPassengerPickedUp('ride-1', 'p-1')).rejects.toThrow('Not found');
  });
});

describe('rideTrackingService — markPassengerDroppedOff', () => {
  it('calls correct RPC', async () => {
    mockRpc.mockResolvedValue({ data: [{ success: true, message: 'Dropped off' }], error: null });
    const result = await markPassengerDroppedOff('ride-1', 'passenger-1');
    expect(mockRpc).toHaveBeenCalledWith('mark_passenger_dropped_off', {
      p_ride_id: 'ride-1',
      p_passenger_id: 'passenger-1',
    });
    expect(result.success).toBe(true);
  });

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'err' } });
    await expect(markPassengerDroppedOff('r-1', 'p-1')).rejects.toThrow('err');
  });
});

describe('rideTrackingService — completeRideTracking', () => {
  it('calls correct RPC', async () => {
    mockRpc.mockResolvedValue({ data: [{ success: true, message: 'Complete' }], error: null });
    const result = await completeRideTracking('ride-1');
    expect(mockRpc).toHaveBeenCalledWith('complete_ride_tracking', {
      p_ride_id: 'ride-1',
    });
    expect(result.success).toBe(true);
  });

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(completeRideTracking('r-1')).rejects.toThrow('fail');
  });
});

describe('rideTrackingService — getActiveRideTracking', () => {
  it('returns transformed tracking data on success', async () => {
    const raw = {
      id: 'trk-1',
      ride_id: 'ride-1',
      driver_id: 'driver-1',
      current_location: { type: 'Point', coordinates: [-0.1, 51.5] },
      current_speed_kmh: 40,
      heading_degrees: 90,
      route_deviation_meters: 10,
      eta_to_next_stop: '5 min',
      passengers_onboard: ['p-1'],
      last_updated: '2025-01-01T00:00:00Z',
      ride_started_at: '2025-01-01T00:00:00Z',
      ride_ended_at: null,
    };

    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: raw, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    const result = await getActiveRideTracking('ride-1');

    expect(mockFrom).toHaveBeenCalledWith('ride_tracking');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('trk-1');
    expect(result!.current_location).toEqual({ longitude: -0.1, latitude: 51.5 });
    expect(result!.passengers_onboard).toEqual(['p-1']);
  });

  it('returns null for PGRST116 (no rows)', async () => {
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
    };
    mockFrom.mockReturnValue(chainMock);

    const result = await getActiveRideTracking('ride-1');
    expect(result).toBeNull();
  });

  it('throws on non-PGRST116 error', async () => {
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: '42P01', message: 'Table missing' } }),
    };
    mockFrom.mockReturnValue(chainMock);

    await expect(getActiveRideTracking('ride-1')).rejects.toThrow('Table missing');
  });

  it('handles null current_location gracefully', async () => {
    const raw = {
      id: 'trk-2',
      ride_id: 'ride-2',
      driver_id: 'driver-2',
      current_location: null,
      current_speed_kmh: null,
      heading_degrees: null,
      route_deviation_meters: null,
      eta_to_next_stop: null,
      passengers_onboard: null,
      last_updated: '2025-01-01T00:00:00Z',
      ride_started_at: null,
      ride_ended_at: null,
    };
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: raw, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    const result = await getActiveRideTracking('ride-2');
    expect(result!.current_location).toBeNull();
    expect(result!.current_speed_kmh).toBe(0);
    expect(result!.heading_degrees).toBe(0);
    expect(result!.passengers_onboard).toEqual([]);
  });
});

describe('rideTrackingService — subscribeToRideTracking', () => {
  it('sets up a realtime channel and returns cleanup function', () => {
    const subscribeMock = vi.fn().mockReturnThis();
    const onMock = vi.fn().mockReturnValue({ subscribe: subscribeMock });
    mockChannel.mockReturnValue({ on: onMock });

    const callback = vi.fn();
    const cleanup = subscribeToRideTracking('ride-1', callback);

    expect(mockChannel).toHaveBeenCalledWith('ride_tracking_ride-1');
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'ride_tracking',
        filter: 'ride_id=eq.ride-1',
      }),
      expect.any(Function)
    );
    expect(typeof cleanup).toBe('function');
  });

  it('cleanup calls removeChannel', () => {
    // The real flow: channel.on(...).subscribe() returns the subscribed channel
    // subscribeToRideTracking stores the result of .subscribe() and passes it to removeChannel
    const subscribedChannel = { id: 'subscribed' };
    const subscribeMock = vi.fn().mockReturnValue(subscribedChannel);
    const onMock = vi.fn().mockReturnValue({ subscribe: subscribeMock });
    const channel = { on: onMock };
    mockChannel.mockReturnValue(channel);

    const cleanup = subscribeToRideTracking('ride-1', vi.fn());
    cleanup();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
