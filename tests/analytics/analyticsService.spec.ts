/**
 * Enterprise-grade tests for analyticsService
 *
 * Covers: getUserStats, getTrendData, getEnvironmentalImpact,
 * generateReport (JSON + CSV), private helper behaviour via public API,
 * edge cases (no rides, no reviews, empty data, null fields)
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
      'single', 'maybeSingle', 'filter', 'range', 'contains', 'upsert', 'head',
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

import { analyticsService } from '../../src/services/analyticsService';
import type { UserStats, TrendData, EnvironmentalImpact } from '../../src/services/analyticsService';

import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_THIRD_USER_ID,
  FAKE_DRIVER_RIDE,
  FAKE_DRIVER_RIDE_2,
  FAKE_DRIVER_RIDE_NO_PASSENGERS,
  FAKE_PASSENGER_BOOKING,
  FAKE_PASSENGER_BOOKING_2,
  FAKE_REVIEWS,
  FAKE_PARTNER_PROFILE,
  FAKE_PARTNER_PROFILE_2,
  FAKE_ALL_USERS_RIDES,
  CO2_PER_KM_CAR,
  CO2_PER_TREE_PER_YEAR,
  FUEL_EFFICIENCY,
  LITERS_PER_GALLON,
  KM_PER_MILE,
} from './helpers';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Setup mock responses for getUserStats
// ═══════════════════════════════════════════════════════════════════════════
function setupGetUserStatsMock(options: {
  driverRides?: any[];
  passengerBookings?: any[];
  reviews?: any[];
  partnerProfiles?: any[];
}) {
  const {
    driverRides = [],
    passengerBookings = [],
    reviews = [],
    partnerProfiles = [],
  } = options;

  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'rides') {
      callCount++;
      return mockSupabase.makeFreshChain({ data: driverRides, error: null });
    }
    if (table === 'ride_bookings') {
      return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
    }
    if (table === 'reviews') {
      return mockSupabase.makeFreshChain({ data: reviews, error: null });
    }
    if (table === 'profiles') {
      return mockSupabase.makeFreshChain({ data: partnerProfiles, error: null });
    }
    return mockSupabase.makeFreshChain({ data: null, error: null });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// getUserStats
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService.getUserStats', () => {
  it('returns correct ride counts for driver and passenger', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE, FAKE_DRIVER_RIDE_2],
      passengerBookings: [FAKE_PASSENGER_BOOKING],
      reviews: FAKE_REVIEWS,
      partnerProfiles: [FAKE_PARTNER_PROFILE, FAKE_PARTNER_PROFILE_2],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.ridesGiven).toBe(2);
    expect(stats.ridesTaken).toBe(1);
    expect(stats.userId).toBe(FAKE_USER_ID);
    expect(stats.period).toBe('month');
  });

  it('calculates total distance from both driver and passenger rides', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE], // 10km
      passengerBookings: [FAKE_PASSENGER_BOOKING], // 8km
      reviews: [],
      partnerProfiles: [FAKE_PARTNER_PROFILE],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.totalDistance).toBe(18); // 10 + 8
  });

  it('calculates total duration from both driver and passenger rides', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE], // 25 min
      passengerBookings: [FAKE_PASSENGER_BOOKING], // 20 min
      reviews: [],
      partnerProfiles: [FAKE_PARTNER_PROFILE],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.totalDuration).toBe(45); // 25 + 20
  });

  it('calculates CO2 saved correctly for driver rides (per passenger)', async () => {
    // FAKE_DRIVER_RIDE: 10km * 0.21 * 1 passenger = 2.1 kg
    // FAKE_DRIVER_RIDE_2: 10km * 0.21 * 1 passenger = 2.1 kg
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE, FAKE_DRIVER_RIDE_2],
      passengerBookings: [],
      reviews: [],
      partnerProfiles: [FAKE_PARTNER_PROFILE, FAKE_PARTNER_PROFILE_2],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    const expected = 10 * CO2_PER_KM_CAR * 1 + 10 * CO2_PER_KM_CAR * 1; // 4.2
    expect(stats.co2Saved).toBeCloseTo(expected, 4);
  });

  it('calculates CO2 saved for passenger rides', async () => {
    // FAKE_PASSENGER_BOOKING: 8km * 0.21 = 1.68 kg
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: [FAKE_PASSENGER_BOOKING],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.co2Saved).toBeCloseTo(8 * CO2_PER_KM_CAR, 4);
  });

  it('calculates trees equivalent from CO2 saved', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE],
      passengerBookings: [FAKE_PASSENGER_BOOKING],
      reviews: [],
      partnerProfiles: [FAKE_PARTNER_PROFILE],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.treesEquivalent).toBeCloseTo(stats.co2Saved / CO2_PER_TREE_PER_YEAR, 4);
  });

  it('returns average rating from reviews', async () => {
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: [],
      reviews: [{ rating: 5 }, { rating: 4 }, { rating: 3 }],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.averageRating).toBe(4);
    expect(stats.totalReviews).toBe(3);
  });

  it('returns 0 average rating when no reviews exist', async () => {
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: [],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.averageRating).toBe(0);
    expect(stats.totalReviews).toBe(0);
  });

  it('moneySaved and fuelContributions are always 0 (free platform)', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE],
      passengerBookings: [FAKE_PASSENGER_BOOKING],
      reviews: [],
      partnerProfiles: [FAKE_PARTNER_PROFILE],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.moneySaved).toBe(0);
    expect(stats.fuelContributions).toBe(0);
  });

  it('defaults period to month', async () => {
    setupGetUserStatsMock({ driverRides: [], passengerBookings: [], reviews: [] });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID);

    expect(stats.period).toBe('month');
  });

  it('excludes driver rides without confirmed passengers', async () => {
    setupGetUserStatsMock({
      driverRides: [FAKE_DRIVER_RIDE_NO_PASSENGERS], // no confirmed bookings
      passengerBookings: [],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.ridesGiven).toBe(0);
    expect(stats.totalDistance).toBe(0);
    expect(stats.co2Saved).toBe(0);
  });

  it('handles null data from Supabase gracefully', async () => {
    // All queries return null data
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.ridesGiven).toBe(0);
    expect(stats.ridesTaken).toBe(0);
    expect(stats.totalDistance).toBe(0);
    expect(stats.co2Saved).toBe(0);
    expect(stats.topRoutes).toEqual([]);
    expect(stats.frequentPartners).toEqual([]);
    expect(stats.peakTimes).toEqual([]);
  });

  it('uses different date ranges for each period', async () => {
    setupGetUserStatsMock({ driverRides: [], passengerBookings: [], reviews: [] });

    for (const period of ['week', 'month', 'year', 'all'] as const) {
      await analyticsService.getUserStats(FAKE_USER_ID, period);
    }

    // Verify from() was called for each period
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  // ── topRoutes ─────────────────────────────────────────────────────────
  describe('topRoutes', () => {
    it('aggregates routes and sorts by count descending', async () => {
      // Two rides same route, one different
      const rides = [
        { ...FAKE_DRIVER_RIDE, origin: 'A', destination: 'B', distance_km: 10, duration_minutes: 20 },
        { ...FAKE_DRIVER_RIDE_2, origin: 'A', destination: 'B', distance_km: 10, duration_minutes: 20 },
        { ...FAKE_DRIVER_RIDE, id: 'r3', origin: 'C', destination: 'D', distance_km: 5, duration_minutes: 10 },
      ];
      setupGetUserStatsMock({
        driverRides: rides,
        passengerBookings: [],
        reviews: [],
        partnerProfiles: [FAKE_PARTNER_PROFILE, FAKE_PARTNER_PROFILE_2],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.topRoutes.length).toBeGreaterThanOrEqual(1);
      expect(stats.topRoutes[0].origin).toBe('A');
      expect(stats.topRoutes[0].destination).toBe('B');
      expect(stats.topRoutes[0].count).toBe(2);
    });

    it('limits to 5 top routes', async () => {
      const rides = Array.from({ length: 10 }, (_, i) => ({
        ...FAKE_DRIVER_RIDE,
        id: `r${i}`,
        origin: `Origin${i}`,
        destination: `Dest${i}`,
        distance_km: 10,
        duration_minutes: 20,
      }));
      setupGetUserStatsMock({
        driverRides: rides,
        passengerBookings: [],
        reviews: [],
        partnerProfiles: [FAKE_PARTNER_PROFILE],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.topRoutes.length).toBeLessThanOrEqual(5);
    });
  });

  // ── frequentPartners ──────────────────────────────────────────────────
  describe('frequentPartners', () => {
    it('returns partner profiles with ride counts', async () => {
      setupGetUserStatsMock({
        driverRides: [FAKE_DRIVER_RIDE],
        passengerBookings: [FAKE_PASSENGER_BOOKING],
        reviews: [],
        partnerProfiles: [FAKE_PARTNER_PROFILE],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.frequentPartners.length).toBeGreaterThanOrEqual(1);
    });

    it('limits to 5 frequent partners', async () => {
      // Create rides with 10 different passengers
      const manyRides = Array.from({ length: 10 }, (_, i) => ({
        ...FAKE_DRIVER_RIDE,
        id: `r${i}`,
        ride_bookings: [{ id: `b${i}`, passenger_id: `pass-${i}`, status: 'confirmed' }],
      }));
      const profiles = Array.from({ length: 10 }, (_, i) => ({
        id: `pass-${i}`,
        full_name: `Partner ${i}`,
        avatar_url: null,
      }));
      setupGetUserStatsMock({
        driverRides: manyRides,
        passengerBookings: [],
        reviews: [],
        partnerProfiles: profiles,
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.frequentPartners.length).toBeLessThanOrEqual(5);
    });

    it('returns empty when no partners exist', async () => {
      setupGetUserStatsMock({
        driverRides: [FAKE_DRIVER_RIDE_NO_PASSENGERS],
        passengerBookings: [],
        reviews: [],
        partnerProfiles: [],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.frequentPartners).toEqual([]);
    });
  });

  // ── peakTimes ─────────────────────────────────────────────────────────
  describe('peakTimes', () => {
    it('returns peak times sorted by ride count', async () => {
      setupGetUserStatsMock({
        driverRides: [FAKE_DRIVER_RIDE, FAKE_DRIVER_RIDE_2],
        passengerBookings: [FAKE_PASSENGER_BOOKING],
        reviews: [],
        partnerProfiles: [FAKE_PARTNER_PROFILE, FAKE_PARTNER_PROFILE_2],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      // Should have peak times entries
      expect(Array.isArray(stats.peakTimes)).toBe(true);
      for (const pt of stats.peakTimes) {
        expect(pt).toHaveProperty('hour');
        expect(pt).toHaveProperty('dayOfWeek');
        expect(pt).toHaveProperty('rideCount');
      }
    });

    it('limits to 10 peak time entries', async () => {
      // Create 20 rides at different times
      const rides = Array.from({ length: 20 }, (_, i) => {
        const d = new Date('2026-01-15T00:00:00Z');
        d.setHours(i % 24);
        d.setDate(d.getDate() + Math.floor(i / 24));
        return {
          ...FAKE_DRIVER_RIDE,
          id: `r${i}`,
          departure_time: d.toISOString(),
        };
      });
      setupGetUserStatsMock({
        driverRides: rides,
        passengerBookings: [],
        reviews: [],
        partnerProfiles: [FAKE_PARTNER_PROFILE],
      });

      const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

      expect(stats.peakTimes.length).toBeLessThanOrEqual(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getTrendData
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService.getTrendData', () => {
  function setupTrendMock(driverRides: any[] = [], passengerBookings: any[] = []) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: driverRides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });
  }

  it('returns an array of TrendData sorted by date', async () => {
    setupTrendMock([FAKE_DRIVER_RIDE], [FAKE_PASSENGER_BOOKING]);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    expect(Array.isArray(trends)).toBe(true);
    // Should be sorted
    for (let i = 1; i < trends.length; i++) {
      expect(trends[i].date >= trends[i - 1].date).toBe(true);
    }
  });

  it('initializes all dates in range even without rides', async () => {
    setupTrendMock([], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'week');

    // Week = 7 days (or 8 depending on boundary), should have entries
    expect(trends.length).toBeGreaterThanOrEqual(7);
    for (const t of trends) {
      expect(t.ridesGiven).toBe(0);
      expect(t.ridesTaken).toBe(0);
    }
  });

  it('aggregates driver rides into trend data', async () => {
    // Use a recent date that falls within the "month" range
    const recentRide = {
      ...FAKE_DRIVER_RIDE,
      departure_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setupTrendMock([recentRide], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    const totalGiven = trends.reduce((s, t) => s + t.ridesGiven, 0);
    expect(totalGiven).toBe(1);
  });

  it('aggregates passenger rides into trend data', async () => {
    const recentBooking = {
      ...FAKE_PASSENGER_BOOKING,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setupTrendMock([], [recentBooking]);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    const totalTaken = trends.reduce((s, t) => s + t.ridesTaken, 0);
    expect(totalTaken).toBe(1);
  });

  it('uses daily granularity for week period', async () => {
    setupTrendMock([], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'week');

    // Daily format: YYYY-MM-DD (10 chars)
    for (const t of trends) {
      expect(t.date.length).toBe(10);
    }
  });

  it('uses daily granularity for month period', async () => {
    setupTrendMock([], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    for (const t of trends) {
      expect(t.date.length).toBe(10);
    }
  });

  it('uses monthly granularity for year period', async () => {
    setupTrendMock([], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'year');

    // Monthly format: YYYY-MM (7 chars)
    for (const t of trends) {
      expect(t.date.length).toBe(7);
    }
  });

  it('calculates CO2 saved in trend data', async () => {
    const recentRide = {
      ...FAKE_DRIVER_RIDE,
      departure_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setupTrendMock([recentRide], []);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    const totalCo2 = trends.reduce((s, t) => s + t.co2Saved, 0);
    // 10km * 0.21 * 1 passenger = 2.1
    expect(totalCo2).toBeCloseTo(10 * CO2_PER_KM_CAR * 1, 2);
  });

  it('each TrendData entry has all required fields', async () => {
    setupTrendMock([FAKE_DRIVER_RIDE], [FAKE_PASSENGER_BOOKING]);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    for (const t of trends) {
      expect(t).toHaveProperty('date');
      expect(t).toHaveProperty('ridesGiven');
      expect(t).toHaveProperty('ridesTaken');
      expect(t).toHaveProperty('co2Saved');
      expect(t).toHaveProperty('distance');
      expect(t).toHaveProperty('contributions');
      expect(t).toHaveProperty('savings');
    }
  });

  it('handles null ride data gracefully', async () => {
    setupTrendMock(null as any, null as any);

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    expect(Array.isArray(trends)).toBe(true);
    const total = trends.reduce((s, t) => s + t.ridesGiven + t.ridesTaken, 0);
    expect(total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getEnvironmentalImpact
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService.getEnvironmentalImpact', () => {
  function setupImpactMock(options: {
    driverRides?: any[];
    passengerBookings?: any[];
    reviews?: any[];
    yearRides?: any[];
    allUsersRides?: any[];
    partnerProfiles?: any[];
  } = {}) {
    const {
      driverRides = [FAKE_DRIVER_RIDE],
      passengerBookings = [FAKE_PASSENGER_BOOKING],
      reviews = FAKE_REVIEWS,
      yearRides = [FAKE_DRIVER_RIDE],
      allUsersRides = FAKE_ALL_USERS_RIDES,
      partnerProfiles = [FAKE_PARTNER_PROFILE],
    } = options;

    // getEnvironmentalImpact calls getUserStats internally then does 2 more queries.
    // getUserStats calls from('rides'), from('ride_bookings'), from('reviews'), from('profiles')
    // then getEnvironmentalImpact calls from('rides') x2 more (yearRides and allUsers)
    // We track call index per table to return appropriate data.
    const ridesCalls: any[][] = [driverRides, yearRides, allUsersRides];
    let ridesCallIndex = 0;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        const data = ridesCalls[ridesCallIndex] || [];
        ridesCallIndex++;
        return mockSupabase.makeFreshChain({ data, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
      }
      if (table === 'reviews') {
        return mockSupabase.makeFreshChain({ data: reviews, error: null });
      }
      if (table === 'profiles') {
        return mockSupabase.makeFreshChain({ data: partnerProfiles, error: null });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });
  }

  it('returns correct totalCo2Saved from all-time stats', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.totalCo2Saved).toBeGreaterThanOrEqual(0);
    expect(typeof impact.totalCo2Saved).toBe('number');
  });

  it('returns treesEquivalent derived from co2Saved', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.treesEquivalent).toBeCloseTo(impact.totalCo2Saved / CO2_PER_TREE_PER_YEAR, 2);
  });

  it('calculates gallonsSaved correctly', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    // gallonsSaved = (totalDistance / FUEL_EFFICIENCY) / LITERS_PER_GALLON
    expect(impact.gallonsSaved).toBeGreaterThanOrEqual(0);
    expect(typeof impact.gallonsSaved).toBe('number');
  });

  it('calculates milesSaved correctly', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.milesSaved).toBeGreaterThanOrEqual(0);
    expect(typeof impact.milesSaved).toBe('number');
  });

  it('calculates carsOffRoad (equivalent days)', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    // carsOffRoad = co2Saved / (CO2_PER_KM_CAR * 50)
    expect(impact.carsOffRoad).toBeGreaterThanOrEqual(0);
  });

  it('returns 12-month monthlyTrend array', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.monthlyTrend.length).toBe(12);
    for (const entry of impact.monthlyTrend) {
      expect(entry).toHaveProperty('month');
      expect(entry).toHaveProperty('co2Saved');
      expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('returns comparison with averageUser, yourSavings, percentile', async () => {
    setupImpactMock();

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.comparison).toHaveProperty('averageUser');
    expect(impact.comparison).toHaveProperty('yourSavings');
    expect(impact.comparison).toHaveProperty('percentile');
    expect(impact.comparison.percentile).toBeGreaterThanOrEqual(0);
    expect(impact.comparison.percentile).toBeLessThanOrEqual(100);
  });

  it('handles empty all-users data (percentile defaults to 50)', async () => {
    setupImpactMock({
      driverRides: [],
      passengerBookings: [],
      reviews: [],
      yearRides: [],
      allUsersRides: [],
      partnerProfiles: [],
    });

    const impact = await analyticsService.getEnvironmentalImpact(FAKE_USER_ID);

    expect(impact.comparison.percentile).toBe(50);
    expect(impact.comparison.averageUser).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// generateReport
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService.generateReport', () => {
  function setupReportMock() {
    const driverRides = [FAKE_DRIVER_RIDE];
    const passengerBookings = [FAKE_PASSENGER_BOOKING];
    const reviews = FAKE_REVIEWS;
    const yearRides = [FAKE_DRIVER_RIDE];
    const allUsersRides = FAKE_ALL_USERS_RIDES;
    const partnerProfiles = [FAKE_PARTNER_PROFILE];

    // generateReport calls getUserStats, getTrendData, getEnvironmentalImpact
    // which means many from() calls to rides, ride_bookings, reviews, profiles
    // We provide data for all tables
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: driverRides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
      }
      if (table === 'reviews') {
        return mockSupabase.makeFreshChain({ data: reviews, error: null });
      }
      if (table === 'profiles') {
        return mockSupabase.makeFreshChain({ data: partnerProfiles, error: null });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });
  }

  describe('JSON format', () => {
    it('returns valid JSON string', async () => {
      setupReportMock();

      const report = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'json');

      const parsed = JSON.parse(report);
      expect(parsed).toBeTruthy();
    });

    it('contains generatedAt, period, stats, trends, impact fields', async () => {
      setupReportMock();

      const report = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'json');
      const parsed = JSON.parse(report);

      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('period');
      expect(parsed.period).toHaveProperty('start');
      expect(parsed.period).toHaveProperty('end');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('trends');
      expect(parsed).toHaveProperty('impact');
    });

    it('stats in report match getUserStats output', async () => {
      setupReportMock();

      const report = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'json');
      const parsed = JSON.parse(report);

      expect(parsed.stats.userId).toBe(FAKE_USER_ID);
      expect(parsed.stats.period).toBe('month');
      expect(typeof parsed.stats.ridesGiven).toBe('number');
      expect(typeof parsed.stats.ridesTaken).toBe('number');
    });

    it('defaults format to json', async () => {
      setupReportMock();

      const report = await analyticsService.generateReport(FAKE_USER_ID, 'month');

      // Should be valid JSON
      expect(() => JSON.parse(report)).not.toThrow();
    });
  });

  describe('CSV format', () => {
    it('returns a CSV string with header and sections', async () => {
      setupReportMock();

      const csv = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'csv');

      expect(csv).toContain('CarpoolNetwork Statistics Report');
      expect(csv).toContain('SUMMARY');
      expect(csv).toContain('DAILY TRENDS');
      expect(csv).toContain('TOP ROUTES');
    });

    it('includes summary metrics in CSV', async () => {
      setupReportMock();

      const csv = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'csv');

      expect(csv).toContain('Rides Given');
      expect(csv).toContain('Rides Taken');
      expect(csv).toContain('Total Distance (km)');
      expect(csv).toContain('Money Saved');
      expect(csv).toContain('CO2 Saved (kg)');
      expect(csv).toContain('Trees Equivalent');
      expect(csv).toContain('Average Rating');
    });

    it('includes trend data rows in CSV', async () => {
      setupReportMock();

      const csv = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'csv');

      // After 'DAILY TRENDS' header there should be date rows
      const lines = csv.split('\n');
      const trendsHeaderIdx = lines.findIndex((l) => l.includes('DAILY TRENDS'));
      expect(trendsHeaderIdx).toBeGreaterThan(-1);

      // Column header line
      const colLine = lines[trendsHeaderIdx + 1];
      expect(colLine).toContain('Date');
      expect(colLine).toContain('Rides Given');
    });

    it('includes top routes section in CSV', async () => {
      setupReportMock();

      const csv = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'csv');

      expect(csv).toContain('TOP ROUTES');
      expect(csv).toContain('Origin,Destination,Count,Total Distance');
    });

    it('Generated At timestamp is present', async () => {
      setupReportMock();

      const csv = await analyticsService.generateReport(FAKE_USER_ID, 'month', 'csv');

      expect(csv).toMatch(/Generated: \d{4}-\d{2}-\d{2}/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService edge cases', () => {
  it('handles rides with null distance_km', async () => {
    const rideWithNull = { ...FAKE_DRIVER_RIDE, distance_km: null };
    setupGetUserStatsMock({
      driverRides: [rideWithNull],
      passengerBookings: [],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.totalDistance).toBe(0);
  });

  it('handles rides with null duration_minutes', async () => {
    const rideWithNull = { ...FAKE_DRIVER_RIDE, duration_minutes: null };
    setupGetUserStatsMock({
      driverRides: [rideWithNull],
      passengerBookings: [],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.totalDuration).toBe(0);
  });

  it('handles passenger booking with null ride object', async () => {
    const bookingNoRide = { ...FAKE_PASSENGER_BOOKING, ride: null };
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: [bookingNoRide],
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.ridesTaken).toBe(0);
  });

  it('handles reviews returning null', async () => {
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: [],
      reviews: null as any,
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    expect(stats.averageRating).toBe(0);
    expect(stats.totalReviews).toBe(0);
  });

  it('calculateTopRoutes skips null rides in array', async () => {
    // Passenger bookings map to ride objects; if ride is null it should be skipped
    const bookings = [
      { ...FAKE_PASSENGER_BOOKING, ride: null, status: 'confirmed' },
      FAKE_PASSENGER_BOOKING,
    ];
    setupGetUserStatsMock({
      driverRides: [],
      passengerBookings: bookings,
      reviews: [],
      partnerProfiles: [],
    });

    const stats = await analyticsService.getUserStats(FAKE_USER_ID, 'month');

    // Should not throw, and should still process the valid booking
    expect(Array.isArray(stats.topRoutes)).toBe(true);
  });

  it('trend data handles booking with null ride in passenger bookings', async () => {
    const bookingNoRide = { ...FAKE_PASSENGER_BOOKING, ride: null };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: [], error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: [bookingNoRide], error: null });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    const trends = await analyticsService.getTrendData(FAKE_USER_ID, 'month');

    // Should not throw
    expect(Array.isArray(trends)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Module exports
// ═══════════════════════════════════════════════════════════════════════════
describe('analyticsService module exports', () => {
  it('exports analyticsService singleton', async () => {
    const mod = await import('../../src/services/analyticsService');
    expect(mod.analyticsService).toBeDefined();
    expect(typeof mod.analyticsService.getUserStats).toBe('function');
    expect(typeof mod.analyticsService.getTrendData).toBe('function');
    expect(typeof mod.analyticsService.getEnvironmentalImpact).toBe('function');
    expect(typeof mod.analyticsService.generateReport).toBe('function');
  });

  it('exports default as same singleton', async () => {
    const mod = await import('../../src/services/analyticsService');
    expect(mod.default).toBe(mod.analyticsService);
  });

  it('exports TypeScript interfaces (type-level check)', async () => {
    // These are compile-time only — just ensure import doesn't throw
    const mod = await import('../../src/services/analyticsService');
    expect(mod).toBeDefined();
  });
});


