/**
 * Enterprise-grade tests for safetyAnalyticsService
 * Covers: incident recording, resolution, local storage fallback,
 * alert triggering, safety metrics, empty metrics, risk assessment,
 * safety trends, area safety scores, real-time subscriptions, export
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockChannel = vi.hoisted(() => {
  const ch: Record<string, any> = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return ch;
});

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
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    makeFreshChain,
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'uuid-mock-001'),
  getRandomValues: vi.fn(),
});

// Mock localStorage
const storageMap = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => storageMap.set(key, val)),
  removeItem: vi.fn((key: string) => storageMap.delete(key)),
  clear: vi.fn(() => storageMap.clear()),
});

import { safetyAnalyticsService } from '../../src/services/safetyAnalyticsService';
import { FAKE_USER_ID, FAKE_RIDE_ID, FAKE_INCIDENT_ID } from './helpers';

// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  storageMap.clear();
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: null, error: null })
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// INCIDENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — Incident Recording', () => {
  const baseIncident = {
    type: 'sos_alert' as const,
    severity: 'high' as const,
    userId: FAKE_USER_ID,
    rideId: FAKE_RIDE_ID,
    description: 'Test incident',
    metadata: { test: true },
  };

  it('should record incident and persist to database', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    const result = await safetyAnalyticsService.recordIncident(baseIncident);
    expect(result.id).toBe('uuid-mock-001');
    expect(result.type).toBe('sos_alert');
    expect(result.severity).toBe('high');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(mockSupabase.from).toHaveBeenCalledWith('safety_incidents');
  });

  it('should store locally when database insert fails', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: { message: 'DB down' } })
    );

    const result = await safetyAnalyticsService.recordIncident(baseIncident);
    expect(result).toBeDefined();
    // localStorage.setItem should have been called
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'safety_incidents',
      expect.any(String)
    );
  });

  it('should store locally when database throws exception', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Connection refused');
    });

    const result = await safetyAnalyticsService.recordIncident(baseIncident);
    expect(result).toBeDefined();
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should trigger alerts for high severity incidents', async () => {
    // The triggerAlerts method inserts into notifications
    let insertTable = '';
    mockSupabase.from.mockImplementation((table: string) => {
      insertTable = table;
      return mockSupabase.makeFreshChain({ data: [{ id: 'admin-1' }], error: null });
    });

    await safetyAnalyticsService.recordIncident({
      ...baseIncident,
      severity: 'high',
    });

    // triggerAlerts should have been called — notifications insert
    const notifCalls = mockSupabase.from.mock.calls.filter(
      (c: any) => c[0] === 'notifications'
    );
    expect(notifCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should trigger alerts for critical severity incidents', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: [{ id: 'admin-1' }], error: null })
    );

    await safetyAnalyticsService.recordIncident({
      ...baseIncident,
      severity: 'critical',
    });

    const notifCalls = mockSupabase.from.mock.calls.filter(
      (c: any) => c[0] === 'notifications'
    );
    expect(notifCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should NOT trigger alerts for low severity incidents', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    await safetyAnalyticsService.recordIncident({
      ...baseIncident,
      severity: 'low',
    });

    // Only safety_incidents insert, no notifications
    const notifCalls = mockSupabase.from.mock.calls.filter(
      (c: any) => c[0] === 'notifications'
    );
    expect(notifCalls).toHaveLength(0);
  });

  it('should NOT trigger alerts for medium severity', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    await safetyAnalyticsService.recordIncident({
      ...baseIncident,
      severity: 'medium',
    });

    const notifCalls = mockSupabase.from.mock.calls.filter(
      (c: any) => c[0] === 'notifications'
    );
    expect(notifCalls).toHaveLength(0);
  });
});

describe('safetyAnalyticsService — resolveIncident', () => {
  it('should update resolved_at in database', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: null })
    );

    await safetyAnalyticsService.resolveIncident(FAKE_INCIDENT_ID);
    expect(mockSupabase.from).toHaveBeenCalledWith('safety_incidents');
  });

  it('should not throw when database fails (logs error)', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('DB error');
    });

    // Should not throw — catches internally
    await expect(safetyAnalyticsService.resolveIncident('bad-id')).resolves.toBeUndefined();
  });
});

describe('safetyAnalyticsService — storeIncidentLocally', () => {
  it('should store incident in localStorage', () => {
    const incident = {
      id: 'local-1',
      type: 'sos_alert' as const,
      severity: 'low' as const,
      description: 'Test',
      metadata: {},
      createdAt: new Date(),
    };

    safetyAnalyticsService.storeIncidentLocally(incident);
    expect(localStorage.setItem).toHaveBeenCalledWith('safety_incidents', expect.any(String));

    const stored = JSON.parse(storageMap.get('safety_incidents') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('local-1');
  });

  it('should cap stored incidents at 1000', () => {
    // Pre-fill with 1000 entries
    const existing = Array.from({ length: 1000 }, (_, i) => ({ id: `old-${i}` }));
    storageMap.set('safety_incidents', JSON.stringify(existing));

    safetyAnalyticsService.storeIncidentLocally({
      id: 'new-one',
      type: 'ban' as const,
      severity: 'low' as const,
      description: '',
      metadata: {},
      createdAt: new Date(),
    });

    const stored = JSON.parse(storageMap.get('safety_incidents') || '[]');
    expect(stored.length).toBeLessThanOrEqual(1000);
    // The new one should be at the end
    expect(stored[stored.length - 1].id).toBe('new-one');
  });
});

describe('safetyAnalyticsService — triggerAlerts', () => {
  it('should create user notification for incident with userId', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    await safetyAnalyticsService.triggerAlerts({
      id: 'incident-1',
      type: 'sos_alert',
      severity: 'critical',
      userId: FAKE_USER_ID,
      description: 'Dangerous situation',
      metadata: {},
      createdAt: new Date(),
    });

    const notifCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'notifications');
    expect(notifCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should notify admins for critical/high severity', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return mockSupabase.makeFreshChain({
          data: [{ id: 'admin-1' }, { id: 'admin-2' }],
          error: null,
        });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    await safetyAnalyticsService.triggerAlerts({
      id: 'incident-2',
      type: 'safety_report',
      severity: 'critical',
      userId: FAKE_USER_ID,
      description: 'Critical issue',
      metadata: {},
      createdAt: new Date(),
    });

    const profileCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'profiles');
    expect(profileCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should skip user notification when no userId', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    await safetyAnalyticsService.triggerAlerts({
      id: 'incident-3',
      type: 'dispute',
      severity: 'high',
      description: 'Anonymous',
      metadata: {},
      createdAt: new Date(),
    });

    // Should still call profiles for admin notifications
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// METRICS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — getSafetyMetrics', () => {
  it('should return metrics for default 7d range', async () => {
    const now = new Date();
    const incidents = [
      {
        id: 'i1', type: 'sos_alert', severity: 'high',
        created_at: now.toISOString(), resolved_at: null,
      },
      {
        id: 'i2', type: 'safety_report', severity: 'medium',
        created_at: now.toISOString(),
        resolved_at: new Date(now.getTime() + 3600000).toISOString(), // 1 hour later
      },
    ];

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // current period
        return mockSupabase.makeFreshChain({ data: incidents, error: null });
      }
      // previous period
      return mockSupabase.makeFreshChain({ data: [{ id: 'p1' }], error: null });
    });

    const metrics = await safetyAnalyticsService.getSafetyMetrics();
    expect(metrics.totalIncidents).toBe(2);
    expect(metrics.incidentsByType).toEqual({ sos_alert: 1, safety_report: 1 });
    expect(metrics.incidentsBySeverity).toEqual({ high: 1, medium: 1 });
    expect(metrics.activeAlerts).toBe(1);
    expect(metrics.resolvedThisWeek).toBe(1);
    expect(metrics.averageResolutionTime).toBe(1); // 1 hour
    expect(metrics.trendsComparison.current).toBe(2);
    expect(metrics.trendsComparison.previous).toBe(1);
    expect(metrics.trendsComparison.percentChange).toBe(100); // (2-1)/1 * 100
  });

  it('should accept custom time range (24h)', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const metrics = await safetyAnalyticsService.getSafetyMetrics('24h');
    expect(metrics.totalIncidents).toBe(0);
  });

  it('should handle 100% increase when previous had 0 incidents', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return mockSupabase.makeFreshChain({
          data: [{ id: 'i1', type: 'sos_alert', severity: 'low', created_at: new Date().toISOString(), resolved_at: null }],
          error: null,
        });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null }); // 0 previous
    });

    const metrics = await safetyAnalyticsService.getSafetyMetrics('30d');
    expect(metrics.trendsComparison.percentChange).toBe(100);
  });

  it('should handle 0% change when both periods have 0', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const metrics = await safetyAnalyticsService.getSafetyMetrics('90d');
    expect(metrics.trendsComparison.percentChange).toBe(0);
  });

  it('should throw with message on error', async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return mockSupabase.makeFreshChain({ data: null, error: { message: 'Query failed' } });
      }
      return mockSupabase.makeFreshChain({ data: null, error: null });
    });

    await expect(safetyAnalyticsService.getSafetyMetrics())
      .rejects.toThrow('Failed to load safety metrics');
  });
});

describe('safetyAnalyticsService — getEmptyMetrics', () => {
  it('should return zeroed-out metrics', () => {
    const empty = safetyAnalyticsService.getEmptyMetrics();
    expect(empty.totalIncidents).toBe(0);
    expect(empty.incidentsByType).toEqual({});
    expect(empty.incidentsBySeverity).toEqual({});
    expect(empty.averageResolutionTime).toBe(0);
    expect(empty.activeAlerts).toBe(0);
    expect(empty.resolvedThisWeek).toBe(0);
    expect(empty.trendsComparison).toEqual({
      current: 0, previous: 0, percentChange: 0,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — assessUserRisk', () => {
  it('should return low risk for clean user', async () => {
    // All queries return empty
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const assessment = await safetyAnalyticsService.assessUserRisk(FAKE_USER_ID);
    expect(assessment.riskLevel).toBe('low');
    expect(assessment.riskScore).toBe(0);
    expect(assessment.factors).toHaveLength(4);
    expect(assessment.recommendations).toContain('No immediate concerns - continue standard monitoring');
  });

  it('should return critical risk for user with many incidents', async () => {
    const now = new Date();
    const recentIncidents = Array.from({ length: 10 }, (_, i) => ({
      id: `i-${i}`,
      created_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));
    const reports = Array.from({ length: 8 }, (_, i) => ({ id: `r-${i}` }));
    const disputes = Array.from({ length: 5 }, (_, i) => ({ id: `d-${i}` }));
    const warnings = Array.from({ length: 4 }, (_, i) => ({ id: `w-${i}` }));

    // Promise.all with 4 parallel queries
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      if (callIdx === 1) {
        // safety_incidents
        const p = Promise.resolve({ data: recentIncidents, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 2) {
        // user_reports
        const p = Promise.resolve({ data: reports, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 3) {
        // disputes
        const p = Promise.resolve({ data: disputes, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 4) {
        // user_warnings
        const p = Promise.resolve({ data: warnings, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      }
      return chain;
    });

    const assessment = await safetyAnalyticsService.assessUserRisk(FAKE_USER_ID);
    expect(assessment.riskLevel).toBe('critical');
    expect(assessment.riskScore).toBeGreaterThanOrEqual(75);
    expect(assessment.recommendations).toContain('Immediate review required by safety team');
  });

  it('should return medium risk for moderate infractions', async () => {
    const now = new Date();
    // 3 incidents → score 45, 3 reports → score 30, 2 disputes → score 16, 2 warnings → score 40
    // riskScore = round(45*0.3 + 30*0.25 + 16*0.2 + 40*0.25) = 34 → medium
    const recentIncidents = Array.from({ length: 3 }, (_, i) => ({
      id: `i-${i}`,
      created_at: new Date(now.getTime() - i * 10 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      if (callIdx === 1) {
        const p = Promise.resolve({ data: recentIncidents, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 2) {
        const p = Promise.resolve({ data: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 3) {
        const p = Promise.resolve({ data: [{ id: 'd1' }, { id: 'd2' }], error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 4) {
        const p = Promise.resolve({ data: [{ id: 'w1' }, { id: 'w2' }], error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      }
      return chain;
    });

    const assessment = await safetyAnalyticsService.assessUserRisk(FAKE_USER_ID);
    expect(['medium', 'high']).toContain(assessment.riskLevel);
    expect(assessment.riskScore).toBeGreaterThanOrEqual(25);
  });

  it('should return unknown on error', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const assessment = await safetyAnalyticsService.assessUserRisk(FAKE_USER_ID);
    expect(assessment.riskLevel).toBe('unknown');
    expect(assessment.riskScore).toBe(0);
    expect(assessment.recommendations).toContain('Unable to assess - check system status');
  });

  it('should generate recommendations based on scores', async () => {
    const now = new Date();
    // 3 recent incidents → incidentScore = 45 > 30 → "Review recent safety incidents"
    const incidents = Array.from({ length: 3 }, (_, i) => ({
      id: `i-${i}`,
      created_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    }));
    // 3 reports → reportScore = 30 > 20 → "Consider temporary monitoring period"
    const reports = Array.from({ length: 3 }, (_, i) => ({ id: `r-${i}` }));
    // 3 warnings → warningScore = 60 > 40 → "Evaluate for potential account restrictions"
    const warnings = Array.from({ length: 3 }, (_, i) => ({ id: `w-${i}` }));

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      const chain = mockSupabase.makeFreshChain({ data: null, error: null });
      if (callIdx === 1) {
        const p = Promise.resolve({ data: incidents, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 2) {
        const p = Promise.resolve({ data: reports, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 3) {
        const p = Promise.resolve({ data: [], error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      } else if (callIdx === 4) {
        const p = Promise.resolve({ data: warnings, error: null });
        Object.defineProperty(chain, 'then', { value: p.then.bind(p), writable: true, configurable: true, enumerable: false });
      }
      return chain;
    });

    const assessment = await safetyAnalyticsService.assessUserRisk(FAKE_USER_ID);
    expect(assessment.recommendations).toContain('Review recent safety incidents');
    expect(assessment.recommendations).toContain('Consider temporary monitoring period');
    expect(assessment.recommendations).toContain('Evaluate for potential account restrictions');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY TRENDS
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — getSafetyTrends', () => {
  it('should return trends for default 30 days', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const trends = await safetyAnalyticsService.getSafetyTrends();
    expect(trends).toHaveLength(30);
    expect(trends[0]).toHaveProperty('date');
    expect(trends[0]).toHaveProperty('incidents');
    expect(trends[0]).toHaveProperty('resolved');
    expect(trends[0]).toHaveProperty('sosAlerts');
    expect(trends[0]).toHaveProperty('reports');
  });

  it('should group incidents by date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const incidents = [
      { id: 'i1', type: 'sos_alert', created_at: `${today}T10:00:00Z`, resolved_at: `${today}T11:00:00Z` },
      { id: 'i2', type: 'safety_report', created_at: `${today}T12:00:00Z`, resolved_at: null },
    ];

    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: incidents, error: null })
    );

    const trends = await safetyAnalyticsService.getSafetyTrends(7);
    expect(trends).toHaveLength(7);

    const todayTrend = trends.find(t => t.date === today);
    expect(todayTrend?.incidents).toBe(2);
    expect(todayTrend?.resolved).toBe(1);
    expect(todayTrend?.sosAlerts).toBe(1);
    expect(todayTrend?.reports).toBe(1);
  });

  it('should return empty array on error', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('DB error');
    });

    const trends = await safetyAnalyticsService.getSafetyTrends();
    expect(trends).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AREA SAFETY SCORES
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — getAreaSafetyScores', () => {
  it('should aggregate by region', async () => {
    const data = [
      { location_region: 'Downtown' },
      { location_region: 'Downtown' },
      { location_region: 'Suburbs' },
    ];
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data, error: null })
    );

    const scores = await safetyAnalyticsService.getAreaSafetyScores();
    expect(scores).toHaveLength(2);

    const downtown = scores.find(s => s.region === 'Downtown');
    expect(downtown?.incidentCount).toBe(2);
    expect(downtown?.score).toBe(96); // 100 - 2*2
  });

  it('should return empty array when no data', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    const scores = await safetyAnalyticsService.getAreaSafetyScores();
    expect(scores).toEqual([]);
  });

  it('should return empty on error', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: { message: 'err' } })
    );

    const scores = await safetyAnalyticsService.getAreaSafetyScores();
    expect(scores).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — subscribeToIncidents', () => {
  it('should subscribe to safety-incidents channel', () => {
    const callback = vi.fn();
    const unsub = safetyAnalyticsService.subscribeToIncidents(callback);

    expect(mockSupabase.channel).toHaveBeenCalledWith('safety-incidents');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'safety_incidents' },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(typeof unsub).toBe('function');
  });

  it('should call callback when new incident arrives', () => {
    const callback = vi.fn();
    safetyAnalyticsService.subscribeToIncidents(callback);

    // Simulate postgres_changes event
    const onCall = mockChannel.on.mock.calls[0];
    const handler = onCall[2]; // third arg is the callback
    handler({
      new: {
        id: 'new-incident',
        type: 'sos_alert',
        severity: 'critical',
        user_id: FAKE_USER_ID,
        ride_id: FAKE_RIDE_ID,
        description: 'Live incident',
        metadata: {},
        created_at: '2026-01-15T10:00:00Z',
      },
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-incident',
        type: 'sos_alert',
        severity: 'critical',
      })
    );
  });

  it('should remove channel on unsubscribe', () => {
    const unsub = safetyAnalyticsService.subscribeToIncidents(vi.fn());
    unsub();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
describe('safetyAnalyticsService — exportSafetyReport', () => {
  it('should return report with metrics, incidents, and trends', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const incidentRows = [
      {
        id: 'i1', type: 'sos_alert', severity: 'high',
        user_id: FAKE_USER_ID, ride_id: FAKE_RIDE_ID,
        description: 'Test', metadata: {},
        resolved_at: null, created_at: now.toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: incidentRows, error: null })
    );

    const report = await safetyAnalyticsService.exportSafetyReport(startDate, now);
    expect(report).toHaveProperty('metrics');
    expect(report).toHaveProperty('incidents');
    expect(report).toHaveProperty('trends');
    expect(report).toHaveProperty('generatedAt');
    expect(report.generatedAt).toBeInstanceOf(Date);
  });

  it('should throw on database error', async () => {
    mockSupabase.from.mockReturnValue(
      mockSupabase.makeFreshChain({ data: null, error: { message: 'Export failed' } })
    );

    const now = new Date();
    await expect(
      safetyAnalyticsService.exportSafetyReport(new Date(now.getTime() - 86400000), now)
    ).rejects.toThrow();
  });
});
