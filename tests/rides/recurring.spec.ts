/**
 * Enterprise-grade tests for src/types/recurring.ts
 *
 * Tests cover:
 *  - DAYS_OF_WEEK constant shape
 *  - PATTERN_TYPE_LABELS / DESCRIPTIONS completeness
 *  - getOrdinalSuffix (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 23rd)
 *  - formatPatternDescription for daily / weekly / monthly patterns
 *  - formatPatternDescription with end-type variants (never, date, occurrences)
 *  - getNextOccurrence — daily returns today
 *  - getNextOccurrence — weekly (same day, future day, wrap-around)
 *  - getNextOccurrence — monthly (same month, next month, day overflow)
 *  - DEFAULT_PATTERN_CONFIG invariants
 */
import { describe, expect, it } from 'vitest';
import {
  DAYS_OF_WEEK,
  PATTERN_TYPE_LABELS,
  PATTERN_TYPE_DESCRIPTIONS,
  getOrdinalSuffix,
  formatPatternDescription,
  getNextOccurrence,
  DEFAULT_PATTERN_CONFIG,
} from '../../src/types/recurring';
import type { RecurringPatternConfig } from '../../src/types/recurring';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('recurring — DAYS_OF_WEEK', () => {
  it('has 7 entries', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it('starts with Sunday (0) and ends with Saturday (6)', () => {
    expect(DAYS_OF_WEEK[0].value).toBe(0);
    expect(DAYS_OF_WEEK[0].fullLabel).toBe('Sunday');
    expect(DAYS_OF_WEEK[6].value).toBe(6);
    expect(DAYS_OF_WEEK[6].fullLabel).toBe('Saturday');
  });

  it('each entry has value, label, and fullLabel', () => {
    DAYS_OF_WEEK.forEach(d => {
      expect(typeof d.value).toBe('number');
      expect(typeof d.label).toBe('string');
      expect(typeof d.fullLabel).toBe('string');
    });
  });
});

describe('recurring — PATTERN_TYPE_LABELS / DESCRIPTIONS', () => {
  it('covers daily, weekly, monthly', () => {
    expect(PATTERN_TYPE_LABELS.daily).toBeDefined();
    expect(PATTERN_TYPE_LABELS.weekly).toBeDefined();
    expect(PATTERN_TYPE_LABELS.monthly).toBeDefined();
    expect(PATTERN_TYPE_DESCRIPTIONS.daily).toBeDefined();
    expect(PATTERN_TYPE_DESCRIPTIONS.weekly).toBeDefined();
    expect(PATTERN_TYPE_DESCRIPTIONS.monthly).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getOrdinalSuffix
// ---------------------------------------------------------------------------
describe('recurring — getOrdinalSuffix', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [10, '10th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [31, '31st'],
    [100, '100th'],
    [101, '101st'],
    [111, '111th'],
    [112, '112th'],
    [113, '113th'],
  ])('getOrdinalSuffix(%d) === "%s"', (input, expected) => {
    expect(getOrdinalSuffix(input)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// formatPatternDescription
// ---------------------------------------------------------------------------
describe('recurring — formatPatternDescription', () => {
  const base: RecurringPatternConfig = {
    patternType: 'daily',
    daysOfWeek: [],
    dayOfMonth: 1,
    startDate: '2025-01-01',
    endType: 'never',
    endDate: '',
    maxOccurrences: 10,
  };

  it('formats daily pattern', () => {
    expect(formatPatternDescription(base)).toBe('Repeats every day');
  });

  it('formats weekly pattern with sorted day labels', () => {
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'weekly',
      daysOfWeek: [5, 1, 3], // Fri, Mon, Wed → should sort to Mon, Wed, Fri
    };
    const desc = formatPatternDescription(pattern);
    expect(desc).toBe('Repeats on Mon, Wed, Fri');
  });

  it('formats monthly pattern with ordinal', () => {
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'monthly',
      dayOfMonth: 15,
    };
    expect(formatPatternDescription(pattern)).toBe('Repeats on the 15th of each month');
  });

  it('appends "until <date>" for endType=date', () => {
    const pattern: RecurringPatternConfig = {
      ...base,
      endType: 'date',
      endDate: '2025-12-31',
    };
    const desc = formatPatternDescription(pattern);
    expect(desc).toContain('until');
    // The exact date format depends on locale but should include the year
    expect(desc).toMatch(/2025|12\/31/);
  });

  it('appends "for N rides" for endType=occurrences', () => {
    const pattern: RecurringPatternConfig = {
      ...base,
      endType: 'occurrences',
      maxOccurrences: 20,
    };
    expect(formatPatternDescription(pattern)).toContain('for 20 rides');
  });

  it('no suffix for endType=never', () => {
    const desc = formatPatternDescription(base);
    expect(desc).not.toContain('until');
    expect(desc).not.toContain('rides');
  });
});

// ---------------------------------------------------------------------------
// getNextOccurrence
// ---------------------------------------------------------------------------
describe('recurring — getNextOccurrence', () => {
  const base: RecurringPatternConfig = {
    patternType: 'daily',
    daysOfWeek: [],
    dayOfMonth: 1,
    startDate: '2025-01-01',
    endType: 'never',
    endDate: '',
    maxOccurrences: 10,
  };

  it('daily pattern returns today', () => {
    const ref = new Date('2025-06-15T10:00:00Z');
    const next = getNextOccurrence(base, ref)!;
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(5); // June = 5
    expect(next.getDate()).toBe(15);
  });

  it('weekly pattern — same day in week', () => {
    const sunday = new Date('2025-06-15T10:00:00Z'); // Sunday
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'weekly',
      daysOfWeek: [0], // Sunday
    };
    const next = getNextOccurrence(pattern, sunday)!;
    expect(next.getDay()).toBe(0);
    expect(next.getDate()).toBe(15);
  });

  it('weekly pattern — later this week', () => {
    const monday = new Date('2025-06-16T10:00:00Z'); // Monday
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'weekly',
      daysOfWeek: [3], // Wednesday
    };
    const next = getNextOccurrence(pattern, monday)!;
    expect(next.getDay()).toBe(3);
    expect(next.getDate()).toBe(18); // Wed 18th
  });

  it('weekly pattern — wraps to next week', () => {
    const friday = new Date('2025-06-20T10:00:00Z'); // Friday (day 5)
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'weekly',
      daysOfWeek: [1], // Monday
    };
    const next = getNextOccurrence(pattern, friday)!;
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(23); // Next Monday
  });

  it('monthly pattern — same month when day is in the future', () => {
    const ref = new Date('2025-06-10T10:00:00Z');
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'monthly',
      dayOfMonth: 20,
    };
    const next = getNextOccurrence(pattern, ref)!;
    expect(next.getMonth()).toBe(5); // June
    expect(next.getDate()).toBe(20);
  });

  it('monthly pattern — rolls to next month when day has passed', () => {
    const ref = new Date('2025-06-25T10:00:00Z');
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'monthly',
      dayOfMonth: 15,
    };
    const next = getNextOccurrence(pattern, ref)!;
    expect(next.getMonth()).toBe(6); // July
    expect(next.getDate()).toBe(15);
  });

  it('monthly pattern — clamps day for short months (Feb 30 → Feb 28)', () => {
    const ref = new Date('2025-02-01T10:00:00Z');
    const pattern: RecurringPatternConfig = {
      ...base,
      patternType: 'monthly',
      dayOfMonth: 30,
    };
    const next = getNextOccurrence(pattern, ref)!;
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28); // 2025 is not a leap year
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_PATTERN_CONFIG
// ---------------------------------------------------------------------------
describe('recurring — DEFAULT_PATTERN_CONFIG', () => {
  it('defaults to weekly on Mon, Wed, Fri', () => {
    expect(DEFAULT_PATTERN_CONFIG.patternType).toBe('weekly');
    expect(DEFAULT_PATTERN_CONFIG.daysOfWeek).toEqual([1, 3, 5]);
  });

  it('has endType "never" by default', () => {
    expect(DEFAULT_PATTERN_CONFIG.endType).toBe('never');
  });

  it('has maxOccurrences 10', () => {
    expect(DEFAULT_PATTERN_CONFIG.maxOccurrences).toBe(10);
  });

  it('startDate is today\'s date in YYYY-MM-DD format', () => {
    expect(DEFAULT_PATTERN_CONFIG.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
