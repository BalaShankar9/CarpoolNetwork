/**
 * Experiment Framework
 * 
 * Provides feature flag and A/B testing infrastructure.
 * Designed to be CRO-ready without requiring external services initially.
 * Can be connected to LaunchDarkly, Optimizely, or Statsig later.
 */

import { analytics } from './index';
import { createAnonymousId } from './utils';

// ============================================================================
// Types
// ============================================================================

export type VariantId = string;
export type ExperimentId = string;

export interface ExperimentConfig {
  /** Unique experiment identifier */
  id: ExperimentId;
  /** Human-readable name */
  name: string;
  /** Available variants */
  variants: VariantConfig[];
  /** Percentage of users to include (0-100) */
  trafficAllocation: number;
  /** Whether experiment is active */
  enabled: boolean;
  /** Experiment start date */
  startDate?: string;
  /** Experiment end date */
  endDate?: string;
  /** User segments to target */
  targetSegments?: string[];
}

export interface VariantConfig {
  /** Variant identifier */
  id: VariantId;
  /** Human-readable name */
  name: string;
  /** Percentage weight (all variants should sum to 100) */
  weight: number;
  /** Is this the control variant? */
  isControl?: boolean;
}

export interface ExperimentAssignment {
  experimentId: ExperimentId;
  variantId: VariantId;
  isControl: boolean;
  assignedAt: string;
}

// ============================================================================
// Experiment Registry
// ============================================================================

/**
 * Define experiments here. In production, this would be fetched from
 * a feature flag service like LaunchDarkly.
 */
const EXPERIMENTS: Record<ExperimentId, ExperimentConfig> = {
  // Example experiment - replace with real experiments
  'signup_flow_v2': {
    id: 'signup_flow_v2',
    name: 'New Signup Flow',
    trafficAllocation: 50, // 50% of users see experiment
    enabled: false, // Not enabled by default
    variants: [
      { id: 'control', name: 'Original Flow', weight: 50, isControl: true },
      { id: 'variant_a', name: 'Simplified Flow', weight: 50 },
    ],
  },
  'ride_card_redesign': {
    id: 'ride_card_redesign',
    name: 'Ride Card Redesign',
    trafficAllocation: 100,
    enabled: false,
    variants: [
      { id: 'control', name: 'Original Card', weight: 50, isControl: true },
      { id: 'compact', name: 'Compact Card', weight: 25 },
      { id: 'detailed', name: 'Detailed Card', weight: 25 },
    ],
  },
  'cta_copy_test': {
    id: 'cta_copy_test',
    name: 'CTA Button Copy Test',
    trafficAllocation: 100,
    enabled: false,
    variants: [
      { id: 'control', name: 'Find a Ride', weight: 34, isControl: true },
      { id: 'action', name: 'Start Searching', weight: 33 },
      { id: 'benefit', name: 'Save on Commute', weight: 33 },
    ],
  },
};

// ============================================================================
// Assignment Logic
// ============================================================================

const STORAGE_KEY = 'carpool_experiments';

interface StoredAssignments {
  userId: string;
  assignments: Record<ExperimentId, ExperimentAssignment>;
}

/**
 * Get or create stable user ID for experiment assignment
 */
function getExperimentUserId(): string {
  let stored: StoredAssignments | null = null;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      stored = JSON.parse(data);
    }
  } catch {
    // Ignore parse errors
  }

  if (stored?.userId) {
    return stored.userId;
  }

  // Create new ID
  const userId = createAnonymousId('experiment_user');
  saveAssignments({ userId, assignments: {} });
  return userId;
}

/**
 * Save assignments to localStorage
 */
function saveAssignments(data: StoredAssignments): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load stored assignments
 */
function loadAssignments(): StoredAssignments {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore parse errors
  }
  
  const userId = createAnonymousId('experiment_user');
  return { userId, assignments: {} };
}

/**
 * Deterministic hash for consistent assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Assign user to experiment variant
 */
function assignVariant(
  experiment: ExperimentConfig,
  userId: string
): VariantId {
  // Hash user ID + experiment ID for consistent assignment
  const hash = hashString(`${userId}:${experiment.id}`);
  const bucket = hash % 100;

  // Check if user is in traffic allocation
  if (bucket >= experiment.trafficAllocation) {
    // User not in experiment, assign to control
    const control = experiment.variants.find(v => v.isControl);
    return control?.id || experiment.variants[0].id;
  }

  // Assign based on variant weights
  const normalizedBucket = (hash % 10000) / 100; // 0-99.99
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (normalizedBucket < cumulative) {
      return variant.id;
    }
  }

  // Fallback to last variant
  return experiment.variants[experiment.variants.length - 1].id;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get experiment assignment for a user
 */
export function getExperiment(experimentId: ExperimentId): ExperimentAssignment | null {
  const experiment = EXPERIMENTS[experimentId];
  if (!experiment || !experiment.enabled) {
    return null;
  }

  // Check date constraints
  if (experiment.startDate && new Date() < new Date(experiment.startDate)) {
    return null;
  }
  if (experiment.endDate && new Date() > new Date(experiment.endDate)) {
    return null;
  }

  // Check for existing assignment
  const stored = loadAssignments();
  if (stored.assignments[experimentId]) {
    return stored.assignments[experimentId];
  }

  // Create new assignment
  const userId = getExperimentUserId();
  const variantId = assignVariant(experiment, userId);
  const variant = experiment.variants.find(v => v.id === variantId);

  const assignment: ExperimentAssignment = {
    experimentId,
    variantId,
    isControl: variant?.isControl || false,
    assignedAt: new Date().toISOString(),
  };

  // Store assignment
  stored.assignments[experimentId] = assignment;
  saveAssignments(stored);

  // Track assignment
  trackExperimentAssignment(assignment);

  return assignment;
}

/**
 * Track experiment assignment
 */
function trackExperimentAssignment(assignment: ExperimentAssignment): void {
  analytics.funnel.step({
    funnel_name: 'experiment',
    step_name: 'assigned',
    step_number: 1,
    total_steps: 2,
    custom_properties: {
      experiment_id: assignment.experimentId,
      variant_id: assignment.variantId,
      is_control: assignment.isControl,
    },
  });
}

/**
 * Track experiment conversion
 */
export function trackExperimentConversion(
  experimentId: ExperimentId,
  conversionType: string,
  value?: number
): void {
  const assignment = getExperiment(experimentId);
  if (!assignment) return;

  analytics.funnel.step({
    funnel_name: 'experiment',
    step_name: 'converted',
    step_number: 2,
    total_steps: 2,
    custom_properties: {
      experiment_id: experimentId,
      variant_id: assignment.variantId,
      is_control: assignment.isControl,
      conversion_type: conversionType,
      conversion_value: value,
    },
  });
}

/**
 * Get variant ID for a feature flag (simple on/off)
 */
export function isFeatureEnabled(featureId: string): boolean {
  const assignment = getExperiment(featureId);
  if (!assignment) return false;
  
  // Non-control variants are considered "enabled"
  return !assignment.isControl;
}

/**
 * Get all active experiment assignments
 */
export function getActiveExperiments(): ExperimentAssignment[] {
  const stored = loadAssignments();
  return Object.values(stored.assignments);
}

/**
 * Force a specific variant (for testing/debugging)
 */
export function forceVariant(experimentId: ExperimentId, variantId: VariantId): void {
  const experiment = EXPERIMENTS[experimentId];
  if (!experiment) return;

  const variant = experiment.variants.find(v => v.id === variantId);
  if (!variant) return;

  const stored = loadAssignments();
  stored.assignments[experimentId] = {
    experimentId,
    variantId,
    isControl: variant.isControl || false,
    assignedAt: new Date().toISOString(),
  };
  saveAssignments(stored);
}

/**
 * Clear all experiment assignments (for testing)
 */
export function clearExperiments(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * React hook for experiment assignment
 */
export function useExperiment(experimentId: ExperimentId): {
  variant: VariantId | null;
  isControl: boolean;
  isLoading: boolean;
} {
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const result = getExperiment(experimentId);
    setAssignment(result);
    setIsLoading(false);
  }, [experimentId]);

  return {
    variant: assignment?.variantId || null,
    isControl: assignment?.isControl ?? true,
    isLoading,
  };
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(featureId: string): {
  enabled: boolean;
  isLoading: boolean;
} {
  const { variant, isControl, isLoading } = useExperiment(featureId);

  return {
    enabled: variant !== null && !isControl,
    isLoading,
  };
}

// ============================================================================
// Exports
// ============================================================================

export const experiments = {
  get: getExperiment,
  trackConversion: trackExperimentConversion,
  isFeatureEnabled,
  getActive: getActiveExperiments,
  forceVariant,
  clear: clearExperiments,
};
