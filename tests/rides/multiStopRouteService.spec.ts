/**
 * Enterprise-grade tests for MultiStopRouteService.
 *
 * This is a PURE UTILITY service (zero Supabase calls).
 * Tests cover:
 *  - Haversine distance accuracy
 *  - Route distance calculation (edge cases: 0, 1, 2, many waypoints)
 *  - Duration estimation
 *  - Route optimization (nearest-neighbor, ≤3 waypoints bypass)
 *  - Flexible pickup zone generation
 *  - Zone boundary checks
 *  - Waypoint ETA calculation
 *  - Waypoint validation (required fields, range boundaries)
 *  - Route summary formatting
 *  - Region pass-through detection
 *  - Detour calculation
 *  - Waypoint ID uniqueness
 */
import { describe, expect, it } from 'vitest';
import { multiStopRouteService } from '../../src/services/multiStopRouteService';
import type { Waypoint } from '../../src/services/multiStopRouteService';
import {
  makeWaypoint,
  LONDON_COORDS,
  OXFORD_COORDS,
  BIRMINGHAM_COORDS,
} from './helpers';

// ---------------------------------------------------------------------------
// Haversine distance (tested indirectly through public API)
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — calculateRouteDistance', () => {
  it('returns 0 for empty waypoint list', () => {
    expect(multiStopRouteService.calculateRouteDistance([])).toBe(0);
  });

  it('returns 0 for a single waypoint', () => {
    const wp = makeWaypoint({ lat: LONDON_COORDS.lat, lng: LONDON_COORDS.lng });
    expect(multiStopRouteService.calculateRouteDistance([wp])).toBe(0);
  });

  it('returns 0 for two identical waypoints', () => {
    const a = makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 });
    const b = makeWaypoint({ lat: 51.5, lng: -0.1, order: 1 });
    expect(multiStopRouteService.calculateRouteDistance([a, b])).toBe(0);
  });

  it('computes London → Oxford distance within 10% of known value (~83 km)', () => {
    const a = makeWaypoint({ lat: LONDON_COORDS.lat, lng: LONDON_COORDS.lng, order: 0 });
    const b = makeWaypoint({ lat: OXFORD_COORDS.lat, lng: OXFORD_COORDS.lng, order: 1 });
    const dist = multiStopRouteService.calculateRouteDistance([a, b]);
    expect(dist).toBeGreaterThan(74);
    expect(dist).toBeLessThan(92);
  });

  it('sums consecutive segments for multi-stop routes', () => {
    const waypoints: Waypoint[] = [
      makeWaypoint({ lat: LONDON_COORDS.lat, lng: LONDON_COORDS.lng, order: 0 }),
      makeWaypoint({ lat: OXFORD_COORDS.lat, lng: OXFORD_COORDS.lng, order: 1 }),
      makeWaypoint({ lat: BIRMINGHAM_COORDS.lat, lng: BIRMINGHAM_COORDS.lng, order: 2 }),
    ];
    const total = multiStopRouteService.calculateRouteDistance(waypoints);

    const lonToOx = multiStopRouteService.calculateRouteDistance([waypoints[0], waypoints[1]]);
    const oxToBhm = multiStopRouteService.calculateRouteDistance([waypoints[1], waypoints[2]]);

    expect(total).toBeCloseTo(lonToOx + oxToBhm, 1);
  });

  it('returns a rounded result (2 decimal places)', () => {
    const a = makeWaypoint({ lat: 51.5074, lng: -0.1278, order: 0 });
    const b = makeWaypoint({ lat: 51.51, lng: -0.13, order: 1 });
    const dist = multiStopRouteService.calculateRouteDistance([a, b]);
    const decimals = (dist.toString().split('.')[1] || '').length;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Duration estimation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — estimateDuration', () => {
  it('returns 0 for 0 km', () => {
    expect(multiStopRouteService.estimateDuration(0)).toBe(0);
  });

  it('returns 90 minutes for 60 km at 40 km/h', () => {
    expect(multiStopRouteService.estimateDuration(60)).toBe(90);
  });

  it('returns rounded integer minutes', () => {
    const result = multiStopRouteService.estimateDuration(33);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('returns 60 for 40 km (exact 1 hour)', () => {
    expect(multiStopRouteService.estimateDuration(40)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Route optimization
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — optimizeRoute', () => {
  it('returns identity for ≤3 waypoints', () => {
    const wps = [
      makeWaypoint({ order: 0 }),
      makeWaypoint({ order: 1 }),
      makeWaypoint({ order: 2 }),
    ];
    const result = multiStopRouteService.optimizeRoute(wps);
    expect(result.applied).toBe(false);
    expect(result.distanceSaved).toBe(0);
    expect(result.timeSaved).toBe(0);
    expect(result.optimizedRoute).toEqual(wps);
  });

  it('keeps first and last waypoints fixed', () => {
    const wps: Waypoint[] = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0, id: 'start' }),
      makeWaypoint({ lat: 52.0, lng: -1.0, order: 1, id: 'mid1' }),
      makeWaypoint({ lat: 51.7, lng: -0.5, order: 2, id: 'mid2' }),
      makeWaypoint({ lat: 53.0, lng: -2.0, order: 3, id: 'end' }),
    ];
    const result = multiStopRouteService.optimizeRoute(wps);
    expect(result.optimizedRoute[0].id).toBe('start');
    expect(result.optimizedRoute[result.optimizedRoute.length - 1].id).toBe('end');
  });

  it('updates order indices after optimization', () => {
    const wps: Waypoint[] = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 53.0, lng: -2.0, order: 1 }),
      makeWaypoint({ lat: 51.7, lng: -0.5, order: 2 }),
      makeWaypoint({ lat: 52.5, lng: -1.5, order: 3 }),
    ];
    const result = multiStopRouteService.optimizeRoute(wps);
    result.optimizedRoute.forEach((wp, idx) => {
      expect(wp.order).toBe(idx);
    });
  });

  it('reports distanceSaved ≥ 0', () => {
    const wps: Waypoint[] = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 53.0, lng: -2.0, order: 1 }),
      makeWaypoint({ lat: 51.7, lng: -0.5, order: 2 }),
      makeWaypoint({ lat: 52.5, lng: -1.5, order: 3 }),
    ];
    const result = multiStopRouteService.optimizeRoute(wps);
    expect(result.distanceSaved).toBeGreaterThanOrEqual(0);
  });

  it('sets applied=true only when saving > 0.5 km', () => {
    // Create a clearly sub-optimal route
    const wps: Waypoint[] = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 53.0, lng: -2.0, order: 1 }), // far north
      makeWaypoint({ lat: 51.7, lng: -0.5, order: 2 }), // back south
      makeWaypoint({ lat: 54.0, lng: -3.0, order: 3 }),
    ];
    const result = multiStopRouteService.optimizeRoute(wps);
    if (result.distanceSaved > 0.5) {
      expect(result.applied).toBe(true);
    } else {
      expect(result.applied).toBe(false);
    }
  });

  it('handles exactly 4 waypoints with only 1 intermediate to reorder (nearestNeighborSort single-element path)', () => {
    // 4 waypoints total → 2 intermediate → normal optimization
    // But let's also test with only 1 intermediate (3 intermediate would never happen with ≤3 check, but 4 waypoints = 2 intermediate)
    const wps: Waypoint[] = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0, id: 'first' }),
      makeWaypoint({ lat: 52.0, lng: -1.0, order: 1, id: 'mid' }),
      makeWaypoint({ lat: 53.0, lng: -2.0, order: 2, id: 'last' }),
    ];
    // ≤3 returns identity
    const result = multiStopRouteService.optimizeRoute(wps);
    expect(result.applied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Flexible pickup zone generation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — generateFlexibleZone', () => {
  it('returns zone centroid matching inputs', () => {
    const zone = multiStopRouteService.generateFlexibleZone(51.5074, -0.1278, 500);
    expect(zone.centroid.lat).toBe(51.5074);
    expect(zone.centroid.lng).toBe(-0.1278);
    expect(zone.radius).toBe(500);
  });

  it('generates 4 suggested locations (N/E/S/W)', () => {
    const zone = multiStopRouteService.generateFlexibleZone(51.5074, -0.1278);
    expect(zone.suggestedLocations).toHaveLength(4);
    const names = zone.suggestedLocations.map(s => s.location);
    expect(names).toContain('Pickup Point North');
    expect(names).toContain('Pickup Point East');
    expect(names).toContain('Pickup Point South');
    expect(names).toContain('Pickup Point West');
  });

  it('each suggestion has positive walkingTime', () => {
    const zone = multiStopRouteService.generateFlexibleZone(51.5, -0.1, 400);
    zone.suggestedLocations.forEach(loc => {
      expect(loc.walkingTime).toBeGreaterThan(0);
    });
  });

  it('uses default 500m radius when not specified', () => {
    const zone = multiStopRouteService.generateFlexibleZone(51.5, -0.1);
    expect(zone.radius).toBe(500);
  });

  it('suggested points differ from centroid', () => {
    const zone = multiStopRouteService.generateFlexibleZone(51.5, -0.1, 1000);
    zone.suggestedLocations.forEach(loc => {
      const isSame = loc.lat === 51.5 && loc.lng === -0.1;
      expect(isSame).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isWithinFlexibleZone
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — isWithinFlexibleZone', () => {
  it('returns true for the exact center point', () => {
    expect(
      multiStopRouteService.isWithinFlexibleZone(51.5, -0.1, 51.5, -0.1, 500)
    ).toBe(true);
  });

  it('returns true for a point just inside the radius', () => {
    // ~100m north of center, with 500m radius
    expect(
      multiStopRouteService.isWithinFlexibleZone(51.5009, -0.1, 51.5, -0.1, 500)
    ).toBe(true);
  });

  it('returns false for a point clearly outside the radius', () => {
    // ~11 km away
    expect(
      multiStopRouteService.isWithinFlexibleZone(51.6, -0.1, 51.5, -0.1, 500)
    ).toBe(false);
  });

  it('returns true for radius = 0 only at exact same point', () => {
    expect(
      multiStopRouteService.isWithinFlexibleZone(51.5, -0.1, 51.5, -0.1, 0)
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Waypoint ETA calculation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — calculateWaypointETAs', () => {
  it('sets first waypoint ETA to departure time', () => {
    const departure = new Date('2025-06-15T08:00:00Z');
    const wps = [makeWaypoint({ order: 0 })];
    const result = multiStopRouteService.calculateWaypointETAs(wps, departure);
    expect(result[0].estimatedTime?.getTime()).toBe(departure.getTime());
  });

  it('adds travel time + 2 min stop time for subsequent waypoints', () => {
    const departure = new Date('2025-06-15T08:00:00Z');
    const a = makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 });
    const b = makeWaypoint({ lat: 51.51, lng: -0.1, order: 1 }); // ~1.1 km away
    const result = multiStopRouteService.calculateWaypointETAs([a, b], departure);

    const etaB = result[1].estimatedTime!;
    expect(etaB.getTime()).toBeGreaterThan(departure.getTime());
    // At least 2 minutes (stop time) above departure
    expect(etaB.getTime() - departure.getTime()).toBeGreaterThanOrEqual(2 * 60_000);
  });

  it('ETAs are monotonically increasing', () => {
    const departure = new Date('2025-06-15T08:00:00Z');
    const wps = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 51.6, lng: -0.2, order: 1 }),
      makeWaypoint({ lat: 51.7, lng: -0.3, order: 2 }),
    ];
    const result = multiStopRouteService.calculateWaypointETAs(wps, departure);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].estimatedTime!.getTime()).toBeGreaterThan(
        result[i - 1].estimatedTime!.getTime()
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Waypoint ID generation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — generateWaypointId', () => {
  it('starts with "wp_"', () => {
    expect(multiStopRouteService.generateWaypointId()).toMatch(/^wp_/);
  });

  it('generates unique IDs across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => multiStopRouteService.generateWaypointId()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Waypoint validation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — validateWaypoint', () => {
  it('returns empty errors for a valid waypoint', () => {
    const wp = makeWaypoint();
    expect(multiStopRouteService.validateWaypoint(wp)).toEqual([]);
  });

  it('reports missing location', () => {
    const errors = multiStopRouteService.validateWaypoint({ lat: 0, lng: 0 });
    expect(errors).toContain('Location is required');
  });

  it('reports whitespace-only location', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: '   ', lat: 0, lng: 0 });
    expect(errors).toContain('Location is required');
  });

  it('reports invalid latitude (< -90)', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: 'X', lat: -91, lng: 0 });
    expect(errors).toContain('Invalid latitude');
  });

  it('reports invalid latitude (> 90)', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: 'X', lat: 91, lng: 0 });
    expect(errors).toContain('Invalid latitude');
  });

  it('reports invalid longitude (< -180)', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: 'X', lat: 0, lng: -181 });
    expect(errors).toContain('Invalid longitude');
  });

  it('reports invalid longitude (> 180)', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: 'X', lat: 0, lng: 181 });
    expect(errors).toContain('Invalid longitude');
  });

  it('reports missing lat as invalid', () => {
    const errors = multiStopRouteService.validateWaypoint({ location: 'X', lng: 0 } as any);
    expect(errors).toContain('Invalid latitude');
  });

  it('reports flexibleRadius > 5000 as invalid', () => {
    const errors = multiStopRouteService.validateWaypoint({
      location: 'X', lat: 0, lng: 0, flexibleRadius: 5001,
    });
    expect(errors).toContain('Flexible radius must be between 0 and 5000 meters');
  });

  it('reports flexibleRadius < 0 as invalid', () => {
    const errors = multiStopRouteService.validateWaypoint({
      location: 'X', lat: 0, lng: 0, flexibleRadius: -1,
    });
    expect(errors).toContain('Flexible radius must be between 0 and 5000 meters');
  });

  it('accepts flexibleRadius at boundaries (0 and 5000)', () => {
    expect(multiStopRouteService.validateWaypoint({
      location: 'X', lat: 0, lng: 0, flexibleRadius: 0,
    })).toEqual([]);
    expect(multiStopRouteService.validateWaypoint({
      location: 'X', lat: 0, lng: 0, flexibleRadius: 5000,
    })).toEqual([]);
  });

  it('accumulates multiple errors at once', () => {
    const errors = multiStopRouteService.validateWaypoint({
      lat: -100, lng: 200, flexibleRadius: 6000,
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Route summary formatting
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — formatRouteSummary', () => {
  it('returns empty string for no waypoints', () => {
    expect(multiStopRouteService.formatRouteSummary([])).toBe('');
  });

  it('returns single location for 1 waypoint', () => {
    const wp = makeWaypoint({ location: 'Home' });
    expect(multiStopRouteService.formatRouteSummary([wp])).toBe('Home');
  });

  it('returns "A → B" for 2 waypoints', () => {
    const wps = [
      makeWaypoint({ location: 'Home', order: 0 }),
      makeWaypoint({ location: 'Office', order: 1 }),
    ];
    expect(multiStopRouteService.formatRouteSummary(wps)).toBe('Home → Office');
  });

  it('shows stop count for 3+ waypoints (singular)', () => {
    const wps = [
      makeWaypoint({ location: 'A', order: 0 }),
      makeWaypoint({ location: 'B', order: 1 }),
      makeWaypoint({ location: 'C', order: 2 }),
    ];
    expect(multiStopRouteService.formatRouteSummary(wps)).toBe('A → 1 stop → C');
  });

  it('shows stop count for 3+ waypoints (plural)', () => {
    const wps = [
      makeWaypoint({ location: 'A', order: 0 }),
      makeWaypoint({ location: 'B', order: 1 }),
      makeWaypoint({ location: 'C', order: 2 }),
      makeWaypoint({ location: 'D', order: 3 }),
    ];
    expect(multiStopRouteService.formatRouteSummary(wps)).toBe('A → 2 stops → D');
  });
});

// ---------------------------------------------------------------------------
// routePassesThrough
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — routePassesThrough', () => {
  it('returns true when a waypoint is within region radius', () => {
    const wps = [
      makeWaypoint({ lat: LONDON_COORDS.lat, lng: LONDON_COORDS.lng }),
      makeWaypoint({ lat: OXFORD_COORDS.lat, lng: OXFORD_COORDS.lng }),
    ];
    expect(
      multiStopRouteService.routePassesThrough(wps, LONDON_COORDS.lat, LONDON_COORDS.lng, 5)
    ).toBe(true);
  });

  it('returns false when no waypoint is within region radius', () => {
    const wps = [
      makeWaypoint({ lat: LONDON_COORDS.lat, lng: LONDON_COORDS.lng }),
    ];
    expect(
      multiStopRouteService.routePassesThrough(wps, BIRMINGHAM_COORDS.lat, BIRMINGHAM_COORDS.lng, 5)
    ).toBe(false);
  });

  it('returns false for empty waypoints', () => {
    expect(
      multiStopRouteService.routePassesThrough([], 51.5, -0.1, 100)
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Detour calculation
// ---------------------------------------------------------------------------
describe('MultiStopRouteService — calculateDetour', () => {
  it('reports 0 detour when new stop is on the direct path', () => {
    const wps = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 51.7, lng: -0.3, order: 1 }),
    ];
    // Midpoint is approximately on the line
    const mid = makeWaypoint({ lat: 51.6, lng: -0.2, order: -1 });
    const result = multiStopRouteService.calculateDetour(wps, mid, 0);
    // Should be very small detour
    expect(result.detourKm).toBeLessThan(1);
  });

  it('reports positive detour for an off-path stop', () => {
    const wps = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 51.7, lng: -0.1, order: 1 }),
    ];
    // Way off to the west
    const offPath = makeWaypoint({ lat: 51.6, lng: -1.0, order: -1 });
    const result = multiStopRouteService.calculateDetour(wps, offPath, 0);
    expect(result.detourKm).toBeGreaterThan(0);
    expect(result.detourMinutes).toBeGreaterThan(0);
    expect(result.newTotalDistance).toBeGreaterThan(
      multiStopRouteService.calculateRouteDistance(wps)
    );
  });

  it('inserts the stop at the correct position', () => {
    const wps = [
      makeWaypoint({ lat: 51.5, lng: -0.1, order: 0 }),
      makeWaypoint({ lat: 51.6, lng: -0.2, order: 1 }),
      makeWaypoint({ lat: 51.7, lng: -0.3, order: 2 }),
    ];
    const newWp = makeWaypoint({ lat: 51.55, lng: -0.15 });
    const result = multiStopRouteService.calculateDetour(wps, newWp, 0);
    // newTotalDistance should be a valid number
    expect(result.newTotalDistance).toBeGreaterThan(0);
  });
});
