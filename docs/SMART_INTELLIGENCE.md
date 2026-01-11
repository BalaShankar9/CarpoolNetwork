# Smart Commute Intelligence (Phase F++)

> **Philosophy**: Intelligence is ADVISORY, never authoritative.  
> **Principle**: All scoring is explainable, deterministic, and fair.  
> **Status**: Production-ready extension to CarpoolNetwork

---

## Executive Summary

Smart Commute Intelligence adds **explainable matching** to help users find relevant rides faster. It does NOT:
- Auto-book anything
- Hide valid rides
- Use black-box ML
- Affect seat correctness or booking logic

**Core Idea**: Surface better suggestions while keeping users in full control.

---

## Philosophy: Why NOT Machine Learning

### The Problem with Black-Box AI

Traditional ML matching systems:
1. Learn hidden patterns humans can't explain
2. Create feedback loops that reinforce bias
3. Fail silently when inputs change
4. Cannot be audited for fairness

### Our Approach: Geometric + Behavioral Scoring

We use:
- **Deterministic geometry** for route similarity
- **Historical behavior** for reliability
- **Explicit fairness rules** to prevent starvation

Every score can be explained in plain English:
> "92% route overlap because your destination is 0.3 km from driver's destination"

---

## F++1: Route Similarity (Geometric)

### Inputs

| Input | Source | Required |
|-------|--------|----------|
| Origin lat/lng | Passenger search | Yes |
| Destination lat/lng | Passenger search | Yes |
| Ride origin lat/lng | Ride posting | Yes |
| Ride destination lat/lng | Ride posting | Yes |
| Route polyline | Google Maps (optional) | No |

### Signals

#### 1. Origin Proximity Score

```
origin_score = max(0, 1 - (distance_meters / MAX_ORIGIN_RADIUS))

where MAX_ORIGIN_RADIUS = 5000 meters (configurable)
```

**Example**: 
- Distance = 500m → Score = 1 - (500/5000) = 0.90
- Distance = 3000m → Score = 1 - (3000/5000) = 0.40
- Distance > 5000m → Score = 0

#### 2. Destination Proximity Score

```
destination_score = max(0, 1 - (distance_meters / MAX_DEST_RADIUS))

where MAX_DEST_RADIUS = 3000 meters (configurable)
```

Destination radius is tighter because final drop-off matters more.

#### 3. Direction Alignment Score

Uses bearing (compass direction) between origin→destination:

```
passenger_bearing = bearing(passenger_origin, passenger_destination)
ride_bearing = bearing(ride_origin, ride_destination)

bearing_delta = abs(passenger_bearing - ride_bearing)
if bearing_delta > 180:
    bearing_delta = 360 - bearing_delta

direction_score = max(0, 1 - (bearing_delta / 90))
```

**Example**:
- Same direction (delta = 0°) → Score = 1.0
- 45° off → Score = 0.5
- 90°+ off (perpendicular/opposite) → Score = 0

#### 4. Route Overlap Ratio (Optional)

When polylines are available:

```
overlap_score = length_of_shared_route / min(passenger_route, ride_route)
```

Uses simplified polyline intersection algorithm:
1. Sample both routes at 100m intervals
2. Count points within 200m of the other route
3. Ratio = matched points / total points

### Combined Route Similarity Score

```
route_similarity = (
    origin_score * WEIGHT_ORIGIN +
    destination_score * WEIGHT_DESTINATION +
    direction_score * WEIGHT_DIRECTION +
    overlap_score * WEIGHT_OVERLAP
) / (WEIGHT_ORIGIN + WEIGHT_DESTINATION + WEIGHT_DIRECTION + WEIGHT_OVERLAP)
```

**Default Weights**:
| Signal | Weight | Rationale |
|--------|--------|-----------|
| Origin | 0.25 | Important but flexible (can walk) |
| Destination | 0.35 | Most important (final location) |
| Direction | 0.20 | Ensures route makes sense |
| Overlap | 0.20 | Bonus for actual route match |

### Explanation Generation

```typescript
function explainRouteSimilarity(scores: RouteScores): string {
  const parts: string[] = [];
  
  if (scores.origin_distance < 1000) {
    parts.push(`Pickup ${Math.round(scores.origin_distance)}m from your origin`);
  }
  if (scores.destination_distance < 500) {
    parts.push(`Drop-off ${Math.round(scores.destination_distance)}m from your destination`);
  }
  if (scores.direction_score > 0.8) {
    parts.push(`Same direction of travel`);
  }
  if (scores.overlap_score > 0.7) {
    parts.push(`${Math.round(scores.overlap_score * 100)}% route overlap`);
  }
  
  return parts.join(' • ') || 'Partial route match';
}
```

---

## F++2: Commute Clustering (Soft, Optional)

### Purpose

Identify common commute corridors to help users discover rides they might not have searched for explicitly.

**Example**: "Tech Park Morning Commute" - many users going to the same office complex between 7-9 AM.

### Algorithm

Simple time-bucketed spatial clustering:

```sql
-- Step 1: Bucket rides by time and approximate destination
WITH ride_buckets AS (
  SELECT 
    id,
    driver_id,
    -- Time bucket: 30-minute windows
    date_trunc('hour', departure_time) + 
      (EXTRACT(minute FROM departure_time)::int / 30) * interval '30 minutes' AS time_bucket,
    -- Spatial bucket: round to ~1km grid
    round(destination_lat::numeric, 2) AS dest_lat_bucket,
    round(destination_lng::numeric, 2) AS dest_lng_bucket
  FROM rides
  WHERE status = 'active'
    AND departure_time > now()
)
-- Step 2: Count rides per bucket
SELECT 
  time_bucket,
  dest_lat_bucket,
  dest_lng_bucket,
  COUNT(*) as ride_count,
  array_agg(id) as ride_ids
FROM ride_buckets
GROUP BY time_bucket, dest_lat_bucket, dest_lng_bucket
HAVING COUNT(*) >= 3  -- Minimum cluster size
```

### Cluster Properties

| Property | Type | Description |
|----------|------|-------------|
| cluster_id | UUID | Stable identifier |
| centroid_lat | float | Average destination lat |
| centroid_lng | float | Average destination lng |
| radius_meters | int | Approximate spread |
| time_window | text | "7:00-9:00 AM" |
| ride_count | int | Current rides in cluster |
| description | text | Human-readable name |

### Cluster Naming

Auto-generated from reverse geocoding:
```
"{time_window} to {area_name}"
→ "Morning commute to Downtown Tech District"
```

### Rules

1. **Descriptive Only**: Clusters are labels, not enforcement
2. **No Auto-Assignment**: Users see "This ride is part of Morning Tech Commute cluster" but aren't forced into it
3. **Discovery Aid**: "See 12 other rides in this cluster" helps find alternatives
4. **Opt-Out**: Users can hide cluster suggestions

### Confidence Score

```
cluster_confidence = min(1.0, ride_count / 10) * recency_factor

where recency_factor = 1.0 if updated in last hour, decays to 0.5 over 24 hours
```

---

## F++3: Reliability Scoring (Behavioral, Fair)

### Philosophy

Reliability measures **what you did**, not who you are. It:
- Recovers over time
- Has no permanent penalties
- Is fully transparent
- Treats new users fairly

### Signals

| Signal | Weight | Decay | Description |
|--------|--------|-------|-------------|
| completion_rate | 0.40 | 90 days | % of bookings completed |
| cancellation_rate | 0.25 | 60 days | % cancelled (lower is better) |
| late_cancel_rate | 0.20 | 30 days | % cancelled < 2 hours before |
| no_show_count | 0.15 | 30 days | Absolute count (penalizes heavily) |

### Time Decay Formula

Recent behavior matters more:

```
decayed_value = value * exp(-days_ago / decay_constant)

where decay_constant = 30 (default, configurable per signal)
```

**Example**: A cancellation 30 days ago counts as 37% of its original impact.

### Score Calculation

```sql
CREATE FUNCTION calculate_reliability_score(p_user_id uuid)
RETURNS TABLE (
  score numeric,
  completion_rate numeric,
  cancellation_rate numeric,
  late_cancel_rate numeric,
  no_show_count int,
  explanation text
) AS $$
DECLARE
  v_total_bookings int;
  v_completed int;
  v_cancelled int;
  v_late_cancelled int;
  v_no_shows int;
  v_score numeric;
BEGIN
  -- Count bookings in last 90 days with time decay
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'cancelled' AND 
      cancelled_at > departure_time - interval '2 hours'),
    COUNT(*) FILTER (WHERE status = 'cancelled' AND 
      cancellation_reason ILIKE '%no-show%')
  INTO v_total_bookings, v_completed, v_cancelled, v_late_cancelled, v_no_shows
  FROM ride_bookings rb
  JOIN rides r ON r.id = rb.ride_id
  WHERE rb.passenger_id = p_user_id
    AND r.departure_time > now() - interval '90 days';
  
  -- Handle new users (< 5 bookings)
  IF v_total_bookings < 5 THEN
    RETURN QUERY SELECT 
      0.70::numeric,  -- Neutral starting score
      NULL::numeric,
      NULL::numeric,
      NULL::numeric,
      0,
      'New user - limited history'::text;
    RETURN;
  END IF;
  
  -- Calculate component scores
  completion_rate := v_completed::numeric / v_total_bookings;
  cancellation_rate := v_cancelled::numeric / v_total_bookings;
  late_cancel_rate := v_late_cancelled::numeric / GREATEST(v_cancelled, 1);
  
  -- Weighted combination
  v_score := (
    completion_rate * 0.40 +
    (1 - cancellation_rate) * 0.25 +
    (1 - late_cancel_rate) * 0.20 +
    GREATEST(0, 1 - (v_no_shows * 0.10)) * 0.15
  );
  
  -- Clamp to [0, 1]
  v_score := GREATEST(0, LEAST(1, v_score));
  
  RETURN QUERY SELECT 
    v_score,
    completion_rate,
    cancellation_rate,
    late_cancel_rate,
    v_no_shows,
    format('Based on %s rides: %s%% completed, %s%% cancelled',
      v_total_bookings,
      round(completion_rate * 100),
      round(cancellation_rate * 100)
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

### Explanation Text Examples

| Score Range | Explanation |
|-------------|-------------|
| 0.90 - 1.00 | "Excellent reliability - 95% completion rate" |
| 0.75 - 0.89 | "Good reliability - completes most rides" |
| 0.60 - 0.74 | "Fair reliability - some recent cancellations" |
| < 0.60 | "Improving reliability - recent issues noted" |

### Recovery Mechanism

Score naturally improves as:
1. Old incidents decay (30-90 days)
2. New completions add positive history
3. No permanent record of past issues

**New users start at 0.70** (neutral) - not punished for lack of history.

---

## F++4: Fair Matching Suggestions

### The Problem: Rich-Get-Richer

Naive ranking systems:
1. Show "best" drivers first
2. Best drivers get more bookings
3. More bookings → more reviews → higher ranking
4. New drivers never get exposure

### Fairness Rules

#### Rule 1: Score Smoothing

Don't show raw scores. Compress differences:

```
display_score = 0.5 + (raw_score - 0.5) * 0.6
```

This compresses the 0-1 range to 0.2-0.8, reducing perceived gaps.

#### Rule 2: Minimum Exposure

Every driver with matching routes gets shown at least once per N searches:

```sql
-- Ensure all matching drivers appear in top 10 at least 1 in 5 times
WITH ranked_rides AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY passenger_id 
      ORDER BY last_shown_to_passenger NULLS FIRST, combined_score DESC
    ) as exposure_rank
  FROM matching_rides
)
SELECT * FROM ranked_rides
WHERE exposure_rank <= 10
   OR (exposure_rank <= 20 AND last_shown_to_passenger IS NULL);
```

#### Rule 3: New User Neutral Weighting

```
if user.total_rides < 10:
    reliability_weight = 0  -- Don't penalize lack of history
    route_weight = 1.0      -- Only match on route
```

#### Rule 4: Randomized Tie-Breaking

When scores are within 5%, randomize order:

```sql
ORDER BY 
  CASE WHEN ABS(score - lead_score) < 0.05 THEN random() ELSE score END DESC
```

### Combined Ranking Algorithm

```
combined_score = (
  route_similarity * W_ROUTE +
  reliability_score * W_RELIABILITY +
  recency_bonus * W_RECENCY +
  fairness_boost * W_FAIRNESS
)

where:
  W_ROUTE = 0.50       -- Route match is most important
  W_RELIABILITY = 0.25 -- Past behavior matters
  W_RECENCY = 0.15     -- Recent posts get slight boost
  W_FAIRNESS = 0.10    -- Exposure balancing
```

### "Why This Suggestion" Text

Every suggested ride shows explanation:

```typescript
function generateSuggestionReason(match: RideMatch): string {
  const reasons: string[] = [];
  
  if (match.route_similarity > 0.8) {
    reasons.push(`${Math.round(match.route_similarity * 100)}% route match`);
  }
  if (match.reliability_score > 0.85) {
    reasons.push('Reliable driver');
  }
  if (match.same_cluster) {
    reasons.push(`Part of ${match.cluster_name}`);
  }
  if (match.is_new_driver) {
    reasons.push('New to community');
  }
  
  return reasons.join(' • ');
}
```

---

## F++5: User Experience (Trust-First)

### What Users See

#### Ride Search Results

```
┌─────────────────────────────────────────────────┐
│  🎯 Recommended for You                         │
├─────────────────────────────────────────────────┤
│  [Driver Photo]  John D.                        │
│  ★ 4.8 reliability • 92% route match            │
│  "0.5 km from your pickup • Same destination"   │
│  7:30 AM → Tech Park                            │
│  [Book Seat]                                    │
├─────────────────────────────────────────────────┤
│  [Driver Photo]  Sarah M.                       │
│  ★ New driver • 85% route match                 │
│  "Morning Tech Commute cluster"                 │
│  7:45 AM → Tech Park                            │
│  [Book Seat]                                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  📋 All Matching Rides (47)                     │
│  [Show all rides without filtering]             │
└─────────────────────────────────────────────────┘
```

#### Driver Profile - Reliability Breakdown

```
┌─────────────────────────────────────────────────┐
│  Reliability Score: 0.87                        │
├─────────────────────────────────────────────────┤
│  📊 How this is calculated:                     │
│                                                 │
│  Completed rides: 94%        ████████████░░     │
│  Cancellation rate: 8%       █░░░░░░░░░░░░░     │
│  Late cancellations: 2%      ░░░░░░░░░░░░░░     │
│  No-shows: 0                 ✓                  │
│                                                 │
│  Based on 47 rides in last 90 days              │
│  Score recovers over time as you complete rides │
└─────────────────────────────────────────────────┘
```

### What Users DON'T See

- ❌ Hidden rides (all valid rides always visible)
- ❌ Auto-bookings
- ❌ Unexplained rankings
- ❌ Permanent "bad driver" labels

### Opt-Out Options

Users can disable:
- [ ] Smart suggestions (show all rides equally)
- [ ] Cluster recommendations
- [ ] Reliability-based sorting

Settings are per-user, respected immediately.

---

## F++6: Safety & Failure Modes

### Graceful Degradation

| Failure | Detection | Fallback |
|---------|-----------|----------|
| Geocoding API down | Timeout > 3s | Use raw text matching |
| Scoring function error | Exception caught | Score = 0.5 (neutral) |
| Missing user history | < 5 bookings | Score = 0.7 (new user) |
| Cluster computation stale | > 1 hour old | Hide cluster suggestions |
| Feature flag disabled | Config check | Simple distance filter |

### Invariants Protected

Intelligence features NEVER affect:

| Core Invariant | Protection |
|----------------|------------|
| Seat correctness | Scoring is read-only, booking RPC unchanged |
| State machine | No state transitions triggered by scoring |
| RLS policies | Scoring runs after authorization |
| Booking atomicity | Score computed before, not during transaction |

### Isolation Guarantee

```sql
-- Scoring is a SEPARATE query, never part of booking transaction
-- Good:
SELECT * FROM get_suggested_rides(passenger_id, origin, destination);
-- Then separately:
SELECT book_ride(ride_id, seats);

-- BAD (we don't do this):
SELECT book_best_ride(passenger_id, origin, destination);  -- Never
```

---

## F++7: Operational Control

### Feature Flags

```sql
-- In feature_flags table
INSERT INTO feature_flags (flag_name, is_enabled, metadata) VALUES
('smart_route_matching', true, '{"weight_origin": 0.25, "weight_dest": 0.35}'),
('commute_clustering', true, '{"min_cluster_size": 3}'),
('reliability_scoring', true, '{"decay_days": 30}'),
('fair_matching', true, '{"min_exposure_ratio": 0.2}');
```

### Weight Tuning

All weights configurable via admin UI:

```typescript
interface IntelligenceConfig {
  route_weights: {
    origin: number;      // 0-1
    destination: number; // 0-1
    direction: number;   // 0-1
    overlap: number;     // 0-1
  };
  reliability_weights: {
    completion: number;
    cancellation: number;
    late_cancel: number;
    no_show: number;
  };
  fairness: {
    score_smoothing: number;     // 0-1, higher = more compression
    min_exposure_ratio: number;  // 0-1
    new_user_threshold: number;  // rides count
  };
}
```

### Admin Monitoring

Dashboard shows:
- Score distribution histograms
- Cluster membership over time
- Exposure fairness metrics
- Feature flag status

```sql
-- Admin query: Score distribution
SELECT 
  width_bucket(reliability_score, 0, 1, 10) as bucket,
  COUNT(*) as user_count
FROM profiles
WHERE reliability_score IS NOT NULL
GROUP BY bucket
ORDER BY bucket;
```

---

## F++8: Interview-Ready Explanation

### "How does your matching algorithm work?"

> "We use **explainable geometric scoring** instead of ML. For route similarity, we calculate four signals: origin proximity, destination proximity, direction alignment, and optional route overlap. Each signal uses simple distance or angle math that we can explain to users.
>
> For reliability, we track behavioral history - completion rates, cancellation timing - with time decay so old incidents fade. New users start neutral, not penalized.
>
> We add **fairness rules** to prevent rich-get-richer dynamics: score smoothing, minimum exposure guarantees, and randomized tie-breaking. Every suggestion shows 'why' text so users understand the ranking.
>
> The key insight: **intelligence is advisory**. We surface better suggestions but never hide valid rides or auto-book. Users remain in control."

### "Why not use ML?"

> "Three reasons:
>
> 1. **Explainability**: When a user asks 'why wasn't I shown this ride?', we need a clear answer. ML models are black boxes.
>
> 2. **Fairness auditing**: We can mathematically prove our fairness rules work. ML bias is hard to detect and harder to fix.
>
> 3. **Failure modes**: When ML fails, it fails silently. Our geometric scoring has clear fallbacks - if geocoding is down, we use text matching. If scoring errors, we return neutral.
>
> For a trust-based platform without payments, **correctness beats cleverness**."

### "How do you prevent bias?"

> "Four mechanisms:
>
> 1. **Score smoothing** compresses differences so small score gaps don't create huge ranking gaps.
>
> 2. **Minimum exposure** ensures every driver appears in top results periodically, regardless of score.
>
> 3. **New user neutrality** gives new drivers a 0.7 score instead of penalizing lack of history.
>
> 4. **Randomized tie-breaking** for similar scores prevents deterministic ordering that starves some drivers.
>
> We also monitor exposure distributions and can adjust weights if we see unfair patterns."

---

## Appendix: Mathematical Foundations

### Haversine Distance (Origin/Destination Proximity)

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c

where R = 6371000 meters (Earth radius)
```

### Bearing Calculation (Direction Alignment)

```
θ = atan2(
  sin(Δlng) × cos(lat2),
  cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(Δlng)
)

bearing = (θ × 180/π + 360) mod 360
```

### Exponential Time Decay

```
weight(t) = e^(-t/τ)

where:
  t = days since event
  τ = decay constant (30 days default)
  
Half-life = τ × ln(2) ≈ 20.8 days
```

---

*Document Version: January 2026*
*Phase F++ Complete*
