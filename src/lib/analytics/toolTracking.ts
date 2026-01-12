/**
 * Interactive Tool Tracking Patterns
 * 
 * Pre-built tracking patterns for interactive components like:
 * - Calculators (cost savings, CO2, etc.)
 * - Multi-step wizards
 * - Search/filter widgets
 * - Interactive maps
 * 
 * WHY: Interactive tools are high-engagement components that
 * provide valuable user intent signals for CRO.
 */

import { useRef, useCallback, useEffect } from 'react';
import { analytics } from './index';
import type { ToolInteractionEvent } from './types';

// ============================================================================
// Types
// ============================================================================

export type ToolInteractionType = ToolInteractionEvent['interaction_type'];

interface ToolTrackingConfig {
  /** Unique tool identifier */
  toolName: string;
  /** Track step progression for multi-step tools */
  totalSteps?: number;
  /** Auto-track interaction start */
  autoTrackStart?: boolean;
}

interface WizardStep {
  stepId: string;
  stepNumber: number;
  completedFields?: string[];
}

// ============================================================================
// Calculator Tracking Hook
// ============================================================================

interface CalculatorConfig extends ToolTrackingConfig {
  /** Fields in the calculator */
  fields: string[];
  /** Function to bucket the result */
  resultBucketer?: (result: number) => string;
}

/**
 * Hook for tracking calculator interactions.
 * 
 * USAGE:
 * ```tsx
 * function SavingsCalculator() {
 *   const { trackInputChange, trackCalculation, trackShare } = useCalculatorTracking({
 *     toolName: 'savings_calculator',
 *     fields: ['distance', 'frequency', 'passengers'],
 *     resultBucketer: (value) => value < 50 ? '<50' : value < 100 ? '50-100' : '>100',
 *   });
 *   
 *   const onCalculate = (result: number) => {
 *     trackCalculation(result);
 *   };
 * }
 * ```
 */
export function useCalculatorTracking(config: CalculatorConfig) {
  const { toolName, fields, resultBucketer, autoTrackStart = true } = config;
  const hasStarted = useRef(false);
  const fieldsInteracted = useRef<Set<string>>(new Set());
  const startTime = useRef<number | null>(null);

  // Track tool start on mount
  useEffect(() => {
    if (autoTrackStart && !hasStarted.current) {
      hasStarted.current = true;
      startTime.current = Date.now();
      
      analytics.tools.interaction({
        tool_name: toolName,
        interaction_type: 'tool_started',
      });
    }
  }, [autoTrackStart, toolName]);

  const trackInputChange = useCallback((fieldName: string, value: unknown) => {
    if (!fieldsInteracted.current.has(fieldName)) {
      fieldsInteracted.current.add(fieldName);
      
      analytics.tools.interaction({
        tool_name: toolName,
        interaction_type: 'step_changed',
        step_name: `input_${fieldName}`,
      });
    }
  }, [toolName]);

  const trackCalculation = useCallback((result: number) => {
    const timeSpent = startTime.current 
      ? Math.round((Date.now() - startTime.current) / 1000) 
      : 0;

    const resultBucket = resultBucketer ? resultBucketer(result) : String(result);

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'result_calculated',
      result_bucket: resultBucket,
    });

    // Also track funnel for conversion analysis
    analytics.funnel.step({
      funnel_name: `tool_${toolName}`,
      step_name: 'calculation_complete',
      step_number: 2,
      total_steps: 3,
      custom_properties: {
        result_bucket: resultBucket,
        fields_used: Array.from(fieldsInteracted.current),
        time_spent_seconds: timeSpent,
      },
    });
  }, [toolName, resultBucketer]);

  const trackShare = useCallback((method: 'copy' | 'email' | 'social') => {
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'result_shared',
      step_name: method,
    });
  }, [toolName]);

  const trackReset = useCallback(() => {
    fieldsInteracted.current.clear();
    startTime.current = Date.now();
    
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'tool_started',
      step_name: 'reset',
    });
  }, [toolName]);

  return {
    trackInputChange,
    trackCalculation,
    trackShare,
    trackReset,
  };
}

// ============================================================================
// Wizard/Multi-Step Tracking Hook
// ============================================================================

interface WizardConfig extends ToolTrackingConfig {
  totalSteps: number;
  /** Callback when wizard is abandoned */
  onAbandonment?: (currentStep: number, fieldsCompleted: string[]) => void;
}

/**
 * Hook for tracking multi-step wizard interactions.
 * 
 * USAGE:
 * ```tsx
 * function OnboardingWizard() {
 *   const { trackStepView, trackStepComplete, trackFieldFill, trackWizardComplete } = 
 *     useWizardTracking({
 *       toolName: 'onboarding_wizard',
 *       totalSteps: 5,
 *     });
 *   
 *   useEffect(() => {
 *     trackStepView(1);
 *   }, [currentStep]);
 * }
 * ```
 */
export function useWizardTracking(config: WizardConfig) {
  const { toolName, totalSteps, autoTrackStart = true, onAbandonment } = config;
  const currentStep = useRef(0);
  const fieldsCompleted = useRef<Set<string>>(new Set());
  const stepStartTime = useRef<number | null>(null);
  const hasStarted = useRef(false);

  // Track wizard start on mount
  useEffect(() => {
    if (autoTrackStart && !hasStarted.current) {
      hasStarted.current = true;
      
      analytics.tools.interaction({
        tool_name: toolName,
        interaction_type: 'tool_started',
      });
    }

    // Track abandonment on unmount
    return () => {
      if (currentStep.current > 0 && currentStep.current < totalSteps) {
        analytics.funnel.formAbandoned({
          form_name: toolName,
          fields_filled: Array.from(fieldsCompleted.current),
          fields_with_errors: [],
          time_spent_seconds: stepStartTime.current 
            ? Math.round((Date.now() - stepStartTime.current) / 1000)
            : 0,
        });

        onAbandonment?.(currentStep.current, Array.from(fieldsCompleted.current));
      }
    };
  }, [autoTrackStart, toolName, totalSteps, onAbandonment]);

  const trackStepView = useCallback((stepNumber: number, stepName?: string) => {
    currentStep.current = stepNumber;
    stepStartTime.current = Date.now();

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: stepName || `step_${stepNumber}`,
    });

    analytics.funnel.step({
      funnel_name: `wizard_${toolName}`,
      step_name: stepName || `step_${stepNumber}`,
      step_number: stepNumber,
      total_steps: totalSteps,
    });
  }, [toolName, totalSteps]);

  const trackStepComplete = useCallback((stepNumber: number, stepName?: string) => {
    const timeOnStep = stepStartTime.current
      ? Math.round((Date.now() - stepStartTime.current) / 1000)
      : 0;

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: `${stepName || `step_${stepNumber}`}_complete`,
    });

    analytics.funnel.step({
      funnel_name: `wizard_${toolName}`,
      step_name: `${stepName || `step_${stepNumber}`}_complete`,
      step_number: stepNumber,
      total_steps: totalSteps,
      custom_properties: {
        time_on_step_seconds: timeOnStep,
      },
    });
  }, [toolName, totalSteps]);

  const trackFieldFill = useCallback((fieldName: string) => {
    fieldsCompleted.current.add(fieldName);
  }, []);

  const trackWizardComplete = useCallback(() => {
    currentStep.current = totalSteps + 1; // Mark as complete to prevent abandonment tracking

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'result_calculated', // "Completed" equivalent
    });

    analytics.funnel.step({
      funnel_name: `wizard_${toolName}`,
      step_name: 'wizard_complete',
      step_number: totalSteps + 1,
      total_steps: totalSteps,
      custom_properties: {
        fields_completed: Array.from(fieldsCompleted.current),
      },
    });
  }, [toolName, totalSteps]);

  const trackBack = useCallback((fromStep: number, toStep: number) => {
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: `back_${fromStep}_to_${toStep}`,
    });
  }, [toolName]);

  return {
    trackStepView,
    trackStepComplete,
    trackFieldFill,
    trackWizardComplete,
    trackBack,
  };
}

// ============================================================================
// Filter/Search Widget Tracking Hook
// ============================================================================

interface FilterConfig extends ToolTrackingConfig {
  /** Available filter fields */
  filterFields: string[];
}

/**
 * Hook for tracking search/filter widget interactions.
 * 
 * USAGE:
 * ```tsx
 * function RideFilters() {
 *   const { trackFilterChange, trackFilterApply, trackFilterClear } = useFilterTracking({
 *     toolName: 'ride_filters',
 *     filterFields: ['date', 'location', 'seats', 'rating'],
 *   });
 *   
 *   const onFilterChange = (field: string, value: unknown) => {
 *     trackFilterChange(field, value);
 *   };
 * }
 * ```
 */
export function useFilterTracking(config: FilterConfig) {
  const { toolName, filterFields } = config;
  const activeFilters = useRef<Map<string, unknown>>(new Map());
  const filterCount = useRef(0);

  const trackFilterChange = useCallback((fieldName: string, value: unknown) => {
    const prevValue = activeFilters.current.get(fieldName);
    
    if (value === null || value === undefined || value === '') {
      activeFilters.current.delete(fieldName);
    } else {
      activeFilters.current.set(fieldName, value);
    }

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: `filter_${fieldName}`,
    });
  }, [toolName]);

  const trackFilterApply = useCallback((resultCount: number) => {
    filterCount.current++;

    const appliedFilters = Array.from(activeFilters.current.keys());

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'result_calculated',
      result_bucket: resultCount === 0 ? '0' 
        : resultCount <= 5 ? '1-5'
        : resultCount <= 20 ? '6-20'
        : '20+',
    });

    analytics.funnel.step({
      funnel_name: `filter_${toolName}`,
      step_name: 'filter_applied',
      step_number: filterCount.current,
      total_steps: 3, // arbitrary for funnel analysis
      custom_properties: {
        filters_applied: appliedFilters,
        filter_count: appliedFilters.length,
        result_count: resultCount,
      },
    });
  }, [toolName]);

  const trackFilterClear = useCallback(() => {
    const clearedFilters = Array.from(activeFilters.current.keys());
    activeFilters.current.clear();

    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'tool_started', // Reset
      step_name: 'filters_cleared',
    });

    analytics.funnel.step({
      funnel_name: `filter_${toolName}`,
      step_name: 'filters_cleared',
      step_number: 1,
      total_steps: 3,
      custom_properties: {
        filters_cleared: clearedFilters,
      },
    });
  }, [toolName]);

  return {
    trackFilterChange,
    trackFilterApply,
    trackFilterClear,
    getActiveFilterCount: () => activeFilters.current.size,
  };
}

// ============================================================================
// Interactive Map Tracking Hook
// ============================================================================

interface MapConfig extends ToolTrackingConfig {
  /** Initial zoom level */
  initialZoom?: number;
}

/**
 * Hook for tracking interactive map interactions.
 * 
 * USAGE:
 * ```tsx
 * function RideMap() {
 *   const { trackMapInteraction, trackMarkerClick, trackRouteView } = useMapTracking({
 *     toolName: 'ride_map',
 *   });
 *   
 *   const onMarkerClick = (markerId: string) => {
 *     trackMarkerClick(markerId, 'ride');
 *   };
 * }
 * ```
 */
export function useMapTracking(config: MapConfig) {
  const { toolName, initialZoom, autoTrackStart = true } = config;
  const interactionCount = useRef(0);
  const hasStarted = useRef(false);

  // Track map load
  useEffect(() => {
    if (autoTrackStart && !hasStarted.current) {
      hasStarted.current = true;
      
      analytics.tools.interaction({
        tool_name: toolName,
        interaction_type: 'tool_started',
        step_name: 'map_loaded',
      });
    }
  }, [autoTrackStart, toolName]);

  const trackMapInteraction = useCallback((
    interactionType: 'zoom' | 'pan' | 'click' | 'drag'
  ) => {
    interactionCount.current++;
    
    // Only track every 5th interaction to avoid spam
    if (interactionCount.current % 5 === 0) {
      analytics.tools.interaction({
        tool_name: toolName,
        interaction_type: 'step_changed',
        step_name: `map_${interactionType}`,
      });
    }
  }, [toolName]);

  const trackMarkerClick = useCallback((markerId: string, markerType: string) => {
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: `marker_click_${markerType}`,
    });
  }, [toolName]);

  const trackRouteView = useCallback((routeId: string) => {
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'result_calculated',
      step_name: 'route_displayed',
      result_bucket: routeId,
    });
  }, [toolName]);

  const trackLocationSelect = useCallback((locationType: 'origin' | 'destination') => {
    analytics.tools.interaction({
      tool_name: toolName,
      interaction_type: 'step_changed',
      step_name: `location_selected_${locationType}`,
    });
  }, [toolName]);

  return {
    trackMapInteraction,
    trackMarkerClick,
    trackRouteView,
    trackLocationSelect,
  };
}

// ============================================================================
// Generic Tool Tracking Functions
// ============================================================================

/**
 * Track when a user starts using a tool
 */
export function trackToolStart(toolName: string): void {
  analytics.tools.interaction({
    tool_name: toolName,
    interaction_type: 'tool_started',
  });
}

/**
 * Track when a user completes using a tool
 */
export function trackToolComplete(toolName: string, resultBucket?: string): void {
  analytics.tools.interaction({
    tool_name: toolName,
    interaction_type: 'result_calculated',
    result_bucket: resultBucket,
  });
}

/**
 * Track when a user shares tool results
 */
export function trackToolShare(toolName: string, shareMethod: string): void {
  analytics.tools.interaction({
    tool_name: toolName,
    interaction_type: 'result_shared',
    step_name: shareMethod,
  });
}

// ============================================================================
// Exports
// ============================================================================

export const toolTracking = {
  useCalculatorTracking,
  useWizardTracking,
  useFilterTracking,
  useMapTracking,
  trackToolStart,
  trackToolComplete,
  trackToolShare,
};
