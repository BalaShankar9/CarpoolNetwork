// Recurring Rides Types

export type RecurringPatternType = 'daily' | 'weekly' | 'monthly';

export interface RecurringPattern {
  id: string;
  driver_id: string;
  vehicle_id: string;
  origin: string;
  origin_lat: number;
  origin_lng: number;
  destination: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string; // HH:MM format
  available_seats: number;
  notes?: string;
  pattern_type: RecurringPatternType;
  days_of_week?: number[]; // 0-6 for Sunday-Saturday
  day_of_month?: number; // 1-31
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  occurrences_created: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RecurringPatternConfig {
  patternType: RecurringPatternType;
  daysOfWeek: number[];
  dayOfMonth: number;
  startDate: string;
  endType: 'never' | 'date' | 'occurrences';
  endDate: string;
  maxOccurrences: number;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

export const PATTERN_TYPE_LABELS: Record<RecurringPatternType, string> = {
  daily: 'Every day',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const PATTERN_TYPE_DESCRIPTIONS: Record<RecurringPatternType, string> = {
  daily: 'Repeat every day',
  weekly: 'Repeat on specific days of the week',
  monthly: 'Repeat on a specific day of the month',
};

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Format pattern description for display
export function formatPatternDescription(pattern: RecurringPatternConfig): string {
  let description = '';

  switch (pattern.patternType) {
    case 'daily':
      description = 'Repeats every day';
      break;
    case 'weekly':
      const days = pattern.daysOfWeek
        .sort((a, b) => a - b)
        .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
        .filter(Boolean);
      description = `Repeats on ${days.join(', ')}`;
      break;
    case 'monthly':
      description = `Repeats on the ${getOrdinalSuffix(pattern.dayOfMonth)} of each month`;
      break;
  }

  if (pattern.endType === 'date' && pattern.endDate) {
    description += ` until ${new Date(pattern.endDate).toLocaleDateString()}`;
  } else if (pattern.endType === 'occurrences' && pattern.maxOccurrences) {
    description += ` for ${pattern.maxOccurrences} rides`;
  }

  return description;
}

// Calculate next occurrence date
export function getNextOccurrence(
  pattern: RecurringPatternConfig,
  fromDate: Date = new Date()
): Date | null {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  switch (pattern.patternType) {
    case 'daily':
      return today;

    case 'weekly':
      const currentDay = today.getDay();
      const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);

      // Find next day in the pattern
      let nextDay = sortedDays.find(d => d >= currentDay);
      if (nextDay === undefined) {
        // Wrap to next week
        nextDay = sortedDays[0];
        const daysUntil = 7 - currentDay + nextDay;
        const next = new Date(today);
        next.setDate(next.getDate() + daysUntil);
        return next;
      } else {
        const daysUntil = nextDay - currentDay;
        const next = new Date(today);
        next.setDate(next.getDate() + daysUntil);
        return next;
      }

    case 'monthly':
      const next = new Date(today);
      if (today.getDate() > pattern.dayOfMonth) {
        // Move to next month
        next.setMonth(next.getMonth() + 1);
      }
      next.setDate(Math.min(pattern.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      return next;
  }

  return null;
}

// Default pattern config
export const DEFAULT_PATTERN_CONFIG: RecurringPatternConfig = {
  patternType: 'weekly',
  daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
  dayOfMonth: 1,
  startDate: new Date().toISOString().split('T')[0],
  endType: 'never',
  endDate: '',
  maxOccurrences: 10,
};
