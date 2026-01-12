/**
 * Analytics Utilities
 * 
 * WHY: Reusable utilities for analytics operations.
 * These helpers ensure consistency and privacy compliance.
 */

import type { DeviceType, UserRole } from './types';

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SESSION_KEY = 'carpool_analytics_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  created: number;
  lastActivity: number;
}

/**
 * Generates a random session ID.
 * 
 * WHY: Session IDs help group events without identifying users.
 * Using crypto.randomUUID when available for better randomness.
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets or creates a session ID.
 * Sessions expire after 30 minutes of inactivity.
 * 
 * WHY: Session tracking helps understand user journeys
 * without requiring authentication.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return generateSessionId();
  }

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: SessionData = JSON.parse(stored);
      const now = Date.now();

      // Check if session is still valid
      if (now - session.lastActivity < SESSION_DURATION_MS) {
        // Update last activity
        session.lastActivity = now;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session.id;
      }
    }

    // Create new session
    const newSession: SessionData = {
      id: generateSessionId(),
      created: Date.now(),
      lastActivity: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSession.id;
  } catch {
    // Fallback if sessionStorage fails
    return generateSessionId();
  }
}

// ============================================================================
// DEVICE DETECTION
// ============================================================================

/**
 * Detects the device type based on screen width.
 * 
 * WHY: Device type helps understand user behavior differences
 * and identify mobile-specific UX issues.
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

// ============================================================================
// ANONYMIZATION
// ============================================================================

/**
 * Creates an anonymous user ID from a user ID.
 * Uses a simple hash - NOT cryptographically secure, but sufficient for analytics.
 * 
 * WHY: We need to track user journeys without storing PII.
 * The hash is one-way and cannot be reversed to reveal the original ID.
 */
export function createAnonymousId(userId?: string): string {
  if (!userId) {
    // For unauthenticated users, use a client-generated ID stored in localStorage
    if (typeof window !== 'undefined') {
      try {
        let anonId = localStorage.getItem('carpool_anonymous_id');
        if (!anonId) {
          anonId = 'anon_' + generateSessionId();
          localStorage.setItem('carpool_anonymous_id', anonId);
        }
        return anonId;
      } catch {
        return 'anon_' + generateSessionId();
      }
    }
    return 'anon_unknown';
  }

  // Simple hash for authenticated users
  // WHY: This creates a consistent but non-reversible identifier
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 'user_' + Math.abs(hash).toString(36);
}

// ============================================================================
// VALUE BUCKETING
// ============================================================================

/**
 * Buckets a numeric value into predefined ranges.
 * 
 * WHY: Bucketing prevents tracking exact values which could be PII
 * (e.g., exact trip distance might identify a route).
 */
export function bucketNumber(value: number, buckets: number[]): string {
  const sortedBuckets = [...buckets].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedBuckets.length; i++) {
    if (value < sortedBuckets[i]) {
      if (i === 0) {
        return `<${sortedBuckets[i]}`;
      }
      return `${sortedBuckets[i - 1]}-${sortedBuckets[i]}`;
    }
  }
  
  return `${sortedBuckets[sortedBuckets.length - 1]}+`;
}

/**
 * Predefined bucket helpers for common use cases.
 */
export const buckets = {
  /** For seat counts */
  seats: (seats: number): string => {
    if (seats <= 2) return '1-2';
    if (seats <= 4) return '3-4';
    return '5+';
  },

  /** For distances in km */
  distance: (km: number): string => bucketNumber(km, [10, 25, 50, 100, 200]),

  /** For time in seconds */
  timeSeconds: (seconds: number): string => {
    if (seconds < 30) return '<30s';
    if (seconds < 60) return '30s-1m';
    if (seconds < 300) return '1-5m';
    if (seconds < 900) return '5-15m';
    if (seconds < 1800) return '15-30m';
    return '30m+';
  },

  /** For time in hours */
  timeHours: (hours: number): string => {
    if (hours < 1) return '<1h';
    if (hours < 4) return '1-4h';
    if (hours < 24) return '4-24h';
    if (hours < 72) return '1-3d';
    return '3d+';
  },

  /** For percentages (0-100) */
  percentage: (pct: number): number => {
    if (pct < 25) return 0;
    if (pct < 50) return 25;
    if (pct < 75) return 50;
    if (pct < 100) return 75;
    return 100;
  },

  /** For acceptance/response rates */
  rate: (rate: number): string => {
    if (rate < 0.2) return '<20%';
    if (rate < 0.4) return '20-40%';
    if (rate < 0.6) return '40-60%';
    if (rate < 0.8) return '60-80%';
    return '80%+';
  },
};

// ============================================================================
// USER ROLE DETECTION
// ============================================================================

/**
 * Determines user role based on profile data.
 * 
 * WHY: User role helps segment analytics and understand
 * different user journeys (drivers vs riders).
 */
export function determineUserRole(profile?: {
  total_rides_offered?: number;
  total_rides_taken?: number;
} | null): UserRole {
  if (!profile) {
    return 'unknown';
  }

  const hasOffered = (profile.total_rides_offered || 0) > 0;
  const hasTaken = (profile.total_rides_taken || 0) > 0;

  if (hasOffered && hasTaken) {
    return 'both';
  }
  if (hasOffered) {
    return 'driver';
  }
  if (hasTaken) {
    return 'rider';
  }
  return 'unknown';
}

// ============================================================================
// PAGE PATH SANITIZATION
// ============================================================================

/**
 * Sanitizes page paths to remove PII (e.g., user IDs in URLs).
 * 
 * WHY: URLs like /user/abc123 contain user identifiers.
 * We replace these with placeholders to protect privacy.
 */
export function sanitizePagePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Clean up any double slashes
    .replace(/\/+/g, '/');
}
