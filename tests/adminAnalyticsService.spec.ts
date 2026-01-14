import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

describe('adminAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to get fresh instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getKpiSummary', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      segment: 'all',
      rideType: 'all',
    };

    it('should use secure RPC when available', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          active_users: 150,
          active_users_delta: 10,
          new_users: 50,
          new_users_delta: 25,
          rides_posted: 200,
          rides_posted_delta: 15,
          bookings_created: 180,
          bookings_created_delta: 20,
          completion_rate: 85,
          completion_rate_delta: 5,
          cancellation_rate: 8,
          cancellation_rate_delta: -2,
          fill_rate: 72,
          fill_rate_delta: 3,
          messages_sent: 500,
          messages_sent_delta: 12,
        }],
        error: null,
      });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getKpiSummary(mockFilters);

      expect(mockRpc).toHaveBeenCalledWith('admin_kpi_summary', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
        p_community_id: null,
        p_segment: 'all',
        p_ride_type: 'all',
      });

      expect(result.activeUsers).toBe(150);
      expect(result.activeUsersDelta).toBe(10);
      expect(result.newUsers).toBe(50);
      expect(result.ridesPosted).toBe(200);
      expect(result.completionRate).toBe(85);
    });

    it('should return empty KPIs on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC not found' },
      });

      // Mock fallback queries to also fail
      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error('Query failed')),
          }),
        }),
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getKpiSummary(mockFilters);

      // Should return empty KPIs on error
      expect(result.activeUsers).toBe(0);
      expect(result.newUsers).toBe(0);
      expect(result.ridesPosted).toBe(0);
    });

    it('should cache results and reuse on second call', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          active_users: 100,
          active_users_delta: 5,
          new_users: 30,
          new_users_delta: 10,
          rides_posted: 150,
          rides_posted_delta: 8,
          bookings_created: 120,
          bookings_created_delta: 12,
          completion_rate: 80,
          completion_rate_delta: 2,
          cancellation_rate: 10,
          cancellation_rate_delta: 0,
          fill_rate: 65,
          fill_rate_delta: -1,
          messages_sent: 300,
          messages_sent_delta: 5,
        }],
        error: null,
      });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();

      // First call
      const result1 = await getKpiSummary(mockFilters);
      // Second call with same filters
      const result2 = await getKpiSummary(mockFilters);

      // RPC should only be called once due to caching
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(result1.activeUsers).toBe(result2.activeUsers);
    });
  });

  describe('getTimeSeries', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should use secure RPC for timeseries data', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-01-02', value: 15 },
          { date: '2024-01-03', value: 12 },
        ],
        error: null,
      });

      const { getTimeSeries, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getTimeSeries('rides', mockFilters);

      expect(mockRpc).toHaveBeenCalledWith('admin_timeseries', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
        p_metric: 'rides',
        p_community_id: null,
        p_ride_type: null,
      });

      expect(result.metric).toBe('rides');
      expect(result.data).toHaveLength(3);
      expect(result.data[0].value).toBe(10);
    });

    it('should return empty data array on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
            }),
          }),
        }),
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { getTimeSeries, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getTimeSeries('rides', mockFilters);

      expect(result.metric).toBe('rides');
      expect(result.data).toEqual([]);
    });
  });

  describe('getTopRoutes', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should use secure RPC for top routes', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { origin: 'Dallas', destination: 'Austin', ride_count: 50, booking_count: 45, avg_fill_rate: 90 },
          { origin: 'Houston', destination: 'San Antonio', ride_count: 35, booking_count: 30, avg_fill_rate: 85 },
        ],
        error: null,
      });

      const { getTopRoutes, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getTopRoutes(mockFilters, 10);

      expect(mockRpc).toHaveBeenCalledWith('admin_top_routes', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
        p_community_id: null,
        p_limit: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0].origin).toBe('Dallas');
      expect(result[0].rideCount).toBe(50);
      expect(result[0].avgFillRate).toBe(90);
    });
  });

  describe('getGeoDistribution', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should use secure RPC for geo distribution', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { area: 'Dallas Metro', rides: 200, bookings: 180, users: 150 },
          { area: 'Austin Area', rides: 150, bookings: 130, users: 100 },
        ],
        error: null,
      });

      const { getGeoDistribution, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getGeoDistribution(mockFilters);

      expect(mockRpc).toHaveBeenCalledWith('admin_geo_distribution', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
        p_community_id: null,
      });

      expect(result).toHaveLength(2);
      expect(result[0].area).toBe('Dallas Metro');
      expect(result[0].rides).toBe(200);
    });
  });

  describe('getOpsHealth', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should use secure RPC for ops health', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          job_failures: 2,
          notification_failures: 5,
          error_events: 10,
          avg_latency_ms: 150,
          system_status: 'healthy',
        }],
        error: null,
      });

      const { getOpsHealth, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getOpsHealth(mockFilters);

      expect(mockRpc).toHaveBeenCalledWith('admin_ops_health', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
      });

      expect(result.jobFailures).toBe(2);
      expect(result.errorEvents).toBe(10);
      expect(result.systemStatus).toBe('healthy');
    });

    it('should return healthy status on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ count: null, error: { message: 'table not found' } }),
          }),
        }),
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const { getOpsHealth, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getOpsHealth(mockFilters);

      expect(result.systemStatus).toBe('healthy');
      expect(result.errorEvents).toBe(0);
    });
  });

  describe('getUserSegments', () => {
    const mockFilters = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should use secure RPC for user segments', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { segment: 'driver', count: 100, percentage: 40 },
          { segment: 'passenger', count: 120, percentage: 48 },
          { segment: 'both', count: 30, percentage: 12 },
        ],
        error: null,
      });

      const { getUserSegments, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();
      const result = await getUserSegments(mockFilters);

      expect(mockRpc).toHaveBeenCalledWith('admin_user_segments', {
        start_ts: expect.any(String),
        end_ts: expect.any(String),
        p_community_id: null,
      });

      expect(result).toHaveLength(3);
      expect(result[0].segment).toBe('driver');
      expect(result[0].count).toBe(100);
    });
  });

  describe('filter serialization', () => {
    it('should correctly serialize date filters', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ active_users: 100 }],
        error: null,
      });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();

      await getKpiSummary({
        startDate: '2024-06-15',
        endDate: '2024-06-30',
        communityId: 'comm-123',
        segment: 'driver',
        rideType: 'commute',
      });

      expect(mockRpc).toHaveBeenCalledWith('admin_kpi_summary', {
        start_ts: expect.stringMatching(/^2024-06-15T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        end_ts: expect.stringMatching(/^2024-06-30T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        p_community_id: 'comm-123',
        p_segment: 'driver',
        p_ride_type: 'commute',
      });
    });

    it('should handle null/undefined community filter', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ active_users: 100 }],
        error: null,
      });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      clearAdminAnalyticsCache();

      await getKpiSummary({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        communityId: undefined,
      });

      expect(mockRpc).toHaveBeenCalledWith('admin_kpi_summary', expect.objectContaining({
        p_community_id: null,
      }));
    });
  });

  describe('cache management', () => {
    it('should clear cache when clearAdminAnalyticsCache is called', async () => {
      mockRpc.mockResolvedValue({
        data: [{ active_users: 100 }],
        error: null,
      });

      const { getKpiSummary, clearAdminAnalyticsCache } = await import('../src/services/adminAnalyticsService');
      
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // First call
      clearAdminAnalyticsCache();
      await getKpiSummary(filters);
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await getKpiSummary(filters);
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Clear cache
      clearAdminAnalyticsCache();

      // Third call - should make new request
      await getKpiSummary(filters);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });
  });
});
