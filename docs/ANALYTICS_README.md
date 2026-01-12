# Analytics Documentation

## Overview

Carpool Network uses a centralized analytics system built on GA4 (Google Analytics 4) with optional GTM (Google Tag Manager) support. This document covers the implementation, event schema, debugging, and best practices.

## Quick Start

### Tracking an Event

```typescript
import { analytics } from '@/lib/analytics';

// Track a signup
analytics.track.signUpComplete({ signup_method: 'google' });

// Track a ride creation
analytics.track.rideCreated({
  seats: 4,
  is_recurring: false,
  distance_km: 25,
});

// Track an error
analytics.track.errorStateShown({
  error_type: 'network',
  error_source: 'ride_booking',
  error_code: 'TIMEOUT',
});
```

### Debug Mode

Enable debug mode by:
1. Setting `VITE_ANALYTICS_DEBUG=true` in your `.env`
2. Adding `?analytics_debug=true` to the URL
3. Calling `analytics.getDebugState()` in browser console

Debug mode logs all events to the console and enables GA4's DebugView.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              analytics.track.*                       │   │
│  │              analytics.funnel.*                      │   │
│  │              analytics.performance.*                 │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────▼─────────────────────────────┐   │
│  │           src/lib/analytics/index.ts                 │   │
│  │           (Central Entry Point)                      │   │
│  └───────────┬───────────────────────────┬─────────────┘   │
│              │                           │                  │
│  ┌───────────▼───────────┐   ┌───────────▼───────────┐     │
│  │      ga4.ts           │   │    dataLayer.ts       │     │
│  │   (GA4 Integration)   │   │  (GTM Integration)    │     │
│  └───────────────────────┘   └───────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │      GA4 / GTM        │
              │  (External Services)  │
              └───────────────────────┘
```

---

## Event Schema

### Base Properties (Included with Every Event)

| Property | Type | Description |
|----------|------|-------------|
| `page_path` | string | Current page path (sanitized, no IDs) |
| `flow_stage` | FlowStage | User's position in the journey |
| `user_role` | UserRole | driver, rider, both, unknown |
| `device_type` | DeviceType | mobile, tablet, desktop |
| `environment` | string | production, staging, development |
| `timestamp` | string | ISO 8601 timestamp |
| `session_id` | string | Anonymous session identifier |

### Core Events

#### `sign_up_complete`
Fired when a user successfully creates an account.

```typescript
analytics.track.signUpComplete({
  signup_method: 'email' | 'google' | 'facebook' | 'github' | 'otp'
});
```

#### `profile_completed`
Fired when a user completes their profile.

```typescript
analytics.track.profileCompleted({
  fields_completed: ['name', 'photo', 'phone'],
  time_to_complete_seconds: 120,
});
```

#### `ride_created`
Fired when a driver posts a new ride.

```typescript
analytics.track.rideCreated({
  seats: 4,
  is_recurring: false,
  distance_km: 25, // optional
});
```

#### `ride_requested`
Fired when a rider requests a ride.

```typescript
analytics.track.rideRequested({
  seats_requested: 2,
  has_target_ride: true,
});
```

#### `ride_accepted`
Fired when a driver accepts a booking.

```typescript
analytics.track.rideAccepted({
  time_to_accept_hours: 2,
  acceptance_rate: 0.85,
});
```

#### `message_sent`
Fired when a user sends a message.

```typescript
analytics.track.messageSent({
  message_context: 'ride_inquiry' | 'booking_chat' | 'general',
  is_first_message: true,
});
```

#### `whatsapp_handoff`
Fired when a user clicks to contact via WhatsApp.

```typescript
analytics.track.whatsappHandoff({
  handoff_context: 'ride_details' | 'booking_confirmed' | 'profile',
});
```

#### `error_state_shown`
Fired when an error is shown to the user.

```typescript
analytics.track.errorStateShown({
  error_type: 'auth' | 'network' | 'validation' | 'permission' | 'not_found' | 'server' | 'unknown',
  error_source: 'signup_form',
  error_code: 'INVALID_EMAIL', // optional
});
```

---

## Funnel Tracking

### Core Funnel
```
Visit → Sign Up → Profile Complete → Ride Created/Requested → Message Sent → Handoff
```

### Tracking Funnel Steps

```typescript
analytics.funnel.step({
  funnel_name: 'onboarding',
  step_name: 'email_verification',
  step_number: 2,
  total_steps: 5,
});
```

### Tracking Form Abandonment

```typescript
analytics.funnel.formAbandoned({
  form_name: 'post_ride',
  fields_filled: ['origin', 'destination'],
  fields_with_errors: ['departure_time'],
  time_spent_seconds: 45,
});
```

### Tracking Empty States

```typescript
analytics.funnel.emptyStateShown({
  empty_state_context: 'no_rides_found',
  cta_shown: 'Post your own ride',
});
```

---

## User Context

### Identifying Users

When a user signs in:
```typescript
analytics.identify(userId, {
  total_rides_offered: 5,
  total_rides_taken: 10,
  profile_completion_percentage: 80,
});
```

When a user signs out:
```typescript
analytics.reset();
```

### Flow Stages

Set the user's position in their journey:
```typescript
analytics.setFlowStage('ride_create');
```

Available stages:
- `visit`
- `signup_started`
- `signup_complete`
- `profile_started`
- `profile_complete`
- `ride_search`
- `ride_create`
- `ride_request`
- `ride_accept`
- `messaging`
- `handoff`
- `conversion`

---

## React Hooks

### usePageViewTracking
Automatically tracks page views on route changes.

```tsx
function App() {
  usePageViewTracking();
  return <Routes>...</Routes>;
}
```

### useFormTracking
Tracks form interactions and abandonment.

```tsx
function SignUpForm() {
  const { trackFormStart, trackFieldInteraction, trackFormSubmit, trackFormError } = 
    useFormTracking({ formName: 'signup' });
  
  useEffect(() => trackFormStart(), []);
  
  return (
    <form onSubmit={handleSubmit}>
      <input onFocus={() => trackFieldInteraction('email')} />
    </form>
  );
}
```

### useFlowStage
Sets the flow stage for a component.

```tsx
function PostRidePage() {
  useFlowStage('ride_create');
  return <PostRideForm />;
}
```

### useEmptyStateTracking
Tracks when empty states are shown.

```tsx
function RidesList({ rides }) {
  useEmptyStateTracking(rides.length === 0, 'no_rides_found', 'Search again');
  // ...
}
```

### useErrorTracking
Tracks error states.

```tsx
function DataLoader({ error }) {
  const { trackError } = useErrorTracking({ source: 'DataLoader' });
  
  useEffect(() => {
    if (error) trackError('network', error.code);
  }, [error]);
}
```

---

## Privacy & Security

### No PII in Analytics

**Never track:**
- Email addresses
- Phone numbers
- Full names
- Exact locations
- User IDs (use anonymized versions)

**Bucketing for Privacy:**
- Distances: `<10km`, `10-25km`, `25-50km`, etc.
- Times: `<1h`, `1-4h`, `4-24h`, etc.
- Percentages: `0`, `25`, `50`, `75`, `100`

### URL Sanitization

All page paths are sanitized to remove identifiers:
- `/user/abc-123-def` → `/user/:id`
- `/rides/456` → `/rides/:id`

---

## Environment Configuration

### Environment Variables

```bash
# Required for production
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional
VITE_GTM_CONTAINER_ID=GTM-XXXXXXX
VITE_ANALYTICS_ENV=production|staging|development
VITE_ANALYTICS_DEBUG=true|false
VITE_ANALYTICS_DISABLED=true|false
```

### Environment Detection

If `VITE_ANALYTICS_ENV` is not set, the system auto-detects:
- **Production:** `carpoolnetwork.co.uk`
- **Staging:** `*.netlify.app` or contains `staging`
- **Development:** Everything else

---

## Debugging

### Browser Console Commands

```javascript
// Get current analytics state
analytics.getDebugState()

// Test GA4 connection
testGA4Connection()

// Enable verbose dataLayer logging
enableDataLayerDebug()

// View all dataLayer events
window.dataLayer
```

### GA4 DebugView

1. Enable debug mode (see Quick Start)
2. Open GA4 → Configure → DebugView
3. Events will appear in real-time

### Common Issues

**Events not appearing in GA4:**
1. Check `VITE_GA4_MEASUREMENT_ID` is set
2. Verify debug mode shows events in console
3. Wait 24-48 hours for standard reports (DebugView is real-time)

**Duplicate events:**
1. Check component isn't re-mounting
2. Verify event guards (e.g., `useRef` to track if already fired)

---

## Funnel Tracking (CRO)

### Defined Funnels

Three core funnels are pre-defined in `funnels.ts`:

1. **Onboarding Funnel** (`onboarding`)
   - Landing → Signup Start → Signup Complete → Profile Start → Profile Complete

2. **Driver Journey** (`driver_journey`)
   - Profile Complete → Ride Create Start → Ride Posted → Booking Received → Booking Accepted → Message Sent → Handoff

3. **Rider Journey** (`rider_journey`)
   - Profile Complete → Search → View Ride → Request Ride → Booking Confirmed → Message Sent → Handoff

### Using Funnel Tracking

```typescript
import { useFunnelTracking } from '@/lib/analytics';

function OnboardingPage() {
  const { progress, currentStep, trackStepComplete, trackDropOff } = useFunnelTracking({
    funnelId: 'onboarding',
    autoTrack: true,
  });
  
  // Progress bar
  return <ProgressBar value={progress} />;
}
```

### Drop-off Tracking

```typescript
import { dropOffTracking } from '@/lib/analytics';

// Track form validation errors
dropOffTracking.trackValidationErrors('signup_form', {
  email: 'Invalid email format',
  password: 'Password too short',
});

// Track empty states
dropOffTracking.trackEmptyState({
  location: 'ride_search',
  reason: 'search_no_results',
  searchQuery: 'London to Manchester',
});

// Track permission denials
dropOffTracking.trackPermission({
  permission: 'location',
  action: 'denied',
  context: 'ride_search',
});
```

---

## Experiments & Feature Flags

### Defining Experiments

Experiments are defined in `experiments.ts`:

```typescript
const EXPERIMENTS = {
  'signup_flow_v2': {
    id: 'signup_flow_v2',
    name: 'New Signup Flow',
    trafficAllocation: 50, // 50% of users
    enabled: true,
    variants: [
      { id: 'control', name: 'Original', weight: 50, isControl: true },
      { id: 'variant_a', name: 'Simplified', weight: 50 },
    ],
  },
};
```

### Using Experiments

```typescript
import { useExperiment, trackExperimentConversion } from '@/lib/analytics';

function SignupForm() {
  const { variant, isControl } = useExperiment('signup_flow_v2');
  
  const onSuccess = () => {
    trackExperimentConversion('signup_flow_v2', 'signup_complete');
  };
  
  if (variant === 'variant_a') {
    return <SimplifiedSignupForm onSuccess={onSuccess} />;
  }
  return <OriginalSignupForm onSuccess={onSuccess} />;
}
```

### Feature Flags

```typescript
import { useFeatureFlag } from '@/lib/analytics';

function NewFeature() {
  const { enabled } = useFeatureFlag('new_dashboard');
  
  if (!enabled) return null;
  return <NewDashboard />;
}
```

---

## Core Web Vitals

Web Vitals are automatically tracked via `initWebVitals()` in main.tsx.

### Metrics Tracked

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤2500ms | ≤4000ms | >4000ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 |
| INP (Interaction to Next Paint) | ≤200ms | ≤500ms | >500ms |
| FCP (First Contentful Paint) | ≤1800ms | ≤3000ms | >3000ms |
| TTFB (Time to First Byte) | ≤800ms | ≤1800ms | >1800ms |

### Custom Performance Tracking

```typescript
import { trackTiming, measureAsync, startMeasure } from '@/lib/analytics';

// Track custom timing
trackTiming('api', 'fetchRides', 250);

// Measure async operation
const rides = await measureAsync('fetchRides', 'api', () => 
  supabase.from('rides').select('*')
);

// Manual timing
const endTimer = startMeasure('complexOperation');
// ... do work
const duration = endTimer();
```

---

## Interactive Tool Tracking

### Calculator Tracking

```typescript
import { useCalculatorTracking } from '@/lib/analytics';

function SavingsCalculator() {
  const { trackInputChange, trackCalculation, trackShare } = useCalculatorTracking({
    toolName: 'savings_calculator',
    fields: ['distance', 'frequency', 'passengers'],
    resultBucketer: (value) => value < 50 ? '<£50' : value < 100 ? '£50-100' : '>£100',
  });
  
  return (
    <input 
      onChange={(e) => trackInputChange('distance', e.target.value)}
    />
  );
}
```

### Wizard/Multi-Step Tracking

```typescript
import { useWizardTracking } from '@/lib/analytics';

function OnboardingWizard() {
  const { trackStepView, trackStepComplete, trackWizardComplete } = useWizardTracking({
    toolName: 'onboarding_wizard',
    totalSteps: 5,
  });
  
  useEffect(() => {
    trackStepView(currentStep, `step_${currentStep}`);
  }, [currentStep]);
}
```

### Filter Tracking

```typescript
import { useFilterTracking } from '@/lib/analytics';

function RideFilters() {
  const { trackFilterChange, trackFilterApply } = useFilterTracking({
    toolName: 'ride_filters',
    filterFields: ['date', 'location', 'seats'],
  });
  
  const onSearch = async () => {
    const results = await search(filters);
    trackFilterApply(results.length);
  };
}
```

---

## Future Extensions

### Heatmaps

For heatmap integration, consider:
- Hotjar
- Microsoft Clarity
- FullStory

### CRM Integration (HubSpot)

```typescript
// Future: HubSpot form tracking
hubspot.track('form_submit', {
  formName: 'signup',
  email: user.email, // Only with consent
});
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/analytics/index.ts` | Main entry point, public API |
| `src/lib/analytics/types.ts` | TypeScript type definitions |
| `src/lib/analytics/config.ts` | Configuration and environment detection |
| `src/lib/analytics/ga4.ts` | GA4-specific implementation |
| `src/lib/analytics/dataLayer.ts` | GTM dataLayer abstraction |
| `src/lib/analytics/utils.ts` | Utility functions (bucketing, anonymization) |
| `src/lib/analytics/hooks.ts` | React hooks for common patterns |
| `src/lib/analytics/AnalyticsProvider.tsx` | React provider component |
| `src/lib/analytics/funnels.ts` | Funnel definitions for CRO |
| `src/lib/analytics/dropoff.ts` | Drop-off tracking utilities |
| `src/lib/analytics/experiments.ts` | A/B testing framework |
| `src/lib/analytics/webVitals.ts` | Core Web Vitals tracking |
| `src/lib/analytics/toolTracking.ts` | Interactive tool hooks |
| `src/lib/analytics/debug.ts` | Debug utilities |

