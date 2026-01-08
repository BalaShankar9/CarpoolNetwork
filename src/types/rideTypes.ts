// Ride Types for the Community Rideshare Platform
// Designed for immigrant communities and daily commuters

export type RideType =
    | 'daily_commute'
    | 'one_time'
    | 'airport_transfer'
    | 'moving_help'
    | 'long_distance'
    | 'flexible';

export interface RideTypeInfo {
    value: RideType;
    label: string;
    description: string;
    icon: string; // Emoji for quick visual
    supportsRecurring: boolean;
    defaultRecurring: boolean;
    color: string; // Background color class
    textColor: string; // Text color class
}

export const RIDE_TYPES: Record<RideType, RideTypeInfo> = {
    daily_commute: {
        value: 'daily_commute',
        label: 'Daily Commute',
        description: 'Regular work commute - warehouse, office, factory',
        icon: '🏭',
        supportsRecurring: true,
        defaultRecurring: true,
        color: 'bg-blue-100',
        textColor: 'text-blue-700',
    },
    one_time: {
        value: 'one_time',
        label: 'One-Time Trip',
        description: 'Single journey - specific date and time',
        icon: '📍',
        supportsRecurring: false,
        defaultRecurring: false,
        color: 'bg-green-100',
        textColor: 'text-green-700',
    },
    airport_transfer: {
        value: 'airport_transfer',
        label: 'Airport Transfer',
        description: 'Airport pickup or drop-off',
        icon: '✈️',
        supportsRecurring: false,
        defaultRecurring: false,
        color: 'bg-purple-100',
        textColor: 'text-purple-700',
    },
    moving_help: {
        value: 'moving_help',
        label: 'Moving / House Shift',
        description: 'Help with moving to a new place',
        icon: '📦',
        supportsRecurring: false,
        defaultRecurring: false,
        color: 'bg-orange-100',
        textColor: 'text-orange-700',
    },
    long_distance: {
        value: 'long_distance',
        label: 'Long Distance',
        description: 'Inter-city or cross-region travel',
        icon: '🚗',
        supportsRecurring: false,
        defaultRecurring: false,
        color: 'bg-indigo-100',
        textColor: 'text-indigo-700',
    },
    flexible: {
        value: 'flexible',
        label: 'Flexible / Ongoing',
        description: 'Open availability - until you remove it',
        icon: '🔄',
        supportsRecurring: true,
        defaultRecurring: true,
        color: 'bg-teal-100',
        textColor: 'text-teal-700',
    },
};

export const RIDE_TYPE_LIST = Object.values(RIDE_TYPES);

// Helper to get ride type info
export const getRideTypeInfo = (type: RideType | string): RideTypeInfo => {
    return RIDE_TYPES[type as RideType] || RIDE_TYPES.one_time;
};

// Schedule types for recurring rides
export type ScheduleType = 'one_time' | 'recurring' | 'flexible';

export interface ScheduleConfig {
    type: ScheduleType;
    // For recurring
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    timeSlot?: string; // "morning" | "afternoon" | "evening" | "custom"
    customTime?: string; // HH:MM format
    // For flexible
    availableFrom?: string; // Date
    availableUntil?: string | null; // Date or null for indefinite
}

// Common work schedules for quick selection
export const COMMON_SCHEDULES = [
    {
        id: 'weekdays_morning',
        label: 'Weekdays Morning',
        description: 'Monday to Friday, morning shift',
        daysOfWeek: [1, 2, 3, 4, 5],
        timeSlot: 'morning',
    },
    {
        id: 'weekdays_evening',
        label: 'Weekdays Evening',
        description: 'Monday to Friday, evening return',
        daysOfWeek: [1, 2, 3, 4, 5],
        timeSlot: 'evening',
    },
    {
        id: 'full_week',
        label: 'Full Week',
        description: 'All 7 days',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeSlot: 'custom',
    },
    {
        id: 'weekend_only',
        label: 'Weekend Only',
        description: 'Saturday and Sunday',
        daysOfWeek: [0, 6],
        timeSlot: 'custom',
    },
];

// Distance/radius options for matching
export const RADIUS_OPTIONS = [
    { value: 10, label: '10 km', description: 'Very close' },
    { value: 25, label: '25 km', description: 'Nearby' },
    { value: 50, label: '50 km', description: 'Local area (default)' },
    { value: 100, label: '100 km', description: 'Extended area' },
    { value: 200, label: '200+ km', description: 'Long distance' },
];
