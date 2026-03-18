/**
 * Enterprise-grade tests for src/types/rideTypes.ts
 *
 * Tests cover:
 *  - RIDE_TYPES record completeness and shape
 *  - getRideTypeInfo with valid and unknown types
 *  - RIDE_TYPE_LIST derivation
 *  - COMMON_SCHEDULES shape and invariants
 *  - RADIUS_OPTIONS shape and ordering
 */
import { describe, expect, it } from 'vitest';
import {
  RIDE_TYPES,
  RIDE_TYPE_LIST,
  getRideTypeInfo,
  COMMON_SCHEDULES,
  RADIUS_OPTIONS,
} from '../../src/types/rideTypes';
import type { RideType, RideTypeInfo } from '../../src/types/rideTypes';

// ---------------------------------------------------------------------------
// RIDE_TYPES record
// ---------------------------------------------------------------------------
describe('rideTypes — RIDE_TYPES', () => {
  const EXPECTED_TYPES: RideType[] = [
    'daily_commute', 'one_time', 'airport_transfer',
    'moving_help', 'long_distance', 'flexible',
  ];

  it('contains all expected ride types', () => {
    EXPECTED_TYPES.forEach(type => {
      expect(RIDE_TYPES).toHaveProperty(type);
    });
  });

  it('has no extra keys beyond the expected types', () => {
    expect(Object.keys(RIDE_TYPES).sort()).toEqual(EXPECTED_TYPES.sort());
  });

  it.each(EXPECTED_TYPES)('RIDE_TYPES["%s"] has correct shape', (type) => {
    const info: RideTypeInfo = RIDE_TYPES[type];
    expect(info.value).toBe(type);
    expect(typeof info.label).toBe('string');
    expect(info.label.length).toBeGreaterThan(0);
    expect(typeof info.description).toBe('string');
    expect(typeof info.icon).toBe('string');
    expect(typeof info.supportsRecurring).toBe('boolean');
    expect(typeof info.defaultRecurring).toBe('boolean');
    expect(info.color).toMatch(/^bg-/);
    expect(info.textColor).toMatch(/^text-/);
  });

  it('daily_commute supports recurring and defaults to recurring', () => {
    expect(RIDE_TYPES.daily_commute.supportsRecurring).toBe(true);
    expect(RIDE_TYPES.daily_commute.defaultRecurring).toBe(true);
  });

  it('one_time does NOT support recurring', () => {
    expect(RIDE_TYPES.one_time.supportsRecurring).toBe(false);
    expect(RIDE_TYPES.one_time.defaultRecurring).toBe(false);
  });

  it('flexible supports recurring', () => {
    expect(RIDE_TYPES.flexible.supportsRecurring).toBe(true);
    expect(RIDE_TYPES.flexible.defaultRecurring).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RIDE_TYPE_LIST
// ---------------------------------------------------------------------------
describe('rideTypes — RIDE_TYPE_LIST', () => {
  it('is an array derived from RIDE_TYPES values', () => {
    expect(Array.isArray(RIDE_TYPE_LIST)).toBe(true);
    expect(RIDE_TYPE_LIST.length).toBe(Object.keys(RIDE_TYPES).length);
  });

  it('each element is the same reference as the RIDE_TYPES value', () => {
    RIDE_TYPE_LIST.forEach(info => {
      expect(RIDE_TYPES[info.value]).toBe(info);
    });
  });
});

// ---------------------------------------------------------------------------
// getRideTypeInfo
// ---------------------------------------------------------------------------
describe('rideTypes — getRideTypeInfo', () => {
  it('returns correct info for known type', () => {
    const info = getRideTypeInfo('airport_transfer');
    expect(info.value).toBe('airport_transfer');
    expect(info.label).toBe('Airport Transfer');
  });

  it('falls back to one_time for unknown type', () => {
    const info = getRideTypeInfo('nonexistent' as RideType);
    expect(info.value).toBe('one_time');
  });

  it('falls back to one_time for empty string', () => {
    const info = getRideTypeInfo('' as RideType);
    expect(info.value).toBe('one_time');
  });
});

// ---------------------------------------------------------------------------
// COMMON_SCHEDULES
// ---------------------------------------------------------------------------
describe('rideTypes — COMMON_SCHEDULES', () => {
  it('has 4 preset schedules', () => {
    expect(COMMON_SCHEDULES).toHaveLength(4);
  });

  it('each schedule has id, label, description, daysOfWeek, timeSlot', () => {
    COMMON_SCHEDULES.forEach(s => {
      expect(typeof s.id).toBe('string');
      expect(typeof s.label).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(Array.isArray(s.daysOfWeek)).toBe(true);
      expect(typeof s.timeSlot).toBe('string');
    });
  });

  it('weekdays_morning covers Mon-Fri', () => {
    const wm = COMMON_SCHEDULES.find(s => s.id === 'weekdays_morning')!;
    expect(wm.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(wm.timeSlot).toBe('morning');
  });

  it('weekend_only covers Sat and Sun', () => {
    const we = COMMON_SCHEDULES.find(s => s.id === 'weekend_only')!;
    expect(we.daysOfWeek).toEqual([0, 6]);
  });

  it('full_week covers all 7 days', () => {
    const fw = COMMON_SCHEDULES.find(s => s.id === 'full_week')!;
    expect(fw.daysOfWeek).toHaveLength(7);
  });

  it('all daysOfWeek values are in 0-6 range', () => {
    COMMON_SCHEDULES.forEach(s => {
      s.daysOfWeek.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(6);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// RADIUS_OPTIONS
// ---------------------------------------------------------------------------
describe('rideTypes — RADIUS_OPTIONS', () => {
  it('has 5 options', () => {
    expect(RADIUS_OPTIONS).toHaveLength(5);
  });

  it('values are in ascending order', () => {
    for (let i = 1; i < RADIUS_OPTIONS.length; i++) {
      expect(RADIUS_OPTIONS[i].value).toBeGreaterThan(RADIUS_OPTIONS[i - 1].value);
    }
  });

  it('each option has value, label, and description', () => {
    RADIUS_OPTIONS.forEach(opt => {
      expect(typeof opt.value).toBe('number');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.description).toBe('string');
    });
  });
});
